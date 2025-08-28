package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.dto.AdminUserDto;
import com.ps.ollamaai.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminApiController {

    private final UserService userService;
    private static final SecureRandom RANDOM = new SecureRandom();

    @GetMapping("/users")
    public List<AdminUserDto> listUsers(@RequestParam(value = "q", required = false) String q) {
        List<User> users = StringUtils.hasText(q) ? userService.search(q) : userService.findAll();
        return users.stream()
                .map(AdminUserDto::from)
                .toList();
    }

    @GetMapping("/users/stats")
    public Map<String, Object> userStats() {
        return userService.getUserStats();
    }

    @PostMapping("/users/{id}/role")
    public ResponseEntity<?> changeRole(@PathVariable("id") String id, @RequestBody Map<String, String> payload) {
        String role = payload.getOrDefault("role", "USER");
        userService.setRole(id, role.toUpperCase());
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @PostMapping("/users/{id}/enable")
    public ResponseEntity<?> setEnabled(@PathVariable("id") String id, @RequestBody Map<String, Boolean> payload) {
        boolean enabled = Boolean.TRUE.equals(payload.get("enabled"));
        userService.setEnabled(id, enabled);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable("id") String id) {
        String newPassword = generateTempPassword();
        userService.resetPassword(id, newPassword);
        return ResponseEntity.ok(Map.of("status", "ok", "newPassword", newPassword));
    }

    private String generateTempPassword() {
        byte[] bytes = new byte[9];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}
