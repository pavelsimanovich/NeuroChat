package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.User;
import com.ps.ollamaai.dto.AdminUserDto;
import com.ps.ollamaai.dto.UserPreferencesDTO;
import com.ps.ollamaai.service.UserPreferencesService;
import com.ps.ollamaai.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminApiControllerTest {

    @Mock private UserService userService;
    @Mock private UserPreferencesService userPreferencesService;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        AdminApiController controller = new AdminApiController(userService, userPreferencesService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("GET /api/admin/users lists users or search results")
    void listUsers() throws Exception {
        User u = new User(); u.setEmail("a@b.c"); u.setFirstName("A"); u.setLastName("B");
        when(userService.findAll()).thenReturn(List.of(u));
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk());

        when(userService.search("q")).thenReturn(List.of(u));
        mockMvc.perform(get("/api/admin/users").param("q", "q"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/admin/users/stats returns stats map")
    void userStats() throws Exception {
        when(userService.getUserStats()).thenReturn(Map.of("total", 1));
        mockMvc.perform(get("/api/admin/users/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    @DisplayName("POST /api/admin/users/{id}/role updates role")
    void changeRole() throws Exception {
        mockMvc.perform(post("/api/admin/users/{id}/role", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk());
        verify(userService).setRole("1", "ADMIN");
    }

    @Test
    @DisplayName("POST /api/admin/users/{id}/enable toggles enabled")
    void setEnabled() throws Exception {
        mockMvc.perform(post("/api/admin/users/{id}/enable", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":true}"))
                .andExpect(status().isOk());
        verify(userService).setEnabled("1", true);
    }

    @Test
    @DisplayName("GET /api/admin/users/{id}/quota returns 404 when user missing else quota info")
    void getQuota() throws Exception {
        when(userService.findById("x")).thenReturn(null);
        mockMvc.perform(get("/api/admin/users/{id}/quota", "x"))
                .andExpect(status().isNotFound());

        User u = new User(); u.setId("1"); u.setEmail("user@example.com");
        when(userService.findById("1")).thenReturn(u);
        UserPreferencesDTO dto = new UserPreferencesDTO();
        dto.setMonthlyTokenLimit(1000);
        dto.setTokenUsedInPeriod(10L);
        dto.setPeriodStart(LocalDateTime.now());
        when(userPreferencesService.getUserPreferencesOrDefault("user@example.com")).thenReturn(dto);

        mockMvc.perform(get("/api/admin/users/{id}/quota", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlyTokenLimit").value(1000));
    }

    @Test
    @DisplayName("POST /api/admin/users/{id}/quota parses value and sets limit")
    void setQuota() throws Exception {
        User u = new User(); u.setId("1"); u.setEmail("user@example.com");
        when(userService.findById("1")).thenReturn(u);

        mockMvc.perform(post("/api/admin/users/{id}/quota", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"monthlyTokenLimit\": 500}"))
                .andExpect(status().isOk());
        verify(userPreferencesService).setMonthlyLimit("user@example.com", 500);

        mockMvc.perform(post("/api/admin/users/{id}/quota", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"monthlyTokenLimit\": \"750\"}"))
                .andExpect(status().isOk());
        verify(userPreferencesService).setMonthlyLimit("user@example.com", 750);
    }

    @Test
    @DisplayName("POST /api/admin/users/{id}/quota/reset resets quota or 404 if user missing")
    void resetQuota() throws Exception {
        when(userService.findById("x")).thenReturn(null);
        mockMvc.perform(post("/api/admin/users/{id}/quota/reset", "x"))
                .andExpect(status().isNotFound());

        User u = new User(); u.setId("1"); u.setEmail("user@example.com");
        when(userService.findById("1")).thenReturn(u);
        mockMvc.perform(post("/api/admin/users/{id}/quota/reset", "1"))
                .andExpect(status().isOk());
        verify(userPreferencesService).resetQuotaPeriod("user@example.com");
    }
}
