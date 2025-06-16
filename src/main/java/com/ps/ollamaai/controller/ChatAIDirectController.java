package com.ps.ollamaai.controller;

import lombok.AllArgsConstructor;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
@RequestMapping("/direct")
public class ChatAIDirectController {

    private final OllamaChatModel ollamaChatModel;

    @GetMapping("/chat/ask")
    public String ask(@RequestParam String message) {
        return ollamaChatModel.call(message);
    }
}
