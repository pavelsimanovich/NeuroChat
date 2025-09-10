package com.ps.neurochat.controller;

import com.ps.neurochat.domain.FileData;
import com.ps.neurochat.dto.ChunkResponseDTO;
import com.ps.neurochat.dto.UserPreferencesDTO;
import com.ps.neurochat.exceptions.LimitExceededException;
import com.ps.neurochat.service.ChatMessageService;
import com.ps.neurochat.service.ChatRoomService;
import com.ps.neurochat.service.FileStorageService;
import com.ps.neurochat.service.ReactiveService;
import com.ps.neurochat.service.UserPreferencesService;
import com.ps.neurochat.service.TokenQuotaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.content.Media;
import org.springframework.ai.ollama.api.OllamaOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.util.MimeType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;

import static com.ps.neurochat.dto.enums.ErrorType.LIMIT_EXCEEDED;
import static com.ps.neurochat.dto.enums.ErrorType.SERVER_ERROR;
import static com.ps.neurochat.llm.Prompts.CURRENT_PROMPT_INSTRUCTIONS;
import static com.ps.neurochat.llm.Prompts.PROMPT_GENERAL_INSTRUCTIONS;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/direct")
public class ChatAIController {

    private final ChatClient chatClient;
    private final ChatMessageService chatMessageService;
    private final ChatRoomService chatRoomService;
    private final ReactiveService reactiveService;
    private final FileStorageService fileStorageService;
    private final UserPreferencesService userPreferencesService;
    private final TokenQuotaService tokenQuotaService;
    private final MessageSource messageSource;

    @Value("${app.use-token-limits}")
    private boolean useTokenLimits;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ChunkResponseDTO> streamChat(
            @RequestParam String question,
            @RequestParam String chatId,
            @RequestParam(required = false) String fileId,
            Principal principal) {

        FileData fileData = getFileData(fileId);
        String username = principal.getName();

        return reactiveService.processChatMessageReactive(question, chatId, username, fileData)
                .flatMapMany(currentHistory -> loadUserPreferences(username)
                        .flatMapMany(prefs -> {
                            String systemPrompt = resolveSystemPrompt(prefs);
                            String preferredModel = prefs.getPreferredModel();

                            if (useTokenLimits) {
                                Flux<ChunkResponseDTO> ex = estimate(question, username);
                                if (ex != null) return ex;
                            }

                            List<Message> messages = buildMessages(question, fileData, currentHistory, systemPrompt);
                            Prompt prompt = new Prompt(messages);

                            var spec = buildRequestSpec(prompt, chatId, preferredModel);

                            return spec
                                    .stream()
                                    .content()
                                    .map(chunk -> new ChunkResponseDTO(chunk, false, null))
                                    .doOnNext(chunk ->
                                            chatMessageService.saveChunk(chatId, chunk.content()))
                                    .doOnComplete(() -> onCompletionUpdate(username, chatId, question, currentHistory))
                                    .concatWith(Mono.just(
                                            new ChunkResponseDTO("[DONE]", true, null)));
                        }))
                .publishOn(Schedulers.boundedElastic())
                .onErrorResume(LimitExceededException.class, e -> Mono.<Void>fromCallable(() -> {
                            chatRoomService.setInactive(chatId);
                            return null;
                        })
                        .subscribeOn(Schedulers.boundedElastic())
                        .thenReturn(new ChunkResponseDTO(
                                messageSource.getMessage("error.limit.exceeded",
                                        new Object[]{e.getMessage()}, LocaleContextHolder.getLocale()),
                                true,
                                LIMIT_EXCEEDED.name()))
                        .flux())
                .onErrorResume(e -> {
                    log.error("Error processing chat message", e);
                    String msg = messageSource.getMessage("error.server",
                            null, LocaleContextHolder.getLocale());
                    return Mono.just(new ChunkResponseDTO(msg, true, SERVER_ERROR.name()));
                });
    }

    private Flux<ChunkResponseDTO> estimate(String question, String username) {
        // Quota pre-check (includes expected assistant answer by heuristic)
        try {
            estimateAndCheckQuota(username, question);
        } catch (LimitExceededException ex) {
            String msg = messageSource.getMessage("error.limit.exceeded",
                    new Object[]{ex.getMessage()}, LocaleContextHolder.getLocale());
            return Mono.just(new ChunkResponseDTO(msg, true, LIMIT_EXCEEDED.name())).flux();
        }
        return null;
    }

    private String resolveSystemPrompt(UserPreferencesDTO prefs) {
        return StringUtils.hasText(prefs.getSystemPrompt())
                ? prefs.getSystemPrompt()
                : PROMPT_GENERAL_INSTRUCTIONS;
    }

    private void estimateAndCheckQuota(String username, String question) {
        int estimate = TokenQuotaService.estimateTokensForTurn(question, null);
        tokenQuotaService.checkAndReserveTokens(username, estimate);
    }

    private ChatClient.ChatClientRequestSpec buildRequestSpec(Prompt prompt, String chatId, String preferredModel) {
        var spec = chatClient
                .prompt(prompt)
                .advisors(advisor -> advisor.param(ChatMemory.CONVERSATION_ID, chatId));

        if (StringUtils.hasText(preferredModel)) {
            var options = OllamaOptions.builder()
                    .model(preferredModel)
                    .build();
            spec = spec.options(options);
        }
        return spec;
    }

    private void onCompletionUpdate(String username,
                                    String chatId,
                                    String question,
                                    List<Message> currentHistory) {
        String response = chatMessageService.saveAiResponse(chatId);
        // Extend in-memory history for next turn
        currentHistory.add(new UserMessage(question));
        currentHistory.add(new AssistantMessage(response));
        // Add usage (approx): system + question + response
        int used = TokenQuotaService.estimateTokensForMessages(question)
                + tokenQuotaService.estimateTokensForText(response);
        tokenQuotaService.addUsage(username, used);
    }

    private Mono<UserPreferencesDTO> loadUserPreferences(String username) {
        return Mono.fromCallable(() -> userPreferencesService.getUserPreferencesOrDefault(username))
                .subscribeOn(Schedulers.boundedElastic());
    }

    private FileData getFileData(String fileId) {
        return StringUtils.hasText(fileId) ? fileStorageService.getFile(fileId) : null;
    }

    private List<Message> buildMessages(String question, FileData fileData, List<Message> currentHistory,
                                        String systemPrompt) {
        List<Message> messages = new ArrayList<>(currentHistory);
        messages.add(new SystemMessage(systemPrompt));
        messages.add(buildUserMessage(question, fileData));
        return messages;
    }

    private UserMessage buildUserMessage(String question, FileData fileData) {
        if (fileData == null) {
            return new UserMessage(CURRENT_PROMPT_INSTRUCTIONS + question);
        }

        final FileData finalFileData = fileData;
        ByteArrayResource resource = new ByteArrayResource(fileData.getData()) {
            @Override
            public String getFilename() {
                return finalFileData.getFileName();
            }
        };

        Media imageMedia = Media.builder()
                .data(resource)
                .mimeType(MimeType.valueOf(finalFileData.getContentType()))
                .build();

        return UserMessage.builder()
                .text(CURRENT_PROMPT_INSTRUCTIONS + question)
                .media(List.of(imageMedia))
                .build();
    }
}