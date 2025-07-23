package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.UserPreferencies;
import com.ps.ollamaai.service.UserPreferencesService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user/preferences")
@AllArgsConstructor
public class UserPreferencesController {

    private final UserPreferencesService userPreferencesService;

    @GetMapping
    public ResponseEntity<UserPreferencies> getUserPreferences(@AuthenticationPrincipal UserDetails userDetails) {
        return userPreferencesService.findByUserId(userDetails.getUsername())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(new UserPreferencies()));
    }

    @PostMapping
    public ResponseEntity<UserPreferencies> saveUserPreferences(@AuthenticationPrincipal UserDetails userDetails,
                                                              @RequestBody Map<String, String> payload) {
        String systemPrompt = payload.get("systemPrompt");
        UserPreferencies savedPreferences = userPreferencesService.createOrUpdatePreferences(userDetails.getUsername(), systemPrompt);
        return ResponseEntity.ok(savedPreferences);
    }
}
