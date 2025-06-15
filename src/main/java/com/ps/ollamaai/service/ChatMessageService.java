package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.ChatMessage;
import com.ps.ollamaai.domain.ChatRoom;
import com.ps.ollamaai.llm.ChatWithHistoryService;
import com.ps.ollamaai.repository.ChatMessageRepository;
import com.ps.ollamaai.repository.ChatRoomRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor(onConstructor = @__(@Autowired))
public class ChatMessageService {

    private final ChatRoomRepository roomRepository;
    private final ChatMessageRepository messageRepository;
    private final ChatWithHistoryService ollamaService;

    private ChatMessage generateAiResponse(String userMessage, ChatRoom room) {
        final String aiResponseText = ollamaService.call(userMessage, room.getId());

        ChatMessage aiResponse = new ChatMessage();
        aiResponse.setRoom(room);
        aiResponse.setUserId("ai-assistant");
        aiResponse.setType(ChatMessage.MessageType.AI_RESPONSE);
        aiResponse.setContent(aiResponseText);

        return aiResponse;
    }

    public List<ChatMessage> getRoomMessages(String roomId) {
        return messageRepository.findByRoomIdOrderByTimestampAsc(roomId);
    }

    @Transactional
    public ChatMessage saveUserMessageWithAiResponse(String roomId, String userId, String content) {
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));

        // Получаем последний порядковый номер для этой комнаты
        Long lastOrder = messageRepository.findLastOrderByRoomId(roomId).orElse(0L);

        ChatMessage message = new ChatMessage();
        message.setRoom(room);
        message.setUserId(userId);
        message.setType(ChatMessage.MessageType.USER_MESSAGE);
        message.setContent(content);
        message.setOrder(lastOrder + 1); // Увеличиваем порядок

        ChatMessage userMessage = messageRepository.save(message);
        log.info("Start processing AI request {}", LocalDateTime.now());
        ChatMessage aiResponse = generateAiResponse(content, room);
        log.info("End processing AI request {}", LocalDateTime.now());
        aiResponse.setOrder(userMessage.getOrder() + 1); // Следующий порядковый номер
        messageRepository.save(aiResponse);
        return aiResponse;
    }
}
