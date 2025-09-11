package com.ps.neurochat.service;

import com.ps.neurochat.domain.UserPreferencies;
import com.ps.neurochat.exceptions.LimitExceededException;
import com.ps.neurochat.repository.UserPreferenciesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TokenQuotaService {

    private final UserPreferenciesRepository userPreferenciesRepository;

    private static int estimateTokens(String text) {
        if (text == null || text.isBlank()) return 0;
        // Rough estimate: ~4 chars per token
        return Math.max(1, text.length() / 4);
    }

    public int estimateTokensForText(String text) {
        return estimateTokens(text);
    }

    @Transactional
    public void checkAndReserveTokens(String email, int estimatedTokens) {
        UserPreferencies prefs = userPreferenciesRepository.findByUserName(email)
                .orElseGet(() -> {
                    UserPreferencies p = new UserPreferencies();
                    p.setUserName(email);
                    p.setTokenUsedInPeriod(0L);
                    p.setPeriodStart(LocalDateTime.now());
                    return p;
                });

        // Reset period at the start of a new month
        LocalDateTime now = LocalDateTime.now();
        if (prefs.getPeriodStart() == null || isDifferentMonth(prefs.getPeriodStart(), now)) {
            prefs.setPeriodStart(now
                    .withDayOfMonth(1)
                    .withHour(0)
                    .withMinute(0)
                    .withSecond(0)
                    .withNano(0));
            prefs.setTokenUsedInPeriod(0L);
        }

        Integer limit = prefs.getMonthlyTokenLimit();
        if (limit == null || limit <= 0) {
            // Unlimited - nothing to reserve
            return;
        }
        long used = prefs.getTokenUsedInPeriod() == null ? 0L : prefs.getTokenUsedInPeriod();
        long remaining = Math.max(0, (long) limit - used);
        if (estimatedTokens > remaining) {
            throw new LimitExceededException(
                    "Monthly token limit exceeded. Available: " + remaining + ", required: " + estimatedTokens);
        }
        userPreferenciesRepository.save(prefs);
    }

    @Transactional
    public void addUsage(String email, int usedTokens) {
        if (usedTokens <= 0) return;
        UserPreferencies prefs = userPreferenciesRepository.findByUserName(email)
                .orElseGet(() -> {
                    UserPreferencies p = new UserPreferencies();
                    p.setUserName(email);
                    return p;
                });
        if (prefs.getPeriodStart() == null) {
            prefs.setPeriodStart(LocalDateTime.now());
        }
        long used = prefs.getTokenUsedInPeriod() == null ? 0L : prefs.getTokenUsedInPeriod();
        prefs.setTokenUsedInPeriod(used + usedTokens);
        userPreferenciesRepository.save(prefs);
    }

    public static int estimateTokensForMessages(String question) {
        return estimateTokens(question);
    }

    /**
     * Estimate total tokens for a single chat turn: user question + assistant answer (expected).
     * Uses a heuristic when expectedAnswerTokens is not provided by caller.
     */
    public static int estimateTokensForTurn(String question, Integer expectedAnswerTokens) {
        int base = estimateTokensForMessages(question);
        int answerEstimate;
        if (expectedAnswerTokens != null && expectedAnswerTokens > 0) {
            answerEstimate = expectedAnswerTokens;
        } else {
            // Heuristic: answer roughly up to 2x question tokens, bounded to [128, 1024]
            int questionTok = estimateTokens(question);
            answerEstimate = Math.max(128, Math.min(questionTok * 2, 1024));
        }
        return base + answerEstimate;
    }

    private boolean isDifferentMonth(LocalDateTime a, LocalDateTime b) {
        if (a == null || b == null) return true;
        LocalDate da = a.toLocalDate();
        LocalDate db = b.toLocalDate();
        return da.getYear() != db.getYear() || da.getMonthValue() != db.getMonthValue();
    }
}
