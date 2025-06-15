package com.ps.ollamaai.llm;

import com.ps.ollamaai.exceptions.LimitExceededException;
import com.ps.ollamaai.llm.history.HistoryEntry;
import com.ps.ollamaai.service.HistoryEntryService;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static com.ps.ollamaai.constants.Messages.LIMIT_EXCEEDED_MESSAGE;
import static com.ps.ollamaai.llm.Prompts.CURRENT_PROMPT_INSTRUCTIONS;
import static com.ps.ollamaai.llm.Prompts.PROMPT_CONVERSATION_HISTORY_INSTRUCTIONS;
import static com.ps.ollamaai.llm.Prompts.PROMPT_GENERAL_INSTRUCTIONS;

@Component
@RequiredArgsConstructor(onConstructor_ = {@Autowired})
public class ChatWithHistoryService {

    @Value("${app.chat-limit}")
    private int maxHistoryChatLength;

    private final OllamaChatModel ollamaChatModel;
    private final HistoryEntryService historyEntryService;

    private final Map<String, List<HistoryEntry>> conversationalHistoryStorage = new HashMap<>();

    public String call(String userMessage, String roomId) {

        if (Objects.isNull(conversationalHistoryStorage.get(roomId))) {
            List<HistoryEntry> roomMessages = historyEntryService.getRoomHistory(roomId);
            if (!roomMessages.isEmpty()) {
                conversationalHistoryStorage.put(roomId, roomMessages);
            }
        }

        var currentHistory = conversationalHistoryStorage.computeIfAbsent(roomId, k -> new ArrayList<>());
        if (currentHistory.size() >= maxHistoryChatLength + 1) {
            conversationalHistoryStorage.remove(roomId);
            throw new LimitExceededException(LIMIT_EXCEEDED_MESSAGE);
        }

        var historyPrompt = new StringBuilder(PROMPT_CONVERSATION_HISTORY_INSTRUCTIONS);
        currentHistory.forEach(entry -> historyPrompt.append(entry.toString()));

        var contextSystemMessage = new SystemMessage(historyPrompt.toString());
        var generalInstructionsSystemMessage = new SystemMessage(PROMPT_GENERAL_INSTRUCTIONS);
        var currentPromptMessage = new UserMessage(CURRENT_PROMPT_INSTRUCTIONS.concat(userMessage));
        var prompt = new Prompt(List.of(generalInstructionsSystemMessage, contextSystemMessage, currentPromptMessage));

        var response = ollamaChatModel.call(prompt).getResult().getOutput().getText();
        currentHistory.add(new HistoryEntry(userMessage, response));

        return response;
    }

    public void deleteHistory(String roomId) {
        conversationalHistoryStorage.remove(roomId);
    }

}
