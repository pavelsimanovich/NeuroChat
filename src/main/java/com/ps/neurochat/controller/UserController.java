package com.ps.neurochat.controller;

import com.ps.neurochat.domain.User;
import com.ps.neurochat.dto.RegistrationRequest;
import com.ps.neurochat.dto.ChangePasswordRequest;
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
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;

import java.util.Map;


@Slf4j
@Controller
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final MessageSource messageSource;

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
            String msg = messageSource.getMessage("registration.passwords.mismatch",
                    null, LocaleContextHolder.getLocale());
            bindingResult.addError(new FieldError("registrationRequest", "confirmPassword", msg));
        }

        // Проверка существования пользователя с таким email
        if (requestDto.getEmail() != null && userService.findByEmail(requestDto.getEmail()) != null) {
            String msg = messageSource.getMessage("registration.email.exists",
                    null, LocaleContextHolder.getLocale());
            bindingResult.addError(new FieldError("registrationRequest", "email", msg));
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
            String success = messageSource.getMessage("registration.success",
                    null, LocaleContextHolder.getLocale());
            model.addAttribute("message", success);
            return "index";
        } catch (Exception e) {
            log.error("Ошибка при сохранении пользователя", e);
            String err = messageSource.getMessage("registration.error",
                    null, LocaleContextHolder.getLocale());
            model.addAttribute("error", err);
            return "registration";
        }
    }

    @PostMapping("/api/user/change-password")
    public ResponseEntity<?> changePassword(@AuthenticationPrincipal UserDetails userDetails,
                                            @RequestBody ChangePasswordRequest request) {
        if (request == null || request.getNewPassword() == null || request.getConfirmPassword() == null) {
            String msg = messageSource.getMessage("api.user.change_password.invalid",
                    null, LocaleContextHolder.getLocale());
            return ResponseEntity.badRequest().body(Map.of("message", msg));
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            String msg = messageSource.getMessage("api.user.change_password.mismatch",
                    null, LocaleContextHolder.getLocale());
            return ResponseEntity.badRequest().body(Map.of("message", msg));
        }
        if (request.getNewPassword().length() < 8) {
            String msg = messageSource.getMessage("api.user.change_password.too_short",
                    null, LocaleContextHolder.getLocale());
            return ResponseEntity.badRequest().body(Map.of("message", msg));
        }

        User user = userService.findByEmail(userDetails.getUsername());
        if (user == null) {
            String msg = messageSource.getMessage("api.user.not_found",
                    null, LocaleContextHolder.getLocale());
            return ResponseEntity.status(404).body(Map.of("message", msg));
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            String msg = messageSource.getMessage("api.user.current_password.invalid",
                    null, LocaleContextHolder.getLocale());
            return ResponseEntity.status(400).body(Map.of("message", msg));
        }
        userService.save(user);
        String ok = messageSource.getMessage("api.user.change_password.success",
                null, LocaleContextHolder.getLocale());
        return ResponseEntity.ok(Map.of("message", ok));
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
