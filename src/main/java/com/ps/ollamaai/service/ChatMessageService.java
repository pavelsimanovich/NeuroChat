package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.ChatMessage;
import com.ps.ollamaai.domain.ChatRoom;
import com.ps.ollamaai.dto.ChatMessageDto;
import com.ps.ollamaai.dto.converter.ChatMessageToDtoConverter;
import com.ps.ollamaai.repository.ChatMessageRepository;
import com.ps.ollamaai.repository.ChatRoomRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class ChatMessageService {

    private final ChatRoomRepository roomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatMessageToDtoConverter chatMessageToDtoConverter;
    private final ChatMessageRepository messageRepository;

    private final Map<String, StringBuilder> buffers = new ConcurrentHashMap<>();

    public void saveChunk(String chatId, String userId, String chunk) {
        buffers.computeIfAbsent(chatId, k -> new StringBuilder()).append(chunk);
    }

    //todo refacroring
    public ChatMessageDto saveAiResponse(String roomId, String userId) {
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

        ChatMessage saiResponse = chatMessageRepository.save(aiResponse);
        removeBuffer(roomId);
        return chatMessageToDtoConverter.convertToDto(saiResponse);
    }

    public ChatMessage saveUserMessage(final String roomId, final String userId, final String userPrompt) {
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

        return chatMessageRepository.save(message);
    }

    public void removeBuffer(String chatId) {
        buffers.remove(chatId);
    }

    public List<ChatMessageDto> getRoomMessages(final String roomId) {
        final List<ChatMessage> chatMessages = messageRepository.findByRoomIdOrderByTimestampAsc(roomId);
        return chatMessages.stream()
                .sorted(Comparator.comparing(ChatMessage::getOrder))
                .map(chatMessageToDtoConverter::convertToDto)
                .toList();
    }
}