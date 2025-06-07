package com.ps.ollamaai.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class IndexController {

    @GetMapping({"/", "/index"})
    public String index() {
        return "index";
    }

    @GetMapping("/home")
    public String home(Model model) {
        model.addAttribute("chatId", "Hello World!");
        return "home";
    }

    @GetMapping("/registration")
    public String registration() {
        return "registration";
    }

}
