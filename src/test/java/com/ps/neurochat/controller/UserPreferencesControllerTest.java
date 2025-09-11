package com.ps.neurochat.controller;

import com.ps.neurochat.dto.UserPreferencesDTO;
import com.ps.neurochat.service.UserPreferencesService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.core.MethodParameter;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.method.support.ModelAndViewContainer;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserPreferencesControllerTest {

    @Mock private UserPreferencesService service;
    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        UserPreferencesController controller = new UserPreferencesController(service);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthPrincipalResolver("user@example.com"))
                .build();
    }

    @Test
    @DisplayName("GET /api/user/preferences returns preferences for current user")
    void getPrefs() throws Exception {
        UserPreferencesDTO dto = new UserPreferencesDTO(); dto.setLanguage("en");
        when(service.getUserPreferencesOrDefault("user@example.com")).thenReturn(dto);
        mockMvc.perform(get("/api/user/preferences"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("en"));
    }

    @Test
    @DisplayName("POST /api/user/preferences saves preferences for current user")
    void savePrefs() throws Exception {
        UserPreferencesDTO dto = new UserPreferencesDTO(); dto.setLanguage("ru");
        when(service.createOrUpdatePreferences(org.mockito.ArgumentMatchers.eq("user@example.com"), org.mockito.ArgumentMatchers.any())).thenReturn(dto);
        mockMvc.perform(post("/api/user/preferences")
                        .contentType("application/json")
                        .content("{\"language\":\"ru\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.language").value("ru"));
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
