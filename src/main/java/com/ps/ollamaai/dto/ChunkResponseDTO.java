package com.ps.ollamaai.dto;

import java.time.LocalDateTime;

public record ChunkResponseDTO(
        String content,
        LocalDateTime timestamp,
        boolean isEnd
) {}
