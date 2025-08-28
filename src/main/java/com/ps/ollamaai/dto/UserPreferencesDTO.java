package com.ps.ollamaai.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class UserPreferencesDTO {
    private String systemPrompt;
    private String preferredModel;
    private String avatarFileId;
    private String language;
    // Token quota
    private Integer monthlyTokenLimit;
    private Long tokenUsedInPeriod;
    private LocalDateTime periodStart;
}
