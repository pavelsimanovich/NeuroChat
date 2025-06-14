package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.ChatMessage;
import com.ps.ollamaai.domain.ChatRoom;
import com.ps.ollamaai.dto.ChatMessageDto;
import com.ps.ollamaai.dto.converter.ChatMessageToDto;
import com.ps.ollamaai.service.ChatRoomService;
import com.ps.ollamaai.service.ChatMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatApiController {

    private final ChatMessageService chatMessageService;
    private final ChatRoomService chatRoomService;
    private final ChatMessageToDto chatMessageToDto;

    @GetMapping("/rooms/create")
    public ResponseEntity<ChatRoom> createRoom(@RequestParam String userId, @RequestParam String title) {
        final ChatRoom room = chatRoomService.createRoom(userId, title);
        return ResponseEntity.ok(room);
    }

    @GetMapping("/rooms")
    public ResponseEntity<List<ChatRoom>> getUserRooms(@RequestParam String userId) {
        final List<ChatRoom> rooms = chatRoomService.getUserRooms(userId);
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<List<ChatMessageDto>> getRoomMessages(@PathVariable String roomId) {
        final List<ChatMessageDto> messages = chatMessageService.getRoomMessages(roomId)
                .stream()
                .sorted(Comparator.comparing(ChatMessage::getOrder))
                .map(chatMessageToDto::convertToDto)
                .toList();
        return ResponseEntity.ok(messages);
    }

    @DeleteMapping("/rooms/{roomId}")
    public ResponseEntity<Void> deleteRoom(@PathVariable String roomId, @RequestHeader("X-User-ID") String userId) {
        chatRoomService.deleteRoom(roomId, userId);
        return ResponseEntity.noContent().build();
    }
}