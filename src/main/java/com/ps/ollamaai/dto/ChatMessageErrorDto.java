package com.ps.ollamaai.dto;

import com.ps.ollamaai.dto.enums.ErrorType;

public record ChatMessageErrorDto(String error, ErrorType errorType) {}
