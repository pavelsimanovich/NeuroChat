package com.ps.ollamaai.llm.history;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class HistoryEntry {
    private String prompt;
    private String response;

    @Override
    public String toString() {
        return String.format("""
                            `history_entry`:
                                `prompt`: %s
                                
                                `response`: %s
                                -----------------
                                \n
                """, prompt, response);
    }
}