package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.ChatMessage;
import com.ps.ollamaai.domain.ChatRoom;
import com.ps.ollamaai.llm.ChatWithHistoryService;
import com.ps.ollamaai.repository.ChatMessageRepository;
import com.ps.ollamaai.repository.ChatRoomRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

import static com.ps.ollamaai.utils.MessageConverter.formatMessageContent;

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
        return roomRepository.save(room);
    }

    public List<ChatRoom> getUserRooms(String userId) {
        return roomRepository.findByUserId(userId);
    }

    @Transactional
    public void deleteRoom(String roomId, String userId) {
        final ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));
        if (!room.getUserId().equals(userId)) {
            throw new AccessDeniedException("You can only delete your own rooms");
        }
        messageRepository.deleteByRoomId(roomId);
        roomRepository.deleteById(roomId);
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
        List<ChatMessage> byRoomIdOrderByTimestampAsc = messageRepository.findByRoomIdOrderByTimestampAsc(roomId);
        byRoomIdOrderByTimestampAsc.forEach(mes -> mes.setContent(formatMessageContent(mes.getContent())));
        return byRoomIdOrderByTimestampAsc;
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

        ChatMessage userMessage = messageRepository.save(message);
        ChatMessage aiResponse = generateAiResponse(roomId, content);
        aiResponse.setOrder(userMessage.getOrder() + 1); // Следующий порядковый номер
        messageRepository.save(aiResponse);
        aiResponse.setContent(formatMessageContent(aiResponse.getContent()));
        return aiResponse;
    }


}
