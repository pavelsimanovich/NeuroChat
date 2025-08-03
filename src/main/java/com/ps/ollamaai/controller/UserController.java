package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

import static com.ps.ollamaai.constants.Messages.SUCCESS_REGISTRATION;

@Slf4j
@Controller
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/registration")
    public String registration(Model model) {
        model.addAttribute("user", new User());
        return "registration";
    }

    @PostMapping("/saveUser")
    public String saveUser(@Valid @ModelAttribute User user, BindingResult bindingResult, 
                          Model model, HttpServletRequest request) {
        // Проверка валидации входных данных
        if (bindingResult.hasErrors()) {
            return "registration";
        }

        // Проверка, что пользователь с таким email не существует
        if (userService.findByEmail(user.getEmail()) != null) {
            model.addAttribute("error", "Пользователь с таким email уже существует");
            return "registration";
        }

        try {
            // Логируем IP-адрес при регистрации для безопасности
            String ipAddress = getClientIp(request);
            log.info("Регистрация нового пользователя с email: {}, IP: {}", 
                    user.getEmail(), ipAddress);

            userService.save(user);
            model.addAttribute("message", SUCCESS_REGISTRATION);
            return "index";
        } catch (Exception e) {
            log.error("Ошибка при сохранении пользователя", e);
            model.addAttribute("error", "Произошла ошибка при регистрации. Пожалуйста, попробуйте снова.");
            return "registration";
        }
    }

    /**
     * Получение IP-адреса клиента с учетом прокси
     */
    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
