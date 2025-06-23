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
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    private final Map<String, List<HistoryEntry>> conversationalHistory = new LinkedHashMap<>();

    public String call(final String userMessage, final String roomId) {

        if (CollectionUtils.isEmpty(conversationalHistory.get(roomId))) {
            List<HistoryEntry> roomMessages = historyEntryService.getRoomHistory(roomId);
            if (!roomMessages.isEmpty()) {
                conversationalHistory.put(roomId, roomMessages);
            }
        }

        final List<HistoryEntry> currentHistory = conversationalHistory.computeIfAbsent(roomId, k -> new ArrayList<>());
        if (currentHistory.size() >= maxHistoryChatLength + 1) {
            deleteRoomHistory(roomId);
            throw new LimitExceededException(LIMIT_EXCEEDED_MESSAGE);
        }

        final StringBuilder historyPrompt = new StringBuilder(PROMPT_CONVERSATION_HISTORY_INSTRUCTIONS);
        currentHistory.forEach(entry -> historyPrompt.append(entry.toString()));

        final SystemMessage contextSystemMessage = new SystemMessage(historyPrompt.toString());
        final SystemMessage generalInstructionsSystemMessage = new SystemMessage(PROMPT_GENERAL_INSTRUCTIONS);
        final UserMessage currentPromptMessage = new UserMessage(CURRENT_PROMPT_INSTRUCTIONS.concat(userMessage));

        final Prompt prompt = new Prompt(List.of(generalInstructionsSystemMessage, contextSystemMessage, currentPromptMessage));

        final String response = ollamaChatModel.call(prompt).getResult().getOutput().getText();

        currentHistory.add(new HistoryEntry(userMessage, response));

        return response;
    }

    public void deleteRoomHistory(final String roomId) {
        conversationalHistory.remove(roomId);
    }

}
