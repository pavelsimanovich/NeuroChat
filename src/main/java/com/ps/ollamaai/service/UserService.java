package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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

}
