package com.ps.ollamaai.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserPreferencesDTO {
    private String systemPrompt;
    private String preferredModel;
    private String avatarFileId;
}
