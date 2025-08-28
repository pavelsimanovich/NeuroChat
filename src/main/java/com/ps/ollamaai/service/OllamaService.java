package com.ps.ollamaai.service;

import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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

    //todo i18n
    public String generateChatName(String context) {
        final String promptText = """
            Ты — нейросетевая модель, которая генерирует название чата на основе его последнего сообщения .
            Твоя задача — всегда возвращать только одно краткое название чата , длиной не более 50 символов .
            Название должно отражать суть сообщения, быть понятным и информативным.
            Не используй объяснения, приветствия, форматирование или дополнительный текст.
            Отвечай только названием чата .
            
            Контекст:
            """;
        Prompt prompt = new Prompt(promptText.concat(context));
        return ollamaChatModel.call(prompt).getResult().getOutput().getText();
    }
}
