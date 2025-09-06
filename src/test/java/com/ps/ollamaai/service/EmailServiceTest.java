package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.UserPreferencies;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;

import java.util.Locale;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock private MessageSource messageSource;
    @Mock private UserPreferencesService userPreferencesService;

    @InjectMocks @Spy
    private EmailService emailService;

    @Test
    @DisplayName("sendPasswordResetEmail resolves locale, subject and delegates to templated sender")
    void sendPasswordResetEmail_delegates() {
        when(userPreferencesService.findByUserId("user@example.com")).thenReturn(Optional.of(prefWithLang("ru")));
        when(messageSource.getMessage(eq("email.reset.title"), isNull(), anyString(), any(Locale.class)))
                .thenReturn("Сброс пароля");

        doNothing().when(emailService).sendEmailWithTemplate(eq("user@example.com"), eq("Сброс пароля"), eq("password-reset-email"), anyMap());

        emailService.sendPasswordResetEmail("user@example.com", "token123", "Ivan");

        verify(emailService).sendEmailWithTemplate(eq("user@example.com"), eq("Сброс пароля"), eq("password-reset-email"),
                argThat(vars -> vars.containsKey("resetUrl") && vars.containsKey("name") && vars.containsKey("expiryHours")));
    }

    private static UserPreferencies prefWithLang(String lang) {
        UserPreferencies p = new UserPreferencies();
        p.setUserName("user@example.com");
        p.setLanguage(lang);
        return p;
    }
}
