package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.UserPreferencies;
import com.ps.ollamaai.repository.UserPreferenciesRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Optional;

import static com.ps.ollamaai.llm.Prompts.PROMPT_GENERAL_INSTRUCTIONS;

@Slf4j
@Service
@AllArgsConstructor
public class UserPreferencesService {

    private final UserPreferenciesRepository userPreferenciesRepository;

    @Transactional(readOnly = true)
    public Optional<UserPreferencies> findByUserId(String email) {
        return userPreferenciesRepository.findByUserId(email);
    }

    @Transactional
    public UserPreferencies save(UserPreferencies userPreferencies) {
        return userPreferenciesRepository.save(userPreferencies);
    }

    @Transactional
    public UserPreferencies createOrUpdatePreferences(String email, String systemPrompt, String preferredModel) {
        UserPreferencies preferences = findByUserId(email)
                .orElseGet(() -> {
                    UserPreferencies newPreferences = new UserPreferencies();
                    newPreferences.setUserId(email);
                    return newPreferences;
                });
        preferences.setUserSystemPrompt(systemPrompt);

        if (preferredModel != null && !preferredModel.isEmpty()) {
            if (com.ps.ollamaai.dto.enums.SupportedOllamaModel.isSupported(preferredModel)) {
                preferences.setModel(preferredModel);
            } else {
                log.warn("Attempt to set unsupported model '{}' for user {}. Preference not changed.", preferredModel, email);
            }
        }

        return save(preferences);
    }

    public String getUserSystemPrompt(String email) {
        try {
            Optional<UserPreferencies> preferences = findByUserId(email);
            if (preferences.isPresent() && StringUtils.hasText(preferences.get().getUserSystemPrompt())) {
                return preferences.get().getUserSystemPrompt();
            }
        } catch (Exception e) {
            log.warn("Failed to load user preferences for userId: {}, using default prompt", email, e);
        }
        return PROMPT_GENERAL_INSTRUCTIONS;
    }
}
