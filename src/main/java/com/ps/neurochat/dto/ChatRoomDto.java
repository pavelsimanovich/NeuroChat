package com.ps.neurochat.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class ChatRoomDto {
    private String id;
    private String userId;
    private String title;
    private Instant createdAt;
    private boolean active;
}
