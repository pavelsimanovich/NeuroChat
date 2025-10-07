package com.ps.neurochat.controller;

import com.ps.neurochat.service.LocaleMessageService;
import com.ps.neurochat.service.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.view.InternalResourceViewResolver;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.flash;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@ExtendWith(MockitoExtension.class)
class PasswordResetControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PasswordResetService passwordResetService;

    @Mock
    private LocaleMessageService localeMessageService;

    @BeforeEach
    void setup() {
        PasswordResetController controller = new PasswordResetController(passwordResetService, localeMessageService);
        InternalResourceViewResolver viewResolver = new InternalResourceViewResolver();
        viewResolver.setPrefix("/WEB-INF/views/");
        viewResolver.setSuffix(".jsp");
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setViewResolvers(viewResolver)
                .build();
    }

    @Test
    @DisplayName("GET /forgot-password returns view with model")
    void getForgotPassword() throws Exception {
        mockMvc.perform(get("/forgot-password"))
                .andExpect(status().isOk())
                .andExpect(view().name("forgot-password"))
                .andExpect(model().attributeExists("forgotPasswordRequest"));
    }

    @Test
    @DisplayName("POST /forgot-password with invalid email returns form with errors")
    void postForgotPassword_invalidEmail() throws Exception {
        mockMvc.perform(post("/forgot-password")
                        .param("email", "not-an-email"))
                .andExpect(status().isOk())
                .andExpect(view().name("forgot-password"))
                .andExpect(model().attributeHasFieldErrors("forgotPasswordRequest", "email"));
    }

    @Test
    @DisplayName("POST /forgot-password when service returns false redirects with error flash")
    void postForgotPassword_emailNotFound() throws Exception {
        when(passwordResetService.createPasswordResetTokenForUser("user@example.com")).thenReturn(false);

        mockMvc.perform(post("/forgot-password")
                        .param("email", "user@example.com"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/forgot-password?sent"))
                .andExpect(flash().attributeExists("error"));
    }

    @Test
    @DisplayName("POST /forgot-password success redirects with success flash")
    void postForgotPassword_success() throws Exception {
        when(passwordResetService.createPasswordResetTokenForUser("user@example.com")).thenReturn(true);
        when(localeMessageService.getLocalMessage(eq("password.forgot.sent_info"))).thenReturn("sent");

        mockMvc.perform(post("/forgot-password")
                        .param("email", "user@example.com"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/forgot-password?sent"))
                .andExpect(flash().attribute("success", "sent"));
    }

    @Test
    @DisplayName("GET /reset-password invalid token redirects to /forgot-password with error")
    void getResetPassword_invalidToken() throws Exception {
        when(passwordResetService.validatePasswordResetToken("bad")).thenReturn(false);
        when(localeMessageService.getLocalMessage(eq("password.reset.invalid_token"))).thenReturn("invalid");

        mockMvc.perform(get("/reset-password").param("token", "bad"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/forgot-password"))
                .andExpect(flash().attribute("error", "invalid"));
    }

    @Test
    @DisplayName("GET /reset-password valid token returns view with model")
    void getResetPassword_valid() throws Exception {
        when(passwordResetService.validatePasswordResetToken("good")).thenReturn(true);

        mockMvc.perform(get("/reset-password").param("token", "good"))
                .andExpect(status().isOk())
                .andExpect(view().name("reset-password"))
                .andExpect(model().attributeExists("resetPasswordRequest"));
    }

    @Test
    @DisplayName("POST /reset-password with validation errors returns form")
    void postResetPassword_validationErrors() throws Exception {
        // too short password
        mockMvc.perform(post("/reset-password")
                        .param("token", "t")
                        .param("password", "short")
                        .param("confirmPassword", "short"))
                .andExpect(status().isOk())
                .andExpect(view().name("reset-password"))
                .andExpect(model().attributeHasFieldErrors("resetPasswordRequest", "password"));
    }

    @Test
    @DisplayName("POST /reset-password with mismatch returns form error")
    void postResetPassword_mismatch() throws Exception {
        mockMvc.perform(post("/reset-password")
                        .param("token", "t")
                        .param("password", "password123")
                        .param("confirmPassword", "password456"))
                .andExpect(status().isOk())
                .andExpect(view().name("reset-password"))
                .andExpect(model().attributeHasFieldErrors("resetPasswordRequest", "confirmPassword"));
    }

    @Test
    @DisplayName("POST /reset-password service failure redirects to /forgot-password with error")
    void postResetPassword_serviceFailure() throws Exception {
        when(passwordResetService.resetPassword("t", "password123")).thenReturn(false);
        when(localeMessageService.getLocalMessage(eq("password.reset.failed"))).thenReturn("failed");

        mockMvc.perform(post("/reset-password")
                        .param("token", "t")
                        .param("password", "password123")
                        .param("confirmPassword", "password123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/forgot-password"))
                .andExpect(flash().attribute("error", "failed"));
    }

    @Test
    @DisplayName("POST /reset-password success redirects to /login with success")
    void postResetPassword_success() throws Exception {
        when(passwordResetService.resetPassword("t", "password123")).thenReturn(true);
        when(localeMessageService.getLocalMessage(eq("password.reset.success"))).thenReturn("ok");

        mockMvc.perform(post("/reset-password")
                        .param("token", "t")
                        .param("password", "password123")
                        .param("confirmPassword", "password123"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/login"))
                .andExpect(flash().attribute("success", "ok"));
    }
}
