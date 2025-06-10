package com.ps.ollamaai.exceptions;

public class LimitExceededException extends RuntimeException {

    public LimitExceededException(String message) {
        super(message);
    }

}
