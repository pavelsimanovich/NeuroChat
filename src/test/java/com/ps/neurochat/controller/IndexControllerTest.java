package com.ps.neurochat.controller;

import com.ps.neurochat.domain.User;
import com.ps.neurochat.domain.UserPreferencies;
import com.ps.neurochat.service.OllamaService;
import com.ps.neurochat.service.UserPreferencesService;
import com.ps.neurochat.service.UserService;
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
import org.springframework.web.servlet.view.InternalResourceViewResolver;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class IndexControllerTest {

    @Mock private UserService userService;
    @Mock private OllamaService ollamaService;
    @Mock private UserPreferencesService userPreferencesService;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        IndexController controller = new IndexController(userService, ollamaService, userPreferencesService);
        InternalResourceViewResolver viewResolver = new InternalResourceViewResolver();
        viewResolver.setPrefix("/WEB-INF/views/");
        viewResolver.setSuffix(".jsp");
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setViewResolvers(viewResolver)
                .setCustomArgumentResolvers(new AuthPrincipalResolver("user@example.com"))
                .build();
    }

    @Test
    @DisplayName("GET / and /index return index view")
    void rootAndIndex() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(view().name("index"));
        mockMvc.perform(get("/index"))
                .andExpect(status().isOk())
                .andExpect(view().name("index"));
    }

    @Test
    @DisplayName("GET /home populates model and returns home view")
    void home() throws Exception {
        User u = new User(); u.setId("u1"); u.setFirstName("Ivan"); u.setLastName("Petrov");
        when(userService.findByEmail("user@example.com")).thenReturn(u);
        when(ollamaService.getCurrentModelName()).thenReturn("llama3");
        when(userPreferencesService.findByUserId("user@example.com")).thenReturn(Optional.of(new UserPreferencies()));

        mockMvc.perform(get("/home"))
                .andExpect(status().isOk())
                .andExpect(view().name("home"))
                .andExpect(model().attributeExists("modelName", "userId", "userName", "userAvatarUrl", "supportedModels"));
    }

    @Test
    @DisplayName("GET /admin returns admin view")
    void admin() throws Exception {
        mockMvc.perform(get("/admin"))
                .andExpect(status().isOk())
                .andExpect(view().name("admin"));
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
