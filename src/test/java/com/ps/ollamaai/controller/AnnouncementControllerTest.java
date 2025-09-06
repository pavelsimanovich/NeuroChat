package com.ps.ollamaai.controller;

import com.ps.ollamaai.dto.AnnouncementDto;
import com.ps.ollamaai.service.AnnouncementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AnnouncementControllerTest {

    @Mock private AnnouncementService service;
    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        AnnouncementController controller = new AnnouncementController(service);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("GET /api/announcements returns active announcements")
    void getActive() throws Exception {
        AnnouncementDto dto = new AnnouncementDto(); dto.setId(1L); dto.setTitle("t");
        when(service.getActiveAnnouncements()).thenReturn(List.of(dto));
        mockMvc.perform(get("/api/announcements"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    @DisplayName("GET /api/announcements/all returns all announcements")
    void getAll() throws Exception {
        when(service.getAllAnnouncements()).thenReturn(List.of());
        mockMvc.perform(get("/api/announcements/all"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/announcements/{id} returns one")
    void getOne() throws Exception {
        AnnouncementDto dto = new AnnouncementDto(); dto.setId(7L);
        when(service.getAnnouncement(7L)).thenReturn(dto);
        mockMvc.perform(get("/api/announcements/{id}", 7))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7));
    }

    @Test
    @DisplayName("POST /api/announcements creates an announcement")
    void create() throws Exception {
        AnnouncementDto dto = new AnnouncementDto(); dto.setId(2L);
        when(service.createAnnouncement(any())).thenReturn(dto);
        mockMvc.perform(post("/api/announcements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"t\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2));
    }

    @Test
    @DisplayName("PUT /api/announcements/{id} updates an announcement")
    void update() throws Exception {
        AnnouncementDto dto = new AnnouncementDto(); dto.setId(3L); dto.setTitle("new");
        when(service.updateAnnouncement(3L, dto)).thenReturn(dto);
        mockMvc.perform(put("/api/announcements/{id}", 3)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":3,\"title\":\"new\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("new"));
    }

    @Test
    @DisplayName("DELETE /api/announcements/{id} returns 204")
    void deleteOne() throws Exception {
        mockMvc.perform(delete("/api/announcements/{id}", 9))
                .andExpect(status().isNoContent());
    }
}
