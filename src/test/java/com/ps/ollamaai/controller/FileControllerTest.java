package com.ps.ollamaai.controller;

import com.ps.ollamaai.domain.FileData;
import com.ps.ollamaai.dto.FileDataDto;
import com.ps.ollamaai.dto.converter.FileDataToDtoConverter;
import com.ps.ollamaai.service.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class FileControllerTest {

    @Mock private FileStorageService fileStorageService;
    @Mock private FileDataToDtoConverter converter;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        FileController controller = new FileController(fileStorageService, converter);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("POST /api/files/upload uploads file and returns DTO")
    void upload() throws Exception {
        MockMultipartFile part = new MockMultipartFile("file", "a.txt", "text/plain", "hello".getBytes());
        FileData entity = new FileData(); entity.setId("f1"); entity.setFileName("a.txt"); entity.setContentType("text/plain"); entity.setData("hello".getBytes()); entity.setSize(5L);
        when(fileStorageService.storeFile(any())).thenReturn(entity);
        FileDataDto dto = new FileDataDto(); dto.setId("f1"); dto.setFileName("a.txt");
        when(converter.convertToDto(entity)).thenReturn(dto);

        mockMvc.perform(multipart("/api/files/upload").file(part))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("f1"));
    }

    @Test
    @DisplayName("GET /api/files/{id} returns attachment")
    void download() throws Exception {
        FileData entity = new FileData(); entity.setId("f1"); entity.setFileName("a.txt"); entity.setContentType("text/plain"); entity.setData("hello".getBytes()); entity.setSize(5L);
        when(fileStorageService.getFile("f1")).thenReturn(entity);

        mockMvc.perform(get("/api/files/{id}", "f1"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "text/plain"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")));
    }

    @Test
    @DisplayName("GET /api/files/{id}/preview returns image when content-type image/*")
    void preview_ok() throws Exception {
        FileData img = new FileData(); img.setId("img1"); img.setFileName("i.jpg"); img.setContentType("image/jpeg"); img.setData(new byte[]{1,2});
        when(fileStorageService.getFile("img1")).thenReturn(img);

        mockMvc.perform(get("/api/files/{id}/preview", "img1"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/jpeg"));
    }

    @Test
    @DisplayName("GET /api/files/{id}/preview returns 400 for non-image files")
    void preview_bad() throws Exception {
        FileData txt = new FileData(); txt.setId("t1"); txt.setFileName("t.txt"); txt.setContentType("text/plain"); txt.setData("hello".getBytes());
        when(fileStorageService.getFile("t1")).thenReturn(txt);

        mockMvc.perform(get("/api/files/{id}/preview", "t1"))
                .andExpect(status().isBadRequest());
    }
}
