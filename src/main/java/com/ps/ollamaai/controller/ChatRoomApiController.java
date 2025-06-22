package com.ps.ollamaai.controller;

import com.ps.ollamaai.dto.ChatMessageDto;
import com.ps.ollamaai.dto.ChatRoomDto;
import com.ps.ollamaai.service.ChatMessageService;
import com.ps.ollamaai.service.ChatRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatRoomApiController {

    private final ChatMessageService chatMessageService;
    private final ChatRoomService chatRoomService;

    @GetMapping("/rooms/create")
    public ResponseEntity<ChatRoomDto> createRoom(final @RequestParam String userId, final @RequestParam String title) {
        final ChatRoomDto room = chatRoomService.createRoom(userId, title);
        return ResponseEntity.ok(room);
    }

    @GetMapping("/rooms")
    public ResponseEntity<List<ChatRoomDto>> getUserRooms(final @RequestParam String userId) {
        final List<ChatRoomDto> rooms = chatRoomService.getUserRooms(userId);
        return ResponseEntity.ok(rooms);
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<List<ChatMessageDto>> getRoomMessages(final @PathVariable String roomId) {
        final List<ChatMessageDto> messages = chatMessageService.getRoomMessages(roomId);
        return ResponseEntity.ok(messages);
    }

    @DeleteMapping("/rooms/{roomId}")
    public ResponseEntity<Void> deleteRoom(final @PathVariable String roomId,
                                           final @RequestHeader("X-User-ID") String userId) {
        chatRoomService.deleteRoom(roomId, userId);
        return ResponseEntity.noContent().build();
    }
}