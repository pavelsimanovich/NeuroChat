package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.UserPreferencies;
import com.ps.ollamaai.repository.UserPreferenciesRepository;
import com.ps.ollamaai.repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@AllArgsConstructor
public class UserPreferencesService {

    private final UserPreferenciesRepository userPreferenciesRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Optional<UserPreferencies> findByUserId(String userId) {
        return userPreferenciesRepository.findByUserId(userId);
    }

    @Transactional
    public UserPreferencies save(UserPreferencies userPreferencies) {
        return userPreferenciesRepository.save(userPreferencies);
    }

    @Transactional
    public UserPreferencies createOrUpdatePreferences(String userId, String systemPrompt) {
        UserPreferencies preferences = findByUserId(userId)
                .orElseGet(() -> {
                    UserPreferencies newPreferences = new UserPreferencies();
                    newPreferences.setUserId(userId);
                    return newPreferences;
                });
        preferences.setUserSystemPrompt(systemPrompt);
        return save(preferences);
    }
}
