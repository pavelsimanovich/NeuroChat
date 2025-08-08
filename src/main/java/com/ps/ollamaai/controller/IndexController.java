package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.UserPreferencies;
import com.ps.ollamaai.service.OllamaService;
import com.ps.ollamaai.service.UserPreferencesService;
import com.ps.ollamaai.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Optional;

@RequiredArgsConstructor
@Controller
public class IndexController {

    private final UserService userService;
    private final OllamaService ollamaService;
    private final UserPreferencesService userPreferencesService;

    @GetMapping({"/", "/index"})
    public String index() {
        return "index";
    }

    @GetMapping("/home")
    public String home(Model model, @AuthenticationPrincipal UserDetails currentUser) {
        final var user = userService.findByEmail(currentUser.getUsername());

        // Prefer user-selected model name if available; otherwise fall back to default
        Optional<UserPreferencies> prefsOpt = userPreferencesService.findByUserId(currentUser.getUsername());
        String modelName = prefsOpt.map(UserPreferencies::getModel)
                .filter(StringUtils::hasText)
                .orElse(ollamaService.getCurrentModelName());

        model.addAttribute("modelName", modelName);
        model.addAttribute("userId", user.getId());
        model.addAttribute("userName", "%s %s".formatted(user.getFirstName(), user.getLastName()));
        return "home";
    }
}
