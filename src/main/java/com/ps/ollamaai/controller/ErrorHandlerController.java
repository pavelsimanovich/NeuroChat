package com.ps.ollamaai.controller;

import com.ps.ollamaai.dto.ChatMessageErrorDto;
import com.ps.ollamaai.dto.enums.ErrorType;
import com.ps.ollamaai.exceptions.LimitExceededException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import static com.ps.ollamaai.constants.Messages.LIMIT_EXCEEDED_MESSAGE;
import static com.ps.ollamaai.constants.Messages.SYSTEM_ERROR;

@RestControllerAdvice
public class ErrorHandlerController {

    @ExceptionHandler(value = Exception.class)
    public ResponseEntity<ChatMessageErrorDto> handleException(Exception e) {
        return  ResponseEntity.ok(new ChatMessageErrorDto(SYSTEM_ERROR, ErrorType.SERVER_ERROR));
    }

    @ExceptionHandler(value = LimitExceededException.class)
    public ResponseEntity<ChatMessageErrorDto> handleLimitException(LimitExceededException e) {
        return  ResponseEntity.ok(new ChatMessageErrorDto(LIMIT_EXCEEDED_MESSAGE, ErrorType.LIMIT_EXCEEDED));
    }

}
