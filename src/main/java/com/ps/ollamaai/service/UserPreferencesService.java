package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.UserPreferencies;
import com.ps.ollamaai.dto.UserPreferencesDTO;
import com.ps.ollamaai.dto.enums.SupportedOllamaModel;
import com.ps.ollamaai.repository.UserPreferenciesRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Optional;
import java.time.LocalDateTime;

import static com.ps.ollamaai.llm.Prompts.PROMPT_GENERAL_INSTRUCTIONS;

@Slf4j
@Service
@AllArgsConstructor
public class UserPreferencesService {

    private final UserPreferenciesRepository userPreferenciesRepository;

    public Optional<UserPreferencies> findByUserId(String email) {
        return userPreferenciesRepository.findByUserId(email);
    }

    @Transactional
    public UserPreferencesDTO createOrUpdatePreferences(String email, UserPreferencesDTO dto) {
        UserPreferencies preferences = findByUserId(email)
                .orElseGet(() -> {
                    UserPreferencies newPreferences = new UserPreferencies();
                    newPreferences.setUserId(email);
                    return newPreferences;
                });
        applyDtoToEntity(dto, preferences, email);
        return toDto(save(preferences));
    }

    @Transactional(readOnly = true)
    public UserPreferencesDTO getUserPreferencesOrDefault(String email) {
        try {
            Optional<UserPreferencies> preferences = findByUserId(email);
            if (preferences.isPresent()) {
                UserPreferencies entity = preferences.get();
                UserPreferencesDTO dto = toDto(entity);
                if (!StringUtils.hasText(dto.getSystemPrompt())) {
                    dto.setSystemPrompt(PROMPT_GENERAL_INSTRUCTIONS);
                }
                if (!StringUtils.hasText(dto.getPreferredModel())) {
                    dto.setPreferredModel("");
                }
                return dto;
            }
        } catch (Exception e) {
            log.warn("Failed to load user preferences for userId: {}, using defaults", email, e);
        }
        UserPreferencesDTO dto = new UserPreferencesDTO();
        dto.setSystemPrompt(PROMPT_GENERAL_INSTRUCTIONS);
        dto.setPreferredModel("");
        return dto;
    }

    public UserPreferencies save(UserPreferencies userPreferencies) {
        return userPreferenciesRepository.save(userPreferencies);
    }

    private UserPreferencesDTO toDto(UserPreferencies entity) {
        if (entity == null) return null;
        UserPreferencesDTO dto = new UserPreferencesDTO();
        dto.setSystemPrompt(entity.getUserSystemPrompt());
        dto.setPreferredModel(entity.getModel());
        dto.setAvatarFileId(entity.getAvatarFileId());
        dto.setLanguage(entity.getLanguage());
        dto.setMonthlyTokenLimit(entity.getMonthlyTokenLimit());
        dto.setTokenUsedInPeriod(entity.getTokenUsedInPeriod());
        dto.setPeriodStart(entity.getPeriodStart());
        return dto;
    }

    private void applyDtoToEntity(UserPreferencesDTO dto, UserPreferencies entity, String email) {
        if (dto == null || entity == null) return;
        entity.setUserSystemPrompt(dto.getSystemPrompt());
        String preferredModel = dto.getPreferredModel();
        if (StringUtils.hasText(preferredModel)) {
            if (SupportedOllamaModel.isSupported(preferredModel)) {
                entity.setModel(preferredModel);
            } else {
                log.warn("Attempt to set unsupported model '{}' for user {}. Preference not changed.", preferredModel, email);
            }
        }
        if (StringUtils.hasText(dto.getAvatarFileId())) {
            entity.setAvatarFileId(dto.getAvatarFileId());
        }
        // Language (simple string, no validation list here)
        if (StringUtils.hasText(dto.getLanguage())) {
            entity.setLanguage(dto.getLanguage());
        }
        // Quota fields
        if (dto.getMonthlyTokenLimit() != null) {
            entity.setMonthlyTokenLimit(dto.getMonthlyTokenLimit());
        }
        if (dto.getTokenUsedInPeriod() != null) {
            entity.setTokenUsedInPeriod(dto.getTokenUsedInPeriod());
        }
        if (dto.getPeriodStart() != null) {
            entity.setPeriodStart(dto.getPeriodStart());
        }
    }

    @Transactional
    public void setMonthlyLimit(String email, Integer limit) {
        UserPreferencies preferences = findByUserId(email)
                .orElseGet(() -> {
                    UserPreferencies p = new UserPreferencies();
                    p.setUserId(email);
                    return p;
                });
        preferences.setMonthlyTokenLimit(limit);
        save(preferences);
    }

    @Transactional
    public void resetQuotaPeriod(String email) {
        UserPreferencies preferences = findByUserId(email)
                .orElseGet(() -> {
                    UserPreferencies p = new UserPreferencies();
                    p.setUserId(email);
                    return p;
                });
        preferences.setTokenUsedInPeriod(0L);
        preferences.setPeriodStart(LocalDateTime.now());
        save(preferences);
    }
}
