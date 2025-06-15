package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.ChatRoom;
import com.ps.ollamaai.dto.ChatRoomDto;
import com.ps.ollamaai.dto.converter.ChatRoomToDtoConverter;
import com.ps.ollamaai.llm.ChatWithHistoryService;
import com.ps.ollamaai.repository.ChatMessageRepository;
import com.ps.ollamaai.repository.ChatRoomRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomToDtoConverter chatRoomToDtoConverter;
    private final ChatWithHistoryService chatWithHistoryService;

    public ChatRoomDto createRoom(String userId, String title) {
        ChatRoom room = new ChatRoom();
        room.setUserId(userId);
        room.setTitle(title);
        room.setActive(true);
        ChatRoom chatRoom = chatRoomRepository.save(room);
        return chatRoomToDtoConverter.convert(chatRoom);
    }

    public List<ChatRoomDto> getUserRooms(String userId) {
        List<ChatRoom> chatRooms = chatRoomRepository.findByUserId(userId);
        return chatRooms.stream()
                .map(chatRoomToDtoConverter::convert)
                .toList();
    }

    @Transactional
    public void deleteRoom(String roomId, String userId) {
        final ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));
        if (!room.getUserId().equals(userId)) {
            throw new AccessDeniedException("You can only delete your own rooms");
        }
        chatMessageRepository.deleteByRoomId(roomId);
        chatRoomRepository.deleteById(roomId);
        chatWithHistoryService.deleteRoomHistory(roomId);
    }

    @Transactional
    public void setInActiveRoom(String roomId) {
        chatRoomRepository.setInactiveRoom(roomId);
    }
}
