package com.ps.ollamaai.controller;

import com.ps.ollamaai.converter.ChatMessageToDto;
import com.ps.ollamaai.domain.ChatMessage;
import com.ps.ollamaai.domain.User;
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
    private final ChatMessageToDto chatMessageToDto;

    @MessageMapping("/chat/{roomId}/send")
    public void sendMessage(
            @DestinationVariable String roomId,
            @Payload ChatMessageRequest request,
            Principal principal) {

        final User user = userService.findByEmail(principal.getName());
        final ChatMessage savedMessage = chatService.saveUserMessage(
                roomId,
                user.getId(),
                request.getContent()
        );

        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId,
                chatMessageToDto.convertToDto(savedMessage)
        );

        if (savedMessage.getType() == ChatMessage.MessageType.AI_RESPONSE) {
            messagingTemplate.convertAndSend(
                    "/topic/room/" + roomId,
                    chatMessageToDto.convertToDto(savedMessage)
            );
        }
    }
}
