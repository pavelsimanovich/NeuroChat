package com.ps.neurochat.service;

import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor(onConstructor = @__(@Autowired))
public class OllamaService {

    private final OllamaChatModel ollamaChatModel;

    public String callSimpleOllamaChat(final String message) {
        return ollamaChatModel.call(message);
    }

    public String getCurrentModelName() {
        return ollamaChatModel.getDefaultOptions().getModel();
    }

    private static final int TITLE_MAX_LENGTH = 80;

    //todo i18n
    public String generateChatName(String context) {
        final String promptText = """
            Ты — нейросетевая модель, которая генерирует название чата на основе его последнего сообщения .
            Твоя задача — всегда возвращать только одно краткое название чата , длиной не более 50 символов .
            Название должно отражать суть сообщения, быть понятным и информативным.
            Название должно быть на том же языке, что и сообщение.
            Не используй объяснения, приветствия, форматирование или дополнительный текст.
            Отвечай только названием чата .
            
            Контекст:
            """;
        Prompt prompt = new Prompt(promptText.concat(context));
        return sanitizeTitle(ollamaChatModel.call(prompt).getResult().getOutput().getText());
    }

    /**
     * Normalizes raw model output into a usable room title: first non-blank
     * line only, surrounding quotes/markdown stripped, length capped.
     */
    private String sanitizeTitle(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "";
        }
        String title = raw.lines()
                .map(String::trim)
                .filter(StringUtils::hasText)
                .findFirst()
                .orElse("")
                .replaceAll("^[#*«»\"'`\\s]+|[#*«»\"'`\\s]+$", "")
                .trim();
        return title.length() > TITLE_MAX_LENGTH
                ? title.substring(0, TITLE_MAX_LENGTH).trim()
                : title;
    }
}
