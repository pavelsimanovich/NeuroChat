package com.ps.neurochat.controller;

import com.ps.neurochat.domain.UserPreferencies;
import com.ps.neurochat.dto.enums.SupportedOllamaModel;
import com.ps.neurochat.service.OllamaService;
import com.ps.neurochat.service.UserPreferencesService;
import com.ps.neurochat.service.UserService;
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

        Optional<UserPreferencies> prefsOpt = userPreferencesService.findByUserId(currentUser.getUsername());
        String modelName = prefsOpt.map(UserPreferencies::getModel)
                .filter(StringUtils::hasText)
                .orElse(ollamaService.getCurrentModelName());

        String avatarUrl = prefsOpt.map(UserPreferencies::getAvatarFileId)
                .filter(StringUtils::hasText)
                .map(id -> "/api/files/" + id + "/preview")
                .orElse("/img/default-avatar.svg");

        model.addAttribute("modelName", modelName);
        model.addAttribute("userId", user.getId());
        model.addAttribute("userName", "%s %s".formatted(user.getFirstName(), user.getLastName()));
        model.addAttribute("userAvatarUrl", avatarUrl);
        model.addAttribute("supportedModels", SupportedOllamaModel.values());
        return "home";
    }

    @GetMapping("/admin")
    public String adminPage() {
        return "admin";
    }
}
