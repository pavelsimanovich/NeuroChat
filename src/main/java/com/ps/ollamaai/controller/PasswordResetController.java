package com.ps.ollamaai.controller;

import com.ps.ollamaai.service.PasswordResetService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;

@Controller
@RequiredArgsConstructor
@Slf4j
public class PasswordResetController {

    private final PasswordResetService passwordResetService;
    private final MessageSource messageSource;

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

        boolean passwordResetTokenForUser = passwordResetService.createPasswordResetTokenForUser(request.getEmail());
        if (!passwordResetTokenForUser) {
            redirectAttributes.addFlashAttribute("error", "Email not exists");
        } else {
            String sentMsg = messageSource.getMessage("password.forgot.sent_info", null, LocaleContextHolder.getLocale());
            redirectAttributes.addFlashAttribute("success", sentMsg);
        }
            return "redirect:/forgot-password?sent";
    }

    @GetMapping("/reset-password")
    public String showResetPasswordForm(
            @RequestParam("token") String token,
            Model model,
            RedirectAttributes redirectAttributes) {

        boolean isValidToken = passwordResetService.validatePasswordResetToken(token);
        if (!isValidToken) {
            String err = messageSource.getMessage("password.reset.invalid_token", null, LocaleContextHolder.getLocale());
            redirectAttributes.addFlashAttribute("error", err);
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
            String msg = messageSource.getMessage("password.reset.mismatch", null, LocaleContextHolder.getLocale());
            result.rejectValue("confirmPassword", "password.mismatch", msg);
            return "reset-password";
        }

        boolean resetSuccess = passwordResetService.resetPassword(request.getToken(), request.getPassword());
        if (!resetSuccess) {
            String err = messageSource.getMessage("password.reset.failed", null, LocaleContextHolder.getLocale());
            redirectAttributes.addFlashAttribute("error", err);
            return "redirect:/forgot-password";
        }

        String ok = messageSource.getMessage("password.reset.success", null, LocaleContextHolder.getLocale());
        redirectAttributes.addFlashAttribute("success", ok);
        return "redirect:/login";
    }

    @Data
    public static class ForgotPasswordRequest {
        @NotBlank(message = "{validation.email.not_blank}")
        @Email(message = "{validation.email.invalid}")
        private String email;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ResetPasswordRequest {
        private String token;

        @NotBlank(message = "{validation.password.not_blank}")
        @Size(min = 8, message = "{validation.password.too_short}")
        private String password;

        @NotBlank(message = "{validation.confirm.not_blank}")
        private String confirmPassword;

        public ResetPasswordRequest(String token) {
            this.token = token;
        }
    }
}
