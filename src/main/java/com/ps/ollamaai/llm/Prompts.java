package com.ps.ollamaai.llm;

public final class Prompts {

    private Prompts() {
        throw new IllegalStateException("Utility class");
    }

    public static final String CURRENT_PROMPT_INSTRUCTIONS = """
            
            Here's the `user_main_prompt`:
            
            """;

    //              providing a comprehensive answer with detailed explanations.
    public static final String PROMPT_GENERAL_INSTRUCTIONS = """
            "Answer strictly in Russian.
             Make a greeting if not yet.
             Identify the subject area addressed in `user_main_prompt` and respond as an expert in that field.

             Use emoticons when you think they are appropriate for friendly communication.
             Keep your response friendly, professional and well-structured.
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
