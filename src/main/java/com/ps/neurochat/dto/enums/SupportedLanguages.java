package com.ps.neurochat.dto.enums;

public enum SupportedLanguages {
    EN("en"),
    RU("ru");

    private final String language;
    SupportedLanguages(String language) {
        this.language = language;
    }
    public String getLanguage() {
        return language;
    }
}
