package com.ps.ollamaai.dto.enums;

public enum AiRole {
    ASSISTANT(""),
    DEVELOPER(""),
    SOFTWARE_ARCHITECT(""),
    LAWYER("");


    String prompt;

    AiRole(String prompt) {}
}
