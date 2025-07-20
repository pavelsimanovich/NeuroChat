package com.ps.ollamaai.controller;

import com.ps.ollamaai.dto.ChatMessageDto;
import com.ps.ollamaai.dto.ChatRoomDto;
import com.ps.ollamaai.service.ChatMessageService;
import com.ps.ollamaai.service.ChatRoomService;
import com.ps.ollamaai.service.OllamaService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatRoomApiController {

    private final ChatRoomService chatRoomService;
    private final ChatMessageService chatMessageService;
    private final OllamaService ollamaService;

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

    @PostMapping("/rooms/{roomId}/rename")
    public ResponseEntity<Void> renameRoom(final @PathVariable String roomId, @RequestParam("title") String name) {
       chatRoomService.renameRoom(roomId, name);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/rooms/{roomId}/update")
    public ResponseEntity<ChatRoomDto> generateRoomName(final @PathVariable String roomId,
                                                        final @RequestParam("context") String context) {
        final String generatedName = ollamaService.generateChatName(context);
        final ChatRoomDto room = chatRoomService.renameRoom(roomId, generatedName);
        return ResponseEntity.ok(room);
    }

    @GetMapping("/messages/search")
    public ResponseEntity<List<ChatMessageDto>> searchMessages(
            final @RequestParam String roomId,
            final @RequestParam String query) {
        final List<ChatMessageDto> messages = chatMessageService.searchMessages(roomId, query);
        return ResponseEntity.ok(messages);
    }

    @GetMapping(value = "/rooms/{roomId}/export", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<Resource> exportChatHistory(@PathVariable String roomId) {
        String chatContent = chatMessageService.formatChatForExport(roomId);
        ByteArrayResource resource = new ByteArrayResource(chatContent.getBytes(StandardCharsets.UTF_8));
        String filename = "chat_export_" + roomId + ".txt";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.TEXT_PLAIN)
                .contentLength(chatContent.length())
                .body(resource);
    }
}