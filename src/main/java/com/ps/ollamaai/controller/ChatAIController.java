package com.ps.ollamaai.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ps.ollamaai.dto.ChunkResponseDTO;
import com.ps.ollamaai.exceptions.LimitExceededException;
import com.ps.ollamaai.service.ChatMessageService;
import com.ps.ollamaai.service.ChatRoomService;
import com.ps.ollamaai.service.ReactiveService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.tomcat.util.http.fileupload.FileUtils;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.content.Media;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.util.MimeTypeUtils;
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

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    @PostMapping("/upload")
    public String handleFileUpload(@RequestParam("file") MultipartFile file) {
        try {
            // Create upload directory if it doesn't exist
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String newFilename = UUID.randomUUID() + fileExtension;
            
            // Save file
            Path filePath = uploadPath.resolve(newFilename);
            Files.copy(file.getInputStream(), filePath);
            
            return   newFilename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file", e);
        }
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ChunkResponseDTO> streamChat(
            @RequestParam String question,
            @RequestParam String chatId,
            @RequestParam(required = false) String fileUrls,
            Principal principal) {
        
        List<String> fileUrlList = new ArrayList<>();
        if (fileUrls != null && !fileUrls.isEmpty()) {
            try {
                fileUrlList = new ObjectMapper().readValue(fileUrls, new TypeReference<>() {});
            } catch (JsonProcessingException e) {
                log.error("Error parsing fileUrls: " + fileUrls, e);
            }
        }

        UserMessage um;
        if (!fileUrlList.isEmpty()) {
            Media media = null;
            try {
                media = Media.builder()
                            .id(fileUrlList.get(0))
                            .mimeType(MimeTypeUtils.IMAGE_PNG)
                            .data(ResourceUtils.getURL("upload/" + fileUrlList.get(0)).toURI())
                            .build();
            } catch (URISyntaxException | FileNotFoundException e) {
                throw new RuntimeException(e);
            }
            um = UserMessage.builder()
                    .text(CURRENT_PROMPT_INSTRUCTIONS + question)
                    .media(media)
                    .build();
        } else {
            um = UserMessage.builder().text(CURRENT_PROMPT_INSTRUCTIONS + question).build();
        }

        List<String> finalFileUrlList = fileUrlList;
        return reactiveService.processChatMessageReactive(question, chatId, principal.getName())
                .flatMapMany(currentHistory -> chatClient
//                        .prompt(new Prompt(um))
                        .prompt(new Prompt(currentHistory.toString()))
                        .messages(um)
//                        .user(CURRENT_PROMPT_INSTRUCTIONS + question +
//                              (finalFileUrlList.isEmpty() ? "" : "\nПрикрепленные файлы: " + String.join(", ", finalFileUrlList)))
                        .advisors(advisor -> advisor.param(ChatMemory.CONVERSATION_ID, chatId))
                        .stream()
                        .content()
                        .map(chunk -> new ChunkResponseDTO(chunk, false, null))
                        .doOnNext(chunk -> chatMessageService.saveChunk(chatId, chunk.content()))
                        .doOnComplete(() -> {
                            String response = chatMessageService.saveAiResponse(chatId);
                            currentHistory.add(new UserMessage(CURRENT_PROMPT_INSTRUCTIONS.concat(question)));
                            currentHistory.add(new AssistantMessage(response));
                            deleteFiles(finalFileUrlList);

                        })
                        .concatWith(Mono.just(new ChunkResponseDTO("[END]", true, null)))
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
                    deleteFiles(finalFileUrlList);
                    return Flux.empty();
                });
    }

    private static void deleteFiles(List<String> finalFileUrlList) {
        finalFileUrlList.forEach(url -> {
            try {
                FileUtils.deleteDirectory(new File(url));
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });
    }
}
