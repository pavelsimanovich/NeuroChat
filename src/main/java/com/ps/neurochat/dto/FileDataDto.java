package com.ps.neurochat.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FileDataDto {
    private String id;
    private String fileName;
    private String contentType;
    private Long size;
    private LocalDateTime createdAt;
    
    // Note: We don't include the actual file data in the DTO by default
    // to avoid sending large amounts of data when not needed
}
