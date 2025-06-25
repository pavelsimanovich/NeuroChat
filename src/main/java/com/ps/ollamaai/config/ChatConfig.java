package com.ps.ollamaai.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import static com.ps.ollamaai.llm.Prompts.PROMPT_GENERAL_INSTRUCTIONS;

@Configuration
public class ChatConfig {

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder, ChatMemory chatMemory) {
        return builder
                .defaultSystem(PROMPT_GENERAL_INSTRUCTIONS)
                .defaultAdvisors()
                .build();
    }
}
