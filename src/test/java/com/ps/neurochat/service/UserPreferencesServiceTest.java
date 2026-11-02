package com.ps.neurochat.service;

import com.ps.neurochat.domain.UserPreferencies;
import com.ps.neurochat.dto.UserPreferencesDTO;
import com.ps.neurochat.repository.UserPreferenciesRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserPreferencesServiceTest {

    @Mock private UserPreferenciesRepository repo;
    @InjectMocks private UserPreferencesService service;

    @Test
    @DisplayName("getUserPreferencesOrDefault returns stored preferences and fills missing defaults")
    void getUserPreferencesOrDefault_prefPresent() {
        UserPreferencies entity = new UserPreferencies();
        entity.setUserName("user@example.com");
        entity.setUserSystemPrompt(null); // will be replaced by default
        entity.setModel(null); // becomes empty string in DTO
        entity.setLanguage("ru");
        when(repo.findByUserName("user@example.com")).thenReturn(Optional.of(entity));

        UserPreferencesDTO dto = service.getUserPreferencesOrDefault("user@example.com");
        assertThat(dto.getSystemPrompt()).isNotBlank();
        assertThat(dto.getPreferredModel()).isEqualTo("");
        assertThat(dto.getLanguage()).isEqualTo("ru");
    }

    @Test
    @DisplayName("getUserPreferencesOrDefault returns defaults when not present")
    void getUserPreferencesOrDefault_default() {
        when(repo.findByUserName("none")).thenReturn(Optional.empty());
        UserPreferencesDTO dto = service.getUserPreferencesOrDefault("none");
        assertThat(dto.getSystemPrompt()).isNotBlank();
        assertThat(dto.getPreferredModel()).isEqualTo("");
    }

    @Test
    @DisplayName("createOrUpdatePreferences creates new entity and saves with provided fields")
    void createOrUpdatePreferences_create() {
        when(repo.findByUserName("user@example.com")).thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserPreferencesDTO in = new UserPreferencesDTO();
        in.setSystemPrompt("SYS");
        in.setPreferredModel("gemma4:12b"); // supported
        in.setAvatarFileId("a1");
        in.setLanguage("en");
        in.setTtsSpeakWhileGenerating(Boolean.TRUE);
        in.setMonthlyTokenLimit(1000);
        in.setTokenUsedInPeriod(10L);
        in.setPeriodStart(LocalDateTime.now());

        UserPreferencesDTO out = service.createOrUpdatePreferences("user@example.com", in);
        assertThat(out.getSystemPrompt()).isEqualTo("SYS");
        assertThat(out.getPreferredModel()).isEqualTo("gemma4:12b");
        assertThat(out.getAvatarFileId()).isEqualTo("a1");
        assertThat(out.getTtsSpeakWhileGenerating()).isTrue();
        assertThat(out.getMonthlyTokenLimit()).isEqualTo(1000);
        assertThat(out.getTokenUsedInPeriod()).isEqualTo(10L);
    }

    @Test
    @DisplayName("createOrUpdatePreferences ignores unsupported model IDs")
    void createOrUpdatePreferences_unsupportedModel() {
        UserPreferencies existing = new UserPreferencies();
        existing.setUserName("u");
        existing.setModel("gemma3:4b");
        when(repo.findByUserName("u")).thenReturn(Optional.of(existing));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserPreferencesDTO in = new UserPreferencesDTO();
        in.setPreferredModel("unknown-model");

        UserPreferencesDTO out = service.createOrUpdatePreferences("u", in);
        assertThat(out.getPreferredModel()).isEqualTo("gemma3:4b");
    }

    @Test
    @DisplayName("setMonthlyLimit creates or updates preference")
    void setMonthlyLimit() {
        when(repo.findByUserName("u")).thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        service.setMonthlyLimit("u", 500);
        verify(repo).save(argThat(p -> p.getMonthlyTokenLimit().equals(500)));
    }

    @Test
    @DisplayName("resetQuotaPeriod resets used tokens and sets periodStart")
    void resetQuotaPeriod() {
        UserPreferencies existing = new UserPreferencies();
        existing.setUserName("u");
        when(repo.findByUserName("u")).thenReturn(Optional.of(existing));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.resetQuotaPeriod("u");
        verify(repo).save(argThat(p -> p.getTokenUsedInPeriod() == 0L && p.getPeriodStart() != null));
    }
}
