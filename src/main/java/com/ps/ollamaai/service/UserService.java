package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public void save(final User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setEnabled(true);
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
}
