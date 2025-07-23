package com.ps.ollamaai.llm;

import lombok.experimental.UtilityClass;

@UtilityClass
public final class Prompts {

    public static final String CURRENT_PROMPT_INSTRUCTIONS = """
            
            Here's the `user_main_prompt`:
            
            """;

    public static final String PROMPT_GENERAL_INSTRUCTIONS = """
            Answer strictly in Russian.
            Make a greeting only if not yet.
            Identify the subject area addressed in user_main_prompt and respond as an expert in that field,
            providing a comprehensive answer with detailed explanations.
            Use emoticons when you think they are appropriate for friendly communication.
            Keep your response friendly, professional and well-structured.
            """;
}
