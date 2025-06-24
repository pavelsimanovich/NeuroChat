package com.ps.ollamaai.controller;

import com.ps.ollamaai.dto.ChunkResponseDTO;
import com.ps.ollamaai.service.OllamaService;
import lombok.AllArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@AllArgsConstructor
@RequestMapping("/api/direct")
public class ChatAIDirectController {

    private final OllamaService aiService;

    private final ChatClient chatClient;

    @GetMapping("/chat")
    public String ask(final @RequestParam String message) {
        return aiService.callOllamaChat(message);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ChunkResponseDTO> streamChat(@RequestParam String question, @RequestParam String chatId) {
        return chatClient
                .prompt()
                .user(question)
                .advisors(advisor -> advisor
                        .param(ChatMemory.CONVERSATION_ID, chatId))
                .stream()
                .content()
                .map(ChunkResponseDTO::new);
    }
}
