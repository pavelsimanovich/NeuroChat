package com.ps.neurochat.dto;

import com.ps.neurochat.domain.ChatMessage;
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
    private FileDataDto fileData; // Reference to file data
}
