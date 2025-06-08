package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.ChatMessage;
import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.dto.ChatMessageDto;
import com.ps.ollamaai.dto.ChatMessageRequest;
import com.ps.ollamaai.service.ChatService;
import com.ps.ollamaai.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;
    private final UserService userService;

    @MessageMapping("/chat/{roomId}/send")
    public void sendMessage(
            @DestinationVariable String roomId,
            @Payload ChatMessageRequest request,
            Principal principal
    ) {
        final User user = userService.findByEmail(principal.getName());
        // Сохраняем сообщение в БД
        final ChatMessage savedMessage = chatService.saveUserMessage(
                roomId,
                user.getId(),
                request.getContent()
        );

        // Отправляем подтверждение с ID сообщения
        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId,
                convertToDto(savedMessage)
        );

        // Если есть ответ AI
        if (savedMessage.getType() == ChatMessage.MessageType.AI_RESPONSE) {
            messagingTemplate.convertAndSend(
                    "/topic/room/" + roomId,
                    convertToDto(savedMessage)
            );
        }
    }

    private ChatMessageDto convertToDto(ChatMessage message) {
        ChatMessageDto dto = new ChatMessageDto();
        dto.setId(message.getId());
        dto.setRoomId(message.getRoom().getId());
        dto.setUserId(message.getUserId());
        dto.setType(message.getType());
        dto.setContent(message.getContent());
        dto.setTimestamp(message.getTimestamp());
        return dto;
    }
}
