package com.ps.ollamaai.controller;

import com.ps.ollamaai.dto.ChatMessageDto;
import com.ps.ollamaai.dto.ChatRoomDto;
import com.ps.ollamaai.service.ChatMessageService;
import com.ps.ollamaai.service.ChatRoomService;
import com.ps.ollamaai.service.OllamaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ChatRoomApiControllerTest {

    @Mock private ChatRoomService chatRoomService;
    @Mock private ChatMessageService chatMessageService;
    @Mock private OllamaService ollamaService;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        ChatRoomApiController controller = new ChatRoomApiController(chatRoomService, chatMessageService, ollamaService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("GET /api/chat/rooms returns user rooms")
    void getRooms() throws Exception {
        ChatRoomDto dto = new ChatRoomDto(); dto.setId("r1"); dto.setTitle("t"); dto.setActive(true);
        when(chatRoomService.getUserRooms("u")).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/chat/rooms").param("userId", "u"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("r1"));
    }

    @Test
    @DisplayName("GET /api/chat/rooms/{roomId}/messages returns messages")
    void getMessages() throws Exception {
        ChatMessageDto m = new ChatMessageDto(); m.setContent("hi");
        when(chatMessageService.getRoomMessages("r1")).thenReturn(List.of(m));

        mockMvc.perform(get("/api/chat/rooms/{roomId}/messages", "r1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("hi"));
    }

    @Test
    @DisplayName("GET /api/chat/messages/search returns search results")
    void searchMessages() throws Exception {
        ChatMessageDto m = new ChatMessageDto(); m.setContent("hello");
        when(chatMessageService.searchMessages("r1", "q")).thenReturn(List.of(m));

        mockMvc.perform(get("/api/chat/messages/search").param("roomId", "r1").param("query", "q"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("hello"));
    }

    @Test
    @DisplayName("POST /api/chat/rooms/{roomId}/rename returns 204")
    void renameRoom() throws Exception {
        ChatRoomDto dto = new ChatRoomDto(); dto.setId("r1"); dto.setTitle("new");
        when(chatRoomService.renameRoom("r1", "new")).thenReturn(dto);
        mockMvc.perform(post("/api/chat/rooms/{roomId}/rename", "r1").param("title", "new"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("GET /api/chat/rooms/{roomId}/export returns text/plain resource")
    void exportRoom() throws Exception {
        when(chatMessageService.formatChatForExport("r1")).thenReturn("export text");
        mockMvc.perform(get("/api/chat/rooms/{roomId}/export", "r1"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.startsWith(MediaType.TEXT_PLAIN_VALUE)));
    }
}
