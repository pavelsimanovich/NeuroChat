package com.ps.ollamaai.controller;

import com.ps.ollamaai.dto.ChunkResponseDTO;
import com.ps.ollamaai.service.ChatMessageService;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.security.Principal;
import java.util.List;

import static com.ps.ollamaai.llm.Prompts.CURRENT_PROMPT_INSTRUCTIONS;

@RestController
@AllArgsConstructor
@RequestMapping("/api/direct")
public class ChatAIController {

    private final ChatClient chatClient;
    private final ChatMessageService chatMessageService;

    @Transactional
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ChunkResponseDTO> streamChat(@RequestParam String question, @RequestParam String chatId, //dto
                                             Principal principal) {
        final List<Message> currentHistory = chatMessageService.processChatMessage(question, chatId, principal.getName());

        return chatClient
                .prompt(new Prompt(currentHistory))
                .user(CURRENT_PROMPT_INSTRUCTIONS.concat(question))
                .advisors(advisor -> advisor
                        .param(ChatMemory.CONVERSATION_ID, chatId))
                .stream()
                .content()
                .map(ChunkResponseDTO::new)
                .doOnNext(chunk -> chatMessageService.saveChunk(chatId, chunk.value()))
                .doOnComplete(() -> {
                    String response = chatMessageService.saveAiResponse(chatId);
                    currentHistory.add(new UserMessage(CURRENT_PROMPT_INSTRUCTIONS.concat(question)));
                    currentHistory.add(new AssistantMessage(response));
                });
    }
}
