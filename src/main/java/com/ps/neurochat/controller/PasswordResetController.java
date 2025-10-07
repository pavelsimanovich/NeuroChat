package com.ps.neurochat.controller;

import com.ps.neurochat.service.LocaleMessageService;
import com.ps.neurochat.service.PasswordResetService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequiredArgsConstructor
@Slf4j
public class PasswordResetController {

    private final PasswordResetService passwordResetService;
    private final LocaleMessageService localeMessageService;

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
            redirectAttributes.addFlashAttribute("success",
                    localeMessageService.getLocalMessage("password.forgot.sent_info"));
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
            redirectAttributes.addFlashAttribute("error",
                    localeMessageService.getLocalMessage("password.reset.invalid_token"));
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
            result.rejectValue("confirmPassword", "password.mismatch",
                    localeMessageService.getLocalMessage("password.reset.mismatch"));
            return "reset-password";
        }

        boolean resetSuccess = passwordResetService.resetPassword(request.getToken(), request.getPassword());
        if (!resetSuccess) {
            redirectAttributes.addFlashAttribute("error",
                    localeMessageService.getLocalMessage("password.reset.failed"));
            return "redirect:/forgot-password";
        }

        redirectAttributes.addFlashAttribute("success",
                localeMessageService.getLocalMessage("password.reset.success"));
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
