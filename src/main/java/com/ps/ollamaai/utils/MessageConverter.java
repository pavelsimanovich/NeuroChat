package com.ps.ollamaai.utils;

public final class MessageConverter {

    private MessageConverter() {}

    public static String formatMessageContent(String text) {
        if (text == null) return "";

        //for deepseek or qwen
        text = text.replace("<think>", "<a style=\"color: darkgrey;\">Мышление...<br>");
        text = text.replace("</think>", "</a>");

        return text;
    }
}
