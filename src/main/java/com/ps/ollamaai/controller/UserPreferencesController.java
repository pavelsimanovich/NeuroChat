package com.ps.ollamaai.controller;

import com.ps.ollamaai.dto.UserPreferencesDTO;
import com.ps.ollamaai.service.UserPreferencesService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user/preferences")
@AllArgsConstructor
public class UserPreferencesController {
    private final UserPreferencesService userPreferencesService;

    @GetMapping
    public ResponseEntity<UserPreferencesDTO> getUserPreferences(@AuthenticationPrincipal UserDetails userDetails) {
        UserPreferencesDTO dto = userPreferencesService.getUserPreferencesOrDefault(userDetails.getUsername());
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    public ResponseEntity<UserPreferencesDTO> saveUserPreferences(@AuthenticationPrincipal UserDetails userDetails,
                                                               @RequestBody UserPreferencesDTO payload) {
        UserPreferencesDTO savedPreferences = userPreferencesService.createOrUpdatePreferences(
            userDetails.getUsername(),
            payload
        );

        return ResponseEntity.ok(savedPreferences);
    }
}
