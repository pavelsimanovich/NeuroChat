package com.ps.ollamaai.controller;

import com.ps.ollamaai.service.PasswordResetService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequiredArgsConstructor
@Slf4j
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @GetMapping("/forgot-password")
    public String showForgotPasswordForm(Model model) {
        model.addAttribute("forgotPasswordRequest", new ForgotPasswordRequest());
        return "forgot-password";
    }

    @PostMapping("/forgot-password")
    public String processForgotPasswordForm(
            @Valid @ModelAttribute("forgotPasswordRequest") ForgotPasswordRequest request,
            BindingResult result,
            RedirectAttributes redirectAttributes) {

        if (result.hasErrors()) {
            return "forgot-password";
        }

        passwordResetService.createPasswordResetTokenForUser(request.getEmail());

        redirectAttributes.addFlashAttribute("success",
                "Если указанный email зарегистрирован в системе, на него была отправлена инструкция по восстановлению пароля.");
        return "redirect:/forgot-password?sent";
    }

    @GetMapping("/reset-password")
    public String showResetPasswordForm(
            @RequestParam("token") String token,
            Model model,
            RedirectAttributes redirectAttributes) {

        boolean isValidToken = passwordResetService.validatePasswordResetToken(token);
        if (!isValidToken) {
            redirectAttributes.addFlashAttribute("error", 
                    "Недействительная или просроченная ссылка для восстановления пароля. Пожалуйста, запросите новую.");
            return "redirect:/forgot-password";
        }

        model.addAttribute("resetPasswordRequest", new ResetPasswordRequest(token));
        return "reset-password";
    }

    @PostMapping("/reset-password")
    public String processResetPasswordForm(
            @Valid @ModelAttribute("resetPasswordRequest") ResetPasswordRequest request,
            BindingResult result,
            RedirectAttributes redirectAttributes) {

        if (result.hasErrors()) {
            return "reset-password";
        }

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            result.rejectValue("confirmPassword", "password.mismatch", "Пароли не совпадают");
            return "reset-password";
        }

        boolean resetSuccess = passwordResetService.resetPassword(request.getToken(), request.getPassword());
        if (!resetSuccess) {
            redirectAttributes.addFlashAttribute("error", 
                    "Не удалось изменить пароль. Ссылка недействительна или устарела.");
            return "redirect:/forgot-password";
        }

        redirectAttributes.addFlashAttribute("success", 
                "Ваш пароль успешно изменен. Теперь вы можете войти в систему, используя новый пароль.");
        return "redirect:/login";
    }

    @Data
    public static class ForgotPasswordRequest {
        @NotBlank(message = "Email не может быть пустым")
        @Email(message = "Пожалуйста, введите корректный email")
        private String email;
    }

    @Data
    @AllArgsConstructor
    public static class ResetPasswordRequest {
        private String token;

        @NotBlank(message = "Пароль не может быть пустым")
        @Size(min = 8, message = "Пароль должен содержать минимум 8 символов")
        private String password;

        @NotBlank(message = "Подтверждение пароля не может быть пустым")
        private String confirmPassword;

        public ResetPasswordRequest(String token) {
            this.token = token;
        }
    }
}
