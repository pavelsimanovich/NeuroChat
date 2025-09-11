package com.ps.neurochat.dto;

import com.ps.neurochat.dto.enums.ErrorType;

public record ChatMessageErrorDto(String error, ErrorType errorType) {}
