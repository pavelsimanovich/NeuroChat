package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.dto.RegistrationRequest;
import com.ps.ollamaai.dto.ChangePasswordRequest;
import com.ps.ollamaai.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

import static com.ps.ollamaai.constants.Messages.SUCCESS_REGISTRATION;

@Slf4j
@Controller
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/registration")
    public String registration(Model model) {
        model.addAttribute("registrationRequest", new RegistrationRequest());
        return "registration";
    }

    @PostMapping("/saveUser")
    public String saveUser(@Valid @ModelAttribute("registrationRequest") RegistrationRequest requestDto,
                           BindingResult bindingResult,
                           Model model, HttpServletRequest request) {
        if (!bindingResult.hasFieldErrors("confirmPassword") &&
                requestDto.getPassword() != null && requestDto.getConfirmPassword() != null &&
                !requestDto.getPassword().equals(requestDto.getConfirmPassword())) {
            bindingResult.addError(new FieldError("registrationRequest", "confirmPassword", "Пароли не совпадают"));
        }

        // Проверка существования пользователя с таким email
        if (requestDto.getEmail() != null && userService.findByEmail(requestDto.getEmail()) != null) {
            bindingResult.addError(new FieldError("registrationRequest", "email", "Пользователь с таким email уже существует"));
        }

        if (bindingResult.hasErrors()) {
            return "registration";
        }

        try {
            String ipAddress = getClientIp(request);
            log.info("Регистрация нового пользователя с email: {}, IP: {}",
                    requestDto.getEmail(), ipAddress);

            User user = new User();
            user.setEmail(requestDto.getEmail());
            user.setPassword(requestDto.getPassword());
            user.setFirstName(requestDto.getFirstName());
            user.setLastName(requestDto.getLastName());
            user.setIpFromLogin(ipAddress);

            userService.save(user);
            model.addAttribute("message", SUCCESS_REGISTRATION);
            return "index";
        } catch (Exception e) {
            log.error("Ошибка при сохранении пользователя", e);
            model.addAttribute("error", "Произошла ошибка при регистрации. Пожалуйста, попробуйте снова.");
            return "registration";
        }
    }

    @PostMapping("/api/user/change-password")
    public ResponseEntity<?> changePassword(@AuthenticationPrincipal UserDetails userDetails,
                                            @RequestBody ChangePasswordRequest request) {
        if (request == null || request.getNewPassword() == null || request.getConfirmPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Неверные данные"));
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Пароли не совпадают"));
        }
        if (request.getNewPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "Пароль должен содержать минимум 8 символов"));
        }

        User user = userService.findByEmail(userDetails.getUsername());
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Пользователь не найден"));
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            return ResponseEntity.status(400).body(Map.of("message", "Текущий пароль неверен"));
        }
        userService.save(user);
        return ResponseEntity.ok(Map.of("message", "Пароль успешно изменен"));
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
