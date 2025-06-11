package com.ps.ollamaai.controller;

import com.ps.ollamaai.dto.converter.ChatMessageToDto;
import com.ps.ollamaai.domain.ChatMessage;
import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.dto.ChatMessageErrorDto;
import com.ps.ollamaai.dto.ChatMessageRequest;
import com.ps.ollamaai.exceptions.LimitExceededException;
import com.ps.ollamaai.service.ChatService;
import com.ps.ollamaai.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

import static com.ps.ollamaai.constants.Messages.LIMIT_EXCEEDED_MESSAGE;

@Slf4j
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

        try {
            final User user = userService.findByEmail(principal.getName());
            final ChatMessage response = chatService.saveUserMessageWithAiResponse(
                    roomId,
                    user.getId(),
                    request.getContent()
            );

            messagingTemplate.convertAndSend(
                    "/topic/room/" + roomId,
                    chatMessageToDto.convertToDto(response)
            );

//            if (savedMessage.getType() == ChatMessage.MessageType.AI_RESPONSE) {
//                messagingTemplate.convertAndSend(
//                        "/topic/room/" + roomId,
//                        chatMessageToDto.convertToDto(response)
//                );
//            }
        } catch (LimitExceededException ex) {
            log.error(LIMIT_EXCEEDED_MESSAGE, ex);
            var errorDto = new ChatMessageErrorDto(ex.getMessage());
            messagingTemplate.convertAndSend("/topic/room/" + roomId, errorDto);
        } catch (Exception ex) {
            log.error("Ошибка при обработке сообщения", ex);
            var errorDto = new ChatMessageErrorDto("Произошла внутренняя ошибка");
            messagingTemplate.convertAndSend("/topic/room/" + roomId, errorDto);
        }

    }
}
