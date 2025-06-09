package com.ps.ollamaai.controller;

import com.ps.ollamaai.llm.ChatWithHistoryService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
@RequestMapping("/chat")
public class ChatAIController {

    private final ChatWithHistoryService chatClient;

    @GetMapping("/ask")
    public String ask(@RequestParam String message, @RequestParam String chatId) {
        return chatClient.call(message, chatId);
    }
}
