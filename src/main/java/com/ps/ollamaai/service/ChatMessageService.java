package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.ChatMessage;
import com.ps.ollamaai.domain.ChatRoom;
import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.dto.ChatMessageDto;
import com.ps.ollamaai.dto.converter.ChatMessageToDtoConverter;
import com.ps.ollamaai.exceptions.LimitExceededException;
import com.ps.ollamaai.llm.history.HistoryEntry;
import com.ps.ollamaai.repository.ChatMessageRepository;
import com.ps.ollamaai.repository.ChatRoomRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static com.ps.ollamaai.constants.Messages.LIMIT_EXCEEDED_MESSAGE;

@Service
@RequiredArgsConstructor
public class ChatMessageService {

    @Value("${app.chat-limit}")
    private int maxHistoryChatLength;

    private final ChatRoomRepository roomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatMessageToDtoConverter chatMessageToDtoConverter;
    private final ChatMessageRepository messageRepository;
    private final UserService userService;
    private final HistoryEntryService historyEntryService;

    private final Map<String, List<Message>> conversationalHistory = new ConcurrentHashMap<>();
    private final Map<String, StringBuilder> buffers = new ConcurrentHashMap<>();

    public List<Message> processChatMessage(String message, String chatId, String userName) {
        User user = userService.findByEmail(userName);
        saveUserMessage(chatId, user.getId(), message);

        checkHistory(chatId);

        final List<Message> currentHistory = conversationalHistory.computeIfAbsent(chatId, k -> new ArrayList<>());
        checkLimit(chatId, currentHistory);

        return currentHistory;
    }

    public void saveChunk(String chatId, String chunk) {
        buffers.computeIfAbsent(chatId, k -> new StringBuilder()).append(chunk);
    }

    //todo refacroring
    public String saveAiResponse(String roomId) {
        String fullResponse = buffers.remove(roomId).toString();
        final ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));

        final Long lastOrder = chatMessageRepository.findLastOrderByRoomId(roomId).orElse(0L);

        final ChatMessage aiResponse = new ChatMessage();
        aiResponse.setRoom(room);
        aiResponse.setUserId("ai-assistant");
        aiResponse.setType(ChatMessage.MessageType.AI_RESPONSE);
        aiResponse.setContent(fullResponse);
        aiResponse.setOrder(lastOrder + 1); // Следующий порядковый номер

        chatMessageRepository.save(aiResponse);
        return fullResponse;
    }

    public void saveUserMessage(final String roomId, final String userId, final String userPrompt) {
        final ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));
        // Получаем последний порядковый номер для этой комнаты
        final Long lastOrder = chatMessageRepository.findLastOrderByRoomId(roomId).orElse(0L);

        final ChatMessage message = new ChatMessage();
        message.setRoom(room);
        message.setUserId(userId);
        message.setType(ChatMessage.MessageType.USER_MESSAGE);
        message.setContent(userPrompt);
        message.setOrder(lastOrder + 1); // Увеличиваем порядок
        chatMessageRepository.save(message);
    }

    public List<ChatMessageDto> getRoomMessages(final String roomId) {
        final List<ChatMessage> chatMessages = messageRepository.findByRoomIdOrderByTimestampAsc(roomId);
        return chatMessages.stream()
                .sorted(Comparator.comparing(ChatMessage::getOrder))
                .map(chatMessageToDtoConverter::convertToDto)
                .toList();
    }

    private void checkHistory(String chatId) {
        if (CollectionUtils.isEmpty(conversationalHistory.get(chatId))) {
            List<Message> chatHistory = new ArrayList<>();
            List<HistoryEntry> history = historyEntryService.getRoomHistory(chatId);
            for (HistoryEntry msg : history) {
                chatHistory.add(new UserMessage(msg.getPrompt()));
                chatHistory.add(new AssistantMessage(msg.getResponse()));
            }
            conversationalHistory.put(chatId, chatHistory);
        }
    }

    private void checkLimit(String chatId, List<Message> currentHistory) {
        if (currentHistory.size() >= maxHistoryChatLength + 1) {
            conversationalHistory.remove(chatId);
            roomRepository.setInactiveRoom(chatId);
            throw new LimitExceededException(LIMIT_EXCEEDED_MESSAGE);
        }
    }

}