package com.ps.ollamaai.llm;

public class Prompts {

    private Prompts() {
        throw new IllegalStateException("Utility class");
    }

    public static final String CURRENT_PROMPT_INSTRUCTIONS = """
            
            Here's the `user_main_prompt`:
            
            """;

    public static final String PROMPT_GENERAL_INSTRUCTIONS = """
            You have to answer on `user_main_prompt` without any reasoning.
            """;

    public static final String PROMPT_CONVERSATION_HISTORY_INSTRUCTIONS = """        
            The object `conversational_history` below represents the past interaction between the user and you (the LLM).
            Each `history_entry` is represented as a pair of `prompt` and `response`.
            `prompt` is a past user prompt and `response` was your response for that `prompt`.
            
            Use the information in `conversational_history` if you need to recall things from the conversation
            , or in other words, if the `user_main_prompt` needs any information from past `prompt` or `response`.
            If you don't need the `conversational_history` information, simply respond to the prompt with your built-in knowledge.
            
            `conversational_history`:
            
            """;
}
