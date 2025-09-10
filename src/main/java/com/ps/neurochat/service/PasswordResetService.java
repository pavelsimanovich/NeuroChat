package com.ps.neurochat.service;

import com.ps.neurochat.domain.PasswordResetToken;
import com.ps.neurochat.domain.User;
import com.ps.neurochat.repository.PasswordResetTokenRepository;
import com.ps.neurochat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public boolean createPasswordResetTokenForUser(String email) {
        try {
            Optional<User> userOptional = userRepository.findByEmail(email);
            if (userOptional.isEmpty()) {
                log.warn("Attempt to reset password for non-existent email: {}", email);
                return false;
            }

            User user = userOptional.get();
            
            // Use upsert instead of delete + insert
            return createOrUpdatePasswordToken(user);
        } catch (Exception e) {
            log.error("Error creating password reset token for email: {}", email, e);
            throw e;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
    protected boolean createOrUpdatePasswordToken(User user) {
        String token = UUID.randomUUID().toString();
        LocalDateTime expiryDate = LocalDateTime.now().plusHours(24);
        
        // Attempt to find existing token
        Optional<PasswordResetToken> existingToken = tokenRepository.findByUser(user);
        
        PasswordResetToken resetToken;
        if (existingToken.isPresent()) {
            // Update existing token
            resetToken = existingToken.get();
            resetToken.setToken(token);
            resetToken.setExpiryDate(expiryDate);
        } else {
            // Create new token
            resetToken = new PasswordResetToken(token, user, expiryDate);
        }
        
        tokenRepository.save(resetToken);

        // Send email
        String name = user.getFirstName() != null ? user.getFirstName() : "Пользователь";
        emailService.sendPasswordResetEmail(user.getEmail(), token, name);

        log.info("Password reset token created for user: {}", user.getEmail());
        return true;
    }

    @Transactional(readOnly = true)
    public boolean validatePasswordResetToken(String token) {
        try {
            Optional<PasswordResetToken> tokenOptional = tokenRepository.findByToken(token);
            if (tokenOptional.isEmpty()) {
                log.warn("Attempt to use non-existent password reset token: {}", token);
                return false;
            }

            PasswordResetToken resetToken = tokenOptional.get();
            if (resetToken.isExpired()) {
                // Delete expired token in separate transaction
                deleteExpiredTokenAsync(resetToken);
                log.warn("Attempt to use expired password reset token: {}", token);
                return false;
            }

            return true;
        } catch (Exception e) {
            log.error("Error validating token: {}", token, e);
            return false;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    protected void deleteExpiredTokenAsync(PasswordResetToken token) {
        try {
            tokenRepository.delete(token);
        } catch (Exception e) {
            log.warn("Failed to delete expired token: {}", token.getToken(), e);
        }
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public boolean resetPassword(String token, String newPassword) {
        try {
            Optional<PasswordResetToken> tokenOptional = tokenRepository.findByToken(token);
            if (tokenOptional.isEmpty()) {
                return false;
            }

            PasswordResetToken resetToken = tokenOptional.get();
            if (resetToken.isExpired()) {
                deleteExpiredTokenAsync(resetToken);
                return false;
            }

            User user = resetToken.getUser();
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);

            // Delete used token
            tokenRepository.delete(resetToken);

            log.info("Password successfully changed for user: {}", user.getEmail());
            return true;
        } catch (Exception e) {
            log.error("Error resetting password for token: {}", token, e);
            throw e;
        }
    }

    // Delete expired tokens every 6 hours
    @Scheduled(fixedRate = 6 * 60 * 60 * 1000)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cleanupExpiredTokens() {
        try {
            log.info("Starting scheduled cleanup of expired password reset tokens");
            tokenRepository.deleteExpiredTokens(LocalDateTime.now());
        } catch (Exception e) {
            log.error("Error cleaning up expired tokens", e);
        }
    }
}