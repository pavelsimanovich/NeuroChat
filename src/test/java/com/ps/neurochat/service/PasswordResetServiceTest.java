package com.ps.neurochat.service;

import com.ps.neurochat.domain.PasswordResetToken;
import com.ps.neurochat.domain.User;
import com.ps.neurochat.repository.PasswordResetTokenRepository;
import com.ps.neurochat.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordResetTokenRepository tokenRepository;
    @Mock
    private EmailService emailService;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PasswordResetService passwordResetService;

    private User user;

    @BeforeEach
    void setup() {
        user = new User();
        user.setEmail("user@example.com");
        user.setFirstName("Ivan");
    }

    @Test
    @DisplayName("createPasswordResetTokenForUser returns false if email not found")
    void createToken_emailNotFound() {
        when(userRepository.findByEmail("none@example.com")).thenReturn(Optional.empty());

        boolean result = passwordResetService.createPasswordResetTokenForUser("none@example.com");

        assertThat(result).isFalse();
        verifyNoInteractions(emailService);
        verify(tokenRepository, never()).save(any());
    }

    @Test
    @DisplayName("createPasswordResetTokenForUser creates new token and sends email")
    void createToken_createsNew() {
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(tokenRepository.findByUser(user)).thenReturn(Optional.empty());

        boolean result = passwordResetService.createPasswordResetTokenForUser(user.getEmail());

        assertThat(result).isTrue();
        // Token is saved
        verify(tokenRepository).save(any(PasswordResetToken.class));
        // Email is sent
        verify(emailService).sendPasswordResetEmail(eq(user.getEmail()), anyString(), eq("Ivan"));
    }

    @Test
    @DisplayName("createPasswordResetTokenForUser updates existing token and sends email")
    void createToken_updatesExisting() {
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        PasswordResetToken existing = mock(PasswordResetToken.class);
        when(tokenRepository.findByUser(user)).thenReturn(Optional.of(existing));

        boolean result = passwordResetService.createPasswordResetTokenForUser(user.getEmail());

        assertThat(result).isTrue();
        verify(existing).setToken(anyString());
        verify(existing).setExpiryDate(any(LocalDateTime.class));
        verify(tokenRepository).save(existing);
        verify(emailService).sendPasswordResetEmail(eq(user.getEmail()), anyString(), eq("Ivan"));
    }

    @Test
    @DisplayName("validatePasswordResetToken returns false when not found")
    void validateToken_notFound() {
        when(tokenRepository.findByToken("t")).thenReturn(Optional.empty());

        boolean result = passwordResetService.validatePasswordResetToken("t");

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("validatePasswordResetToken returns false and deletes when expired")
    void validateToken_expired() {
        PasswordResetToken token = mock(PasswordResetToken.class);
        when(tokenRepository.findByToken("t")).thenReturn(Optional.of(token));
        when(token.isExpired()).thenReturn(true);

        boolean result = passwordResetService.validatePasswordResetToken("t");

        assertThat(result).isFalse();
        verify(tokenRepository).delete(token);
    }

    @Test
    @DisplayName("validatePasswordResetToken returns true when valid")
    void validateToken_valid() {
        PasswordResetToken token = mock(PasswordResetToken.class);
        when(tokenRepository.findByToken("t")).thenReturn(Optional.of(token));
        when(token.isExpired()).thenReturn(false);

        boolean result = passwordResetService.validatePasswordResetToken("t");

        assertThat(result).isTrue();
        verify(tokenRepository, never()).delete(any());
    }

    @Test
    @DisplayName("resetPassword returns false when token not found")
    void resetPassword_tokenNotFound() {
        when(tokenRepository.findByToken("t")).thenReturn(Optional.empty());

        boolean result = passwordResetService.resetPassword("t", "newpass");

        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("resetPassword returns false and deletes when token expired")
    void resetPassword_expired() {
        PasswordResetToken token = mock(PasswordResetToken.class);
        when(tokenRepository.findByToken("t")).thenReturn(Optional.of(token));
        when(token.isExpired()).thenReturn(true);

        boolean result = passwordResetService.resetPassword("t", "newpass");

        assertThat(result).isFalse();
        verify(tokenRepository).delete(token);
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("resetPassword encodes password, saves user, and deletes token")
    void resetPassword_success() {
        PasswordResetToken token = mock(PasswordResetToken.class);
        when(tokenRepository.findByToken("t")).thenReturn(Optional.of(token));
        when(token.isExpired()).thenReturn(false);

        User u = new User();
        u.setEmail("user@example.com");
        when(token.getUser()).thenReturn(u);
        when(passwordEncoder.encode("newpass")).thenReturn("ENCODED");

        boolean result = passwordResetService.resetPassword("t", "newpass");

        assertThat(result).isTrue();
        assertThat(u.getPassword()).isEqualTo("ENCODED");
        verify(userRepository).save(u);
        verify(tokenRepository).delete(token);
    }

    @Test
    @DisplayName("cleanupExpiredTokens delegates to repository")
    void cleanupExpiredTokens_runs() {
        passwordResetService.cleanupExpiredTokens();
        verify(tokenRepository).deleteExpiredTokens(any(LocalDateTime.class));
    }
}
