package com.ps.ollamaai.dto.converter;

import com.ps.ollamaai.domain.ChatMessage;
import com.ps.ollamaai.dto.ChatMessageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ChatMessageToDtoConverter {
    
    private final FileDataToDtoConverter fileDataToDtoConverter;

    public ChatMessageDto convertToDto(final ChatMessage message) {
        final ChatMessageDto dto = new ChatMessageDto();
        dto.setId(message.getId());
        dto.setRoomId(message.getRoom().getId());
        dto.setUserId(message.getUserId());
        dto.setType(message.getType());
        dto.setContent(message.getContent());
        dto.setTimestamp(message.getTimestamp());
        
        // Convert file data if present
        if (message.getFileData() != null) {
            dto.setFileData(fileDataToDtoConverter.convertToDto(message.getFileData()));
        }
        
        return dto;
    }
}
