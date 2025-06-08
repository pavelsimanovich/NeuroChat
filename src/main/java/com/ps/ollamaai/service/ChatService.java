package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.ChatMessage;
import com.ps.ollamaai.domain.ChatRoom;
import com.ps.ollamaai.llm.ChatWithHistoryService;
import com.ps.ollamaai.repository.ChatMessageRepository;
import com.ps.ollamaai.repository.ChatRoomRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor(onConstructor = @__(@Autowired))
public class ChatService {

    private final ChatRoomRepository roomRepository;
    private final ChatMessageRepository messageRepository;
    private final ChatWithHistoryService ollamaService;

    public ChatRoom createRoom(String userId, String title) {
        ChatRoom room = new ChatRoom();
        room.setUserId(userId);
        room.setTitle(title);
        room.setAiActive(true);
        return roomRepository.save(room);
    }

    public Optional<ChatRoom> findRoomById(String roomId) {
        return roomRepository.findById(roomId);
    }

    public List<ChatRoom> getUserRooms(String userId) {
        return roomRepository.findByUserId(userId);
    }

    public void deleteRoom(String roomId) {
        messageRepository.deleteByRoomId(roomId);
        roomRepository.deleteById(roomId);
    }

    public ChatRoom toggleAi(String roomId) {
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));

        room.setAiActive(!room.isAiActive());
        return roomRepository.save(room);
    }

    private ChatMessage generateAiResponse(String roomId, String userMessage) {
        String aiResponseText = ollamaService.call(userMessage, roomId);

        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));

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

    public ChatMessage saveUserMessage(String roomId, String userId, String content) {
        ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));

        // Получаем последний порядковый номер для этой комнаты
        Long lastOrder = messageRepository.findLastOrderByRoomId(roomId)
                .orElse(0L);

        ChatMessage message = new ChatMessage();
        message.setRoom(room);
        message.setUserId(userId);
        message.setType(ChatMessage.MessageType.USER_MESSAGE);
        message.setContent(content);
        message.setOrder(lastOrder + 1); // Увеличиваем порядок

        ChatMessage savedMessage = messageRepository.save(message);

        if (room.isAiActive()) {
            ChatMessage aiResponse = generateAiResponse(roomId, content);
            aiResponse.setOrder(savedMessage.getOrder() + 1); // Следующий порядковый номер
            messageRepository.save(aiResponse);
            return aiResponse;
        }

        return savedMessage;
    }
}
