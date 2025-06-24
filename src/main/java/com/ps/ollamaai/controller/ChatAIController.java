package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.dto.ChunkResponseDTO;
import com.ps.ollamaai.exceptions.LimitExceededException;
import com.ps.ollamaai.llm.history.HistoryEntry;
import com.ps.ollamaai.service.ChatMessageService;
import com.ps.ollamaai.service.HistoryEntryService;
import com.ps.ollamaai.service.OllamaService;
import com.ps.ollamaai.service.UserService;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.http.MediaType;
import org.springframework.util.CollectionUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.security.Principal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.ps.ollamaai.constants.Messages.LIMIT_EXCEEDED_MESSAGE;
import static com.ps.ollamaai.llm.Prompts.CURRENT_PROMPT_INSTRUCTIONS;

@RestController
@AllArgsConstructor
@RequestMapping("/api/direct")
public class ChatAIController {

    private final OllamaService aiService;
    private final ChatClient chatClient;
    private final UserService userService;
    private final ChatMessageService chankMessageService;
    private final HistoryEntryService historyEntryService;

    private final Map<String, List<HistoryEntry>> conversationalHistory = new LinkedHashMap<>();

//    @Value("${app.chat-limit}")
//    private int maxHistoryChatLength;

    @GetMapping("/chat")
    public String ask(final @RequestParam String message) {
        return aiService.callOllamaChat(message);
    }

    //todo refacroring
    @Transactional
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ChunkResponseDTO> streamChat(@RequestParam String question, @RequestParam String chatId,
                                             Principal principal) {
        User user = userService.findByEmail(principal.getName());
        chankMessageService.saveUserMessage(chatId, user.getId(), question);

        List<Message> chatHistory = new ArrayList<>();
        if (CollectionUtils.isEmpty(conversationalHistory.get(chatId))) {
            List<HistoryEntry> history = historyEntryService.getRoomHistory(chatId);
            for (HistoryEntry msg : history) {
                chatHistory.add(new UserMessage(msg.getPrompt()));
                chatHistory.add(new AssistantMessage(msg.getResponse()));
            }
        }

        final List<HistoryEntry> currentHistory = conversationalHistory.computeIfAbsent(chatId, k -> new ArrayList<>());
        if (currentHistory.size() >= 100 + 1) {
            deleteRoomHistory(chatId);
            throw new LimitExceededException(LIMIT_EXCEEDED_MESSAGE);
        }

        chatHistory.add(new UserMessage(CURRENT_PROMPT_INSTRUCTIONS.concat(question)));

        return chatClient
                .prompt(new Prompt(chatHistory))
                .user(question)
                .advisors(advisor -> advisor
                        .param(ChatMemory.CONVERSATION_ID, chatId))
                .stream()
                .content()
                .map(ChunkResponseDTO::new)
                .doOnNext(chunk -> chankMessageService.saveChunk(chatId, user.getId(), chunk.value()))
                .doOnComplete(() -> chankMessageService.saveAiResponse(chatId, user.getId()));

        //todo EXCEPTIONS  LIMITS
    }

    public void deleteRoomHistory(final String roomId) {
        conversationalHistory.remove(roomId);
    }
}
