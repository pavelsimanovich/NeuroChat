package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.UserPreferencies;
import com.ps.ollamaai.exceptions.LimitExceededException;
import com.ps.ollamaai.repository.UserPreferenciesRepository;
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
class TokenQuotaServiceTest {

    @Mock private UserPreferenciesRepository repo;
    @InjectMocks private TokenQuotaService service;

    @Test
    @DisplayName("estimateTokensForText returns approx tokens and handles null/blank")
    void estimateTokens() {
        assertThat(service.estimateTokensForText(null)).isEqualTo(0);
        assertThat(service.estimateTokensForText("")) .isEqualTo(0);
        assertThat(service.estimateTokensForText("abcd")).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("checkAndReserveTokens returns when unlimited (null or <=0)")
    void checkAndReserve_unlimited() {
        UserPreferencies p = new UserPreferencies();
        p.setUserName("u");
        p.setMonthlyTokenLimit(null);
        when(repo.findByUserName("u")).thenReturn(Optional.of(p));

        service.checkAndReserveTokens("u", 100);
        verify(repo, never()).save(any());

        p.setMonthlyTokenLimit(0);
        service.checkAndReserveTokens("u", 100);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("checkAndReserveTokens throws when exceeds remaining quota")
    void checkAndReserve_exceeds() {
        UserPreferencies p = new UserPreferencies();
        p.setUserName("u");
        p.setMonthlyTokenLimit(100);
        p.setTokenUsedInPeriod(90L);
        p.setPeriodStart(LocalDateTime.now());
        when(repo.findByUserName("u")).thenReturn(Optional.of(p));

        assertThatThrownBy(() -> service.checkAndReserveTokens("u", 20))
                .isInstanceOf(LimitExceededException.class)
                .hasMessageContaining("Available: 10");
    }

    @Test
    @DisplayName("checkAndReserveTokens resets period on new month and saves")
    void checkAndReserve_resetsPeriod() {
        UserPreferencies p = new UserPreferencies();
        p.setUserName("u");
        p.setMonthlyTokenLimit(100);
        p.setTokenUsedInPeriod(50L);
        p.setPeriodStart(LocalDateTime.now().minusMonths(1));
        when(repo.findByUserName("u")).thenReturn(Optional.of(p));

        service.checkAndReserveTokens("u", 10);
        verify(repo).save(p);
        assertThat(p.getTokenUsedInPeriod()).isZero();
        assertThat(p.getPeriodStart()).isNotNull();
    }

    @Test
    @DisplayName("addUsage increments used tokens and saves")
    void addUsage_increments() {
        UserPreferencies p = new UserPreferencies();
        p.setUserName("u");
        p.setTokenUsedInPeriod(5L);
        when(repo.findByUserName("u")).thenReturn(Optional.of(p));

        service.addUsage("u", 7);
        assertThat(p.getTokenUsedInPeriod()).isEqualTo(12L);
        verify(repo).save(p);
    }

    @Test
    @DisplayName("estimateTokensForTurn computes base + heuristic answer when not provided")
    void estimateTokensForTurn() {
        int v = TokenQuotaService.estimateTokensForTurn("hello world", null);
        assertThat(v).isGreaterThan(0);
        int v2 = TokenQuotaService.estimateTokensForTurn("hello", 256);
        assertThat(v2).isGreaterThan(256);
    }
}
