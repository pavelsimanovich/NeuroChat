package com.ps.neurochat.dto.enums;

public enum SupportedOllamaModel  {
    GEMMA3_4B("gemma3:4b", "Gemma 3 (4B)"),
    GEMMA3_12B("gemma3:12b", "Gemma 3 (12B)"),
    QWEN_25_CODER("qwen2.5-coder", "Qwen 2.5 Coder");

    private final String id;
    private final String displayName;

    SupportedOllamaModel(String id, String displayName) {
        this.id = id;
        this.displayName = displayName;
    }

    public String id() {
        return id;
    }

    public String displayName() {
        return displayName;
    }

    public static boolean isSupported(String id) {
        if (id == null) return false;
        for (SupportedOllamaModel m : values()) {
            if (m.id.equalsIgnoreCase(id)) {
                return true;
            }
        }
        return false;
    }
}
