package com.ps.ollamaai.controller;

import com.ps.ollamaai.dto.ChunkResponseDTO;
import com.ps.ollamaai.exceptions.LimitExceededException;
import com.ps.ollamaai.service.ChatMessageService;
import com.ps.ollamaai.service.ChatRoomService;
import com.ps.ollamaai.service.FileService;
import com.ps.ollamaai.service.ReactiveService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.http.MediaType;
import org.springframework.util.ResourceUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.FileNotFoundException;
import java.security.Principal;

import static com.ps.ollamaai.dto.enums.ErrorType.LIMIT_EXCEEDED;
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
    private final FileService fileService;

    @PostMapping("/upload")
    public String handleFileUpload(@RequestParam("file") MultipartFile file) {
       return fileService.uploadFile(file);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ChunkResponseDTO> streamChat(
            @RequestParam String question,
            @RequestParam String chatId,
            @RequestParam(required = false) String fileUrl,
            Principal principal) {

        return reactiveService.processChatMessageReactive(question, chatId, principal.getName())
                .flatMapMany(currentHistory -> {
                            try {
                                return chatClient
                                        .prompt(new Prompt(currentHistory.toString()))
                                        .user(CURRENT_PROMPT_INSTRUCTIONS + question +
                                              (fileUrl == null ? "" : "\nПрикрепленные файлы: " + ResourceUtils.getURL("upload/" + fileUrl).getFile()))
                                        .advisors(advisor -> advisor.param(ChatMemory.CONVERSATION_ID, chatId))
                                        .stream()
                                        .content()
                                        .map(chunk -> new ChunkResponseDTO(chunk, false, null))
                                        .doOnNext(chunk -> chatMessageService.saveChunk(chatId, chunk.content()))
                                        .doOnComplete(() -> {
                                            String response = chatMessageService.saveAiResponse(chatId);
                                            currentHistory.add(new UserMessage(CURRENT_PROMPT_INSTRUCTIONS.concat(question)));
                                            currentHistory.add(new AssistantMessage(response));
                                            fileService.deleteFile(fileUrl);
                                        })
                                        .concatWith(Mono.just(new ChunkResponseDTO("[END]", true, null)));
                            } catch (FileNotFoundException e) {
                                throw new RuntimeException(e);
                            }
                        }
                )
                .publishOn(Schedulers.boundedElastic())
                .onErrorResume(LimitExceededException.class, e -> Mono.<Void>fromCallable(() -> {
                            chatRoomService.setInactive(chatId);
                            return null;
                        })
                        .subscribeOn(Schedulers.boundedElastic())
                        .thenReturn(new ChunkResponseDTO(e.getMessage(), true, LIMIT_EXCEEDED.name()
                        ))
                        .flux())
                .onErrorResume(e -> {
                    fileService.deleteFile(fileUrl);
                    log.error("Error processing chat message", e);
                    return Flux.empty();
                });
    }
}
