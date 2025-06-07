package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/saveUser")
    public String saveUser(@ModelAttribute User user) {
        userService.save(user);
        return "redirect:/login";
    }
}
