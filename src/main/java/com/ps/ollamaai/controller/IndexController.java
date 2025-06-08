package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@RequiredArgsConstructor
@Controller
public class IndexController {

    private final UserService userService;

    @GetMapping({"/", "/index"})
    public String index() {
        return "index";
    }

    @GetMapping("/home")
    public String home(Model model, @AuthenticationPrincipal UserDetails currentUse) {
        User user = userService.findByEmail(currentUse.getUsername());
        model.addAttribute("userId", user.getId());
        return "home";
    }

    @GetMapping("/registration")
    public String registration() {
        return "registration";
    }

}
