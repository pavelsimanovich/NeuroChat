package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.FileData;
import com.ps.ollamaai.domain.UserPreferencies;
import com.ps.ollamaai.dto.ChunkResponseDTO;
import com.ps.ollamaai.exceptions.GeneralFluxException;
import com.ps.ollamaai.exceptions.LimitExceededException;
import com.ps.ollamaai.service.ChatMessageService;
import com.ps.ollamaai.service.ChatRoomService;
import com.ps.ollamaai.service.FileStorageService;
import com.ps.ollamaai.service.ReactiveService;
import com.ps.ollamaai.service.UserPreferencesService;
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

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ChunkResponseDTO> streamChat(
            @RequestParam String question,
            @RequestParam String chatId,
            @RequestParam(required = false) String fileId,
            Principal principal) {

        FileData fileData = getFileData(fileId);

        return reactiveService.processChatMessageReactive(question, chatId, principal.getName(), fileData)
                .flatMapMany(currentHistory -> {
                    try {
                        List<Message> messages = getMessages(question, fileData, currentHistory, principal.getName());

                        Prompt prompt = new Prompt(messages);

                        // Apply user selected model if present
                        String preferredModel = userPreferencesService.findByUserId(principal.getName())
                                .map(UserPreferencies::getModel)
                                .filter(org.springframework.util.StringUtils::hasText)
                                .orElse(null);

                        var spec = chatClient
                                .prompt(prompt)
                                .advisors(advisor -> advisor.param(ChatMemory.CONVERSATION_ID, chatId));

                        if (preferredModel != null) {
                            var options = org.springframework.ai.ollama.api.OllamaOptions.builder()
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
                                    // Обновляем currentHistory
                                    currentHistory.add(new UserMessage(question));
                                    currentHistory.add(new AssistantMessage(response));
                                })
                                .concatWith(Mono.just(new ChunkResponseDTO("[DONE]", true, null)));
                    } catch (Exception e) {
                        throw new GeneralFluxException("Error building prompt: " + e.getMessage(), e);
                    }
                })
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

    private FileData getFileData(String fileId) {
        FileData fileData;
        if (StringUtils.hasText(fileId)) {
            fileData = fileStorageService.getFile(fileId);
        } else {
            fileData = null;
        }
        return fileData;
    }

    private List<Message> getMessages(String question, FileData fileData, List<Message> currentHistory, String userId) {
        List<Message> messages = new ArrayList<>(currentHistory);
        messages.add(new SystemMessage(userPreferencesService.getUserSystemPrompt(userId)));

        UserMessage userMessage;
        if (fileData != null) {
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
            userMessage = UserMessage.builder()
                    .text(CURRENT_PROMPT_INSTRUCTIONS + question)
                    .media(List.of(imageMedia))
                    .build();
        } else {
            userMessage = new UserMessage(CURRENT_PROMPT_INSTRUCTIONS + question);
        }
        messages.add(userMessage);
        return messages;
    }
}
