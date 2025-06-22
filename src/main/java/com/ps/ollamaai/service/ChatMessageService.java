package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.ChatMessage;
import com.ps.ollamaai.domain.ChatRoom;
import com.ps.ollamaai.dto.ChatMessageDto;
import com.ps.ollamaai.dto.converter.ChatMessageToDtoConverter;
import com.ps.ollamaai.llm.ChatWithHistoryService;
import com.ps.ollamaai.repository.ChatMessageRepository;
import com.ps.ollamaai.repository.ChatRoomRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor(onConstructor = @__(@Autowired))
public class ChatMessageService {

    private final ChatRoomRepository roomRepository;
    private final ChatMessageRepository messageRepository;
    private final ChatWithHistoryService ollamaService;
    private final ChatMessageToDtoConverter chatMessageToDtoConverter;

    public List<ChatMessageDto> getRoomMessages(final String roomId) {
        final List<ChatMessage> chatMessages = messageRepository.findByRoomIdOrderByTimestampAsc(roomId);
        return chatMessages.stream()
                .sorted(Comparator.comparing(ChatMessage::getOrder))
                .map(chatMessageToDtoConverter::convertToDto)
                .toList();
    }

    @Transactional
    public ChatMessageDto saveUserMessageWithAiResponse(final String roomId, final String userId, final String content) {
        final ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));

        // Получаем последний порядковый номер для этой комнаты
        final Long lastOrder = messageRepository.findLastOrderByRoomId(roomId).orElse(0L);

        final ChatMessage message = new ChatMessage();
        message.setRoom(room);
        message.setUserId(userId);
        message.setType(ChatMessage.MessageType.USER_MESSAGE);
        message.setContent(content);
        message.setOrder(lastOrder + 1); // Увеличиваем порядок

        final ChatMessage userMessage = messageRepository.save(message);
        final ChatMessage aiResponse = generateAiResponse(content, room);
        aiResponse.setOrder(userMessage.getOrder() + 1); // Следующий порядковый номер

        messageRepository.save(aiResponse);

        return chatMessageToDtoConverter.convertToDto(aiResponse);
    }

    private ChatMessage generateAiResponse(final String userMessage, final ChatRoom room) {
        final String aiResponseText = ollamaService.call(userMessage, room.getId());

        final ChatMessage aiResponse = new ChatMessage();
        aiResponse.setRoom(room);
        aiResponse.setUserId("ai-assistant");
        aiResponse.setType(ChatMessage.MessageType.AI_RESPONSE);
        aiResponse.setContent(aiResponseText);

        return aiResponse;
    }
}
