package com.ps.ollamaai.dto;

import lombok.Data;

@Data
public class ChatMessageRequest {
    private String userId;
    private String content;
}
