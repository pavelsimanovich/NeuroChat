package com.ps.ollamaai.controller;

import com.ps.ollamaai.service.OllamaService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
@RequestMapping("/api/direct")
public class ChatAIDirectController {

    private final OllamaService aiService;

    @GetMapping("/chat")
    public String ask(final @RequestParam String message) {
        return aiService.callOllamaChat(message);
    }
}
