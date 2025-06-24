package com.ps.ollamaai.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import static com.ps.ollamaai.llm.Prompts.PROMPT_GENERAL_INSTRUCTIONS;

@Configuration
public class Config {

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder, ChatMemory chatMemory) {
        return builder
                .defaultSystem(PROMPT_GENERAL_INSTRUCTIONS)
                .defaultAdvisors(
                        new SimpleLoggerAdvisor()               //simply logs requests and responses with a Model
                        // new PromptChatMemoryAdvisor(chatMemory)  //let Spring AI manage long term memory in the DB
                )
                .build();
    }
}
