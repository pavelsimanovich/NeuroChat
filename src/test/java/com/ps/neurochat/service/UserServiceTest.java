package com.ps.neurochat.service;

import com.ps.neurochat.domain.User;
import com.ps.neurochat.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;

    @InjectMocks private UserService userService;

    @Test
    @DisplayName("findByEmail returns user or null when not found")
    void findByEmail() {
        User u = new User(); u.setEmail("user@example.com");
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(u));
        assertThat(userService.findByEmail("user@example.com")).isNotNull();

        when(userRepository.findByEmail("none")).thenReturn(Optional.empty());
        assertThat(userService.findByEmail("none")).isNull();
    }

    @Test
    @DisplayName("findAll delegates to repository")
    void findAll() {
        when(userRepository.findAll()).thenReturn(List.of(new User()));
        assertThat(userService.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("search returns all on blank query else delegates to search repo method")
    void search() {
        when(userRepository.findAll()).thenReturn(List.of(new User()));
        assertThat(userService.search(" ")).hasSize(1);

        when(userRepository.findByEmailContainingIgnoreCaseOrFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
                anyString(), anyString(), anyString())).thenReturn(List.of(new User(), new User()));
        assertThat(userService.search("john")).hasSize(2);
    }

    @Test
    @DisplayName("setRole and setEnabled update user when present")
    void setRole_setEnabled() {
        User u = new User(); u.setId("1"); u.setRole("USER"); u.setEnabled(false);
        when(userRepository.findById("1")).thenReturn(Optional.of(u));

        userService.setRole("1", "ADMIN");
        assertThat(u.getRole()).isEqualTo("ADMIN");
        verify(userRepository).save(u);

        userService.setEnabled("1", true);
        assertThat(u.isEnabled()).isTrue();
        verify(userRepository, times(2)).save(u);
    }

    @Test
    @DisplayName("countAll and countCreatedAfter and getUserStats aggregate counts")
    void stats() {
        when(userRepository.count()).thenReturn(42L);
        when(userRepository.countByCreatedAtAfter(any(LocalDateTime.class))).thenReturn(5L);

        assertThat(userService.countAll()).isEqualTo(42);
        assertThat(userService.countCreatedAfter(LocalDateTime.now().minusDays(1))).isEqualTo(5);

        Map<String, Object> stats = userService.getUserStats();
        assertThat(stats).containsKeys("total", "new24h", "new7d");
    }

    @Test
    @DisplayName("findById returns user or null")
    void findById() {
        User u = new User(); u.setId("1");
        when(userRepository.findById("1")).thenReturn(Optional.of(u));
        assertThat(userService.findById("1")).isNotNull();
        when(userRepository.findById("2")).thenReturn(Optional.empty());
        assertThat(userService.findById("2")).isNull();
    }
}
