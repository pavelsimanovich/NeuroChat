package com.ps.ollamaai.utils;

public final class MessageConverter {

    private MessageConverter() {}

    public static String formatMessageContent(String text) {
        if (text == null) return "";

//        String escaped = HtmlUtils.htmlEscape(text);

//        escaped = escaped.replace("\n", "<br>");
//        escaped = escaped.replaceAll("&lt;think&gt;(.+?)&lt;/think&gt;",
//                "<a style=\"color: darkgrey;\">Мышление...<br>$1</a>");

        // Форматирование списков для маркированных списков
//        escaped = escaped.replaceAll("\\*\\*(.+?)\\*\\*", "<strong>$1</strong>");
//        escaped = escaped.replaceAll("```(.+?)```", "<code>$1</code>");
////        escaped = escaped.replace("### ", " ");
//        escaped = escaped.replace("* ", "&bull; ");

//        return escaped;
        return text;
    }
}
