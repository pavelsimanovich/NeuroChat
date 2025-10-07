package com.ps.neurochat.controller;

import com.ps.neurochat.domain.User;
import com.ps.neurochat.service.LocaleMessageService;
import com.ps.neurochat.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.view.InternalResourceViewResolver;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock private UserService userService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private LocaleMessageService localeMessageService;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        UserController controller = new UserController(userService, passwordEncoder, localeMessageService);
        InternalResourceViewResolver viewResolver = new InternalResourceViewResolver();
        viewResolver.setPrefix("/WEB-INF/views/");
        viewResolver.setSuffix(".jsp");
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setViewResolvers(viewResolver)
                .setCustomArgumentResolvers(new AuthPrincipalResolver("user@example.com"))
                .build();
        lenient().when(localeMessageService.getLocalMessage(anyString())).thenReturn("msg");
    }

    @Test
    @DisplayName("GET /registration returns registration view")
    void registration() throws Exception {
        mockMvc.perform(get("/registration"))
                .andExpect(status().isOk())
                .andExpect(view().name("registration"))
                .andExpect(model().attributeExists("registrationRequest"));
    }

    @Test
    @DisplayName("POST /saveUser with password mismatch returns registration view with errors")
    void saveUser_mismatch() throws Exception {
        mockMvc.perform(post("/saveUser")
                        .param("email", "a@b.c")
                        .param("password", "password123")
                        .param("confirmPassword", "x"))
                .andExpect(status().isOk())
                .andExpect(view().name("registration"));
    }

    @Test
    @DisplayName("POST /saveUser when email exists returns registration view with errors")
    void saveUser_emailExists() throws Exception {
        when(userService.findByEmail("a@b.c")).thenReturn(new User());
        mockMvc.perform(post("/saveUser")
                        .param("email", "a@b.c")
                        .param("password", "password123")
                        .param("confirmPassword", "password123"))
                .andExpect(status().isOk())
                .andExpect(view().name("registration"));
    }

    @Test
    @DisplayName("POST /saveUser success returns index view")
    void saveUser_success() throws Exception {
        when(userService.findByEmail("a@b.c")).thenReturn(null);
        mockMvc.perform(post("/saveUser")
                        .param("email", "a@b.c")
                        .param("password", "password123")
                        .param("confirmPassword", "password123")
                        .param("firstName", "Ivan")
                        .param("lastName", "Petrov"))
                .andExpect(status().isOk())
                .andExpect(view().name("index"));
    }

    @Test
    @DisplayName("POST /api/user/change-password validates request and updates user")
    void changePassword_flow() throws Exception {
        // invalid payload
        mockMvc.perform(post("/api/user/change-password"))
                .andExpect(status().isBadRequest());

        // mismatch
        mockMvc.perform(post("/api/user/change-password")
                        .contentType("application/json")
                        .content("{\"currentPassword\":\"old\",\"newPassword\":\"p1\",\"confirmPassword\":\"p2\"}"))
                .andExpect(status().isBadRequest());

        // too short
        mockMvc.perform(post("/api/user/change-password")
                        .contentType("application/json")
                        .content("{\"currentPassword\":\"old\",\"newPassword\":\"short\",\"confirmPassword\":\"short\"}"))
                .andExpect(status().isBadRequest());

        // user not found
        when(userService.findByEmail("user@example.com")).thenReturn(null);
        mockMvc.perform(post("/api/user/change-password")
                        .contentType("application/json")
                        .content("{\"currentPassword\":\"old\",\"newPassword\":\"password123\",\"confirmPassword\":\"password123\"}"))
                .andExpect(status().isNotFound());

        // invalid current password
        User u = new User(); u.setEmail("user@example.com"); u.setPassword("ENC");
        when(userService.findByEmail("user@example.com")).thenReturn(u);
        when(passwordEncoder.matches("old", "ENC")).thenReturn(false);
        mockMvc.perform(post("/api/user/change-password")
                        .contentType("application/json")
                        .content("{\"currentPassword\":\"old\",\"newPassword\":\"password123\",\"confirmPassword\":\"password123\"}"))
                .andExpect(status().isBadRequest());

        // success
        when(passwordEncoder.matches("old", "ENC")).thenReturn(true);
        mockMvc.perform(post("/api/user/change-password")
                        .contentType("application/json")
                        .content("{\"currentPassword\":\"old\",\"newPassword\":\"password123\",\"confirmPassword\":\"password123\"}"))
                .andExpect(status().isOk());
    }

    private static class AuthPrincipalResolver implements HandlerMethodArgumentResolver {
        private final String username;
        AuthPrincipalResolver(String username) { this.username = username; }
        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return UserDetails.class.isAssignableFrom(parameter.getParameterType());
        }
        @Override
        public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                      NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
            return new UserDetails() {
                @Override public java.util.Collection<org.springframework.security.core.GrantedAuthority> getAuthorities() { return java.util.List.of(); }
                @Override public String getPassword() { return ""; }
                @Override public String getUsername() { return username; }
                @Override public boolean isAccountNonExpired() { return true; }
                @Override public boolean isAccountNonLocked() { return true; }
                @Override public boolean isCredentialsNonExpired() { return true; }
                @Override public boolean isEnabled() { return true; }
            };
        }
    }
}
