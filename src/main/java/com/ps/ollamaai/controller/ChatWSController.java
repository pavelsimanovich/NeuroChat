package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.dto.ChatMessageDto;
import com.ps.ollamaai.dto.ChatMessageErrorDto;
import com.ps.ollamaai.dto.ChatMessageRequest;
import com.ps.ollamaai.dto.enums.ErrorType;
import com.ps.ollamaai.exceptions.LimitExceededException;
import com.ps.ollamaai.service.ChatMessageService;
import com.ps.ollamaai.service.ChatRoomService;
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
import static com.ps.ollamaai.constants.Messages.SYSTEM_ERROR;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatWSController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageService chatMessageService;
    private final UserService userService;
    private final ChatRoomService chatRoomService;

    private static final String TOPIC_ROOM = "/topic/room/";

    @MessageMapping("/chat/{roomId}/send")
    public void sendMessage(
            @DestinationVariable String roomId,
            @Payload ChatMessageRequest request,
            Principal principal) {

        try {
            final User user = userService.findByEmail(principal.getName());
            final ChatMessageDto response = chatMessageService.saveUserMessageWithAiResponse(
                    roomId,
                    user.getId(),
                    request.getContent()
            );
            messagingTemplate.convertAndSend(TOPIC_ROOM + roomId, response);
        } catch (LimitExceededException ex) {
            log.error(LIMIT_EXCEEDED_MESSAGE, ex);
            chatRoomService.setInActiveRoom(roomId);
            sendErrorMessage(roomId, ex.getMessage(), ErrorType.LIMIT_EXCEEDED);
        } catch (Exception ex) {
            log.error(SYSTEM_ERROR, ex);
            sendErrorMessage(roomId, SYSTEM_ERROR, ErrorType.SERVER_ERROR);
        }
    }

    private void sendErrorMessage(String roomId, String message, ErrorType errorType) {
        var errorDto = new ChatMessageErrorDto(message, errorType);
        messagingTemplate.convertAndSend(TOPIC_ROOM + roomId, errorDto);
    }
}
