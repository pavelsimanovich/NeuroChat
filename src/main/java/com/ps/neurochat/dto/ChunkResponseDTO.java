package com.ps.neurochat.dto;

public record ChunkResponseDTO(
        String content,
        boolean isEnd,
        String error,
        String roomTitle,
        String thinking
) {}
