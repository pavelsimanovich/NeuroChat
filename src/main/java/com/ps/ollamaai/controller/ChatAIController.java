package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.FileData;
import com.ps.ollamaai.dto.ChunkResponseDTO;
import com.ps.ollamaai.dto.UserPreferencesDTO;
import com.ps.ollamaai.exceptions.LimitExceededException;
import com.ps.ollamaai.service.ChatMessageService;
import com.ps.ollamaai.service.ChatRoomService;
import com.ps.ollamaai.service.FileStorageService;
import com.ps.ollamaai.service.ReactiveService;
import com.ps.ollamaai.service.UserPreferencesService;
import com.ps.ollamaai.service.TokenQuotaService;
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

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;

import static com.ps.ollamaai.dto.enums.ErrorType.LIMIT_EXCEEDED;
import static com.ps.ollamaai.dto.enums.ErrorType.SERVER_ERROR;
import static com.ps.ollamaai.llm.Prompts.CURRENT_PROMPT_INSTRUCTIONS;
import static com.ps.ollamaai.llm.Prompts.PROMPT_GENERAL_INSTRUCTIONS;

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
                            String systemPrompt = StringUtils.hasText(prefs.getSystemPrompt())
                                    ? prefs.getSystemPrompt()
                                    : PROMPT_GENERAL_INSTRUCTIONS;
                            String preferredModel = prefs.getPreferredModel();

                            // Check quota before sending (include expected assistant answer)
                            try {
                                int estimate = TokenQuotaService.estimateTokensForTurn(systemPrompt, question, null);
                                tokenQuotaService.checkAndReserveTokens(username, estimate);
                            } catch (LimitExceededException ex) {
                                return Mono.just(new ChunkResponseDTO(ex.getMessage(), true, LIMIT_EXCEEDED.name())).flux();
                            }

                            List<Message> messages = buildMessages(question, fileData, currentHistory, systemPrompt);
                            Prompt prompt = new Prompt(messages);

                            var spec = chatClient
                                    .prompt(prompt)
                                    .advisors(advisor -> advisor.param(ChatMemory.CONVERSATION_ID, chatId));

                            if (StringUtils.hasText(preferredModel)) {
                                var options = OllamaOptions.builder()
                                        .model(preferredModel)
                                        .build();
                                spec = spec.options(options);
                            }

                            return spec
                                    .stream()
                                    .content()
                                    .map(chunk -> new ChunkResponseDTO(chunk, false, null))
                                    .doOnNext(chunk -> chatMessageService.saveChunk(chatId, chunk.content()))
                                    .doOnComplete(() -> {
                                        String response = chatMessageService.saveAiResponse(chatId);
                                        // Extend in-memory history for next turn
                                        currentHistory.add(new UserMessage(question));
                                        currentHistory.add(new AssistantMessage(response));
                                        // Add usage (approx): system + question + response
                                        int used = TokenQuotaService.estimateTokensForMessages(systemPrompt, question)
                                                + tokenQuotaService.estimateTokensForText(response);
                                        tokenQuotaService.addUsage(username, used);
                                    })
                                    .concatWith(Mono.just(new ChunkResponseDTO("[DONE]", true, null)));
                        }))
                .publishOn(Schedulers.boundedElastic())
                .onErrorResume(LimitExceededException.class, e -> Mono.<Void>fromCallable(() -> {
                            chatRoomService.setInactive(chatId);
                            return null;
                        })
                        .subscribeOn(Schedulers.boundedElastic())
                        .thenReturn(new ChunkResponseDTO(e.getMessage(), true, LIMIT_EXCEEDED.name()))
                        .flux())
                .onErrorResume(e -> {
                    log.error("Error processing chat message", e);
                    return Mono.just(new ChunkResponseDTO(e.getLocalizedMessage(), true, SERVER_ERROR.name()));
                });
    }

    private Mono<UserPreferencesDTO> loadUserPreferences(String username) {
        return Mono.fromCallable(() -> userPreferencesService.getUserPreferencesOrDefault(username))
                .subscribeOn(Schedulers.boundedElastic());
    }

    private FileData getFileData(String fileId) {
        return StringUtils.hasText(fileId) ? fileStorageService.getFile(fileId) : null;
    }

    private List<Message> buildMessages(String question, FileData fileData, List<Message> currentHistory, String systemPrompt) {
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
