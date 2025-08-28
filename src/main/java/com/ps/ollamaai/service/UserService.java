package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.dto.enums.Role;
import com.ps.ollamaai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public void save(final User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setEnabled(true);
        user.setRole(Role.USER.name());
        userRepository.save(user);
    }

    public User findByEmail(final String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public List<User> search(String query) {
        if (query == null || query.isBlank()) {
            return findAll();
        }
        return userRepository
                .findByEmailContainingIgnoreCaseOrFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
                        query, query, query);
    }

    public void setRole(String userId, String role) {
        userRepository.findById(userId).ifPresent(u -> {
            u.setRole(role);
            userRepository.save(u);
        });
    }

    public void setEnabled(String userId, boolean enabled) {
        userRepository.findById(userId).ifPresent(u -> {
            u.setEnabled(enabled);
            userRepository.save(u);
        });
    }

    public void resetPassword(String userId, String newPassword) {
        userRepository.findById(userId).ifPresent(u -> {
            u.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(u);
        });
    }

    public long countAll() {
        return userRepository.count();
    }

    public long countCreatedAfter(LocalDateTime ts) {
        return userRepository.countByCreatedAtAfter(ts);
    }

    public Map<String, Object> getUserStats() {
        long total = countAll();
        LocalDateTime now = LocalDateTime.now();
        long new24h = countCreatedAfter(now.minusHours(24));
        long new7d = countCreatedAfter(now.minusDays(7));
        return Map.of(
                "total", total,
                "new24h", new24h,
                "new7d", new7d
        );
    }

    public User findById(String id) {
        return userRepository.findById(id).orElse(null);
    }
}
