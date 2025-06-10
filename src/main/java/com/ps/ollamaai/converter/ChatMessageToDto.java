package com.ps.ollamaai.converter;

import com.ps.ollamaai.domain.ChatMessage;
import com.ps.ollamaai.dto.ChatMessageDto;
import org.springframework.stereotype.Component;

import static com.ps.ollamaai.utils.MessageConverter.formatMessageContent;

@Component
public class ChatMessageToDto {

    public ChatMessageDto convertToDto(ChatMessage message) {
        final ChatMessageDto dto = new ChatMessageDto();
        dto.setId(message.getId());
        dto.setRoomId(message.getRoom().getId());
        dto.setUserId(message.getUserId());
        dto.setType(message.getType());
        dto.setContent(formatMessageContent(message.getContent()));
        dto.setTimestamp(message.getTimestamp());
        return dto;
    }
}
