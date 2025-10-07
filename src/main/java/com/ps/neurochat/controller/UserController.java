package com.ps.neurochat.controller;

import com.ps.neurochat.domain.User;
import com.ps.neurochat.dto.ChangePasswordRequest;
import com.ps.neurochat.dto.RegistrationRequest;
import com.ps.neurochat.service.LocaleMessageService;
import com.ps.neurochat.service.UserService;
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


@Slf4j
@Controller
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final LocaleMessageService localeMessageService;

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
            bindingResult.addError(new FieldError("registrationRequest", "confirmPassword",
                    localeMessageService.getLocalMessage("registration.passwords.mismatch")));
        }

        // Проверка существования пользователя с таким email
        if (requestDto.getEmail() != null && userService.findByEmail(requestDto.getEmail()) != null) {
            bindingResult.addError(new FieldError("registrationRequest", "email",
                    localeMessageService.getLocalMessage("registration.email.exists")));
        }

        if (bindingResult.hasErrors()) {
            return "registration";
        }

        try {
            String ipAddress = getClientIp(request);
            log.info("Регистрация нового пользователя с email: {}, IP: {}",
                    requestDto.getEmail(), ipAddress);

            userService.save(requestDto, ipAddress);
            model.addAttribute("message", localeMessageService.getLocalMessage("registration.success"));
            return "index";
        } catch (Exception e) {
            log.error("Ошибка при сохранении пользователя", e);
            model.addAttribute("error", localeMessageService.getLocalMessage("registration.error"));
            return "registration";
        }
    }

    @PostMapping("/api/user/change-password")
    public ResponseEntity<?> changePassword(@AuthenticationPrincipal UserDetails userDetails,
                                            @RequestBody ChangePasswordRequest request) {
        if (request == null || request.getNewPassword() == null || request.getConfirmPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    localeMessageService.getLocalMessage("api.user.change_password.invalid")));
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    localeMessageService.getLocalMessage("api.user.change_password.mismatch")));
        }
        if (request.getNewPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    localeMessageService.getLocalMessage("api.user.change_password.too_short")));
        }

        final User user = userService.findByEmail(userDetails.getUsername());
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message",
                    localeMessageService.getLocalMessage("api.user.not_found")));
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            return ResponseEntity.status(400).body(Map.of("message",
                    localeMessageService.getLocalMessage("api.user.current_password.invalid")));
        }
        userService.updatePassword(user, request.getNewPassword());
        return ResponseEntity.ok(Map.of("message",
                localeMessageService.getLocalMessage("api.user.change_password.success")));
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
