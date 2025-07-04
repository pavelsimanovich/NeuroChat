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

    public String callOllamaChat(final String message) {
        return ollamaChatModel.call(message);
    }

    public String getCurrentNodelName() {
        return ollamaChatModel.getDefaultOptions().getModel();
    }

    public String generateChatName(String context) {
        String promptText = "Generate a concise and creative name for a chat based on the following context: " + context;
        Prompt prompt = new Prompt(promptText);
        return ollamaChatModel.call(prompt).getResult().getOutput().getText();
    }
}
