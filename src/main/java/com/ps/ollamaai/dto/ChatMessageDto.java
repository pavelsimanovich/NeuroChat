package com.ps.ollamaai.dto;

import com.ps.ollamaai.domain.ChatMessage;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChatMessageDto {
    private String id;
    private String roomId;
    private String userId;
    private ChatMessage.MessageType type;
    private String content;
    private LocalDateTime timestamp;
}
