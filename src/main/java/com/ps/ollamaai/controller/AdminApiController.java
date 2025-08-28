package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.dto.AdminUserDto;
import com.ps.ollamaai.dto.UserPreferencesDTO;
import com.ps.ollamaai.service.UserService;
import com.ps.ollamaai.service.UserPreferencesService;
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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminApiController {

    private final UserService userService;
    private final UserPreferencesService userPreferencesService;
    

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

    @GetMapping("/users/{id}/quota")
    public ResponseEntity<?> getUserQuota(@PathVariable("id") String id) {
        User u = userService.findById(id);
        if (u == null) return ResponseEntity.notFound().build();
        UserPreferencesDTO prefs = userPreferencesService.getUserPreferencesOrDefault(u.getEmail());
        return ResponseEntity.ok(Map.of(
                "monthlyTokenLimit", prefs.getMonthlyTokenLimit(),
                "tokenUsedInPeriod", prefs.getTokenUsedInPeriod(),
                "periodStart", prefs.getPeriodStart()
        ));
    }

    @PostMapping("/users/{id}/quota")
    public ResponseEntity<?> setUserQuota(@PathVariable("id") String id, @RequestBody Map<String, Object> payload) {
        User u = userService.findById(id);
        if (u == null) return ResponseEntity.notFound().build();
        Integer limit = null;
        Object val = payload.get("monthlyTokenLimit");
        if (val instanceof Number n) {
            limit = n.intValue();
        } else if (val instanceof String s && StringUtils.hasText(s)) {
            try { limit = Integer.parseInt(s.trim()); } catch (Exception ignored) {}
        }
        userPreferencesService.setMonthlyLimit(u.getEmail(), limit);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @PostMapping("/users/{id}/quota/reset")
    public ResponseEntity<?> resetUserQuota(@PathVariable("id") String id) {
        User u = userService.findById(id);
        if (u == null) return ResponseEntity.notFound().build();
        userPreferencesService.resetQuotaPeriod(u.getEmail());
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

}
