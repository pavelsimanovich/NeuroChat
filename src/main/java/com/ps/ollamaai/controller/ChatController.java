package com.ps.ollamaai.controller;

import lombok.AllArgsConstructor;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
public class ChatController {

    private final OllamaChatModel chatClient;

    @GetMapping("/ask")
    public String ask(@RequestParam String message) {
        return chatClient.call(message);
    }
}
