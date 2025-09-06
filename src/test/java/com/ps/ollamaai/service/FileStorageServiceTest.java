package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.FileData;
import com.ps.ollamaai.repository.FileDataRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileStorageServiceTest {

    @Mock private FileDataRepository repository;
    @InjectMocks private FileStorageService service;

    @Test
    @DisplayName("storeFile throws on null or empty file")
    void storeFile_invalid() {
        assertThatThrownBy(() -> service.storeFile(null)).isInstanceOf(IllegalArgumentException.class);
        MultipartFile empty = mock(MultipartFile.class);
        when(empty.isEmpty()).thenReturn(true);
        assertThatThrownBy(() -> service.storeFile(empty)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("storeFile saves metadata and bytes")
    void storeFile_success() throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("doc.txt");
        when(file.getContentType()).thenReturn("text/plain");
        when(file.getBytes()).thenReturn("hello".getBytes());
        when(file.getSize()).thenReturn(5L);

        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FileData out = service.storeFile(file);
        assertThat(out.getFileName()).isEqualTo("doc.txt");
        assertThat(out.getContentType()).isEqualTo("text/plain");
        assertThat(out.getSize()).isEqualTo(5L);
        assertThat(out.getData()).isNotNull();
    }

    @Test
    @DisplayName("getFile returns entity or throws when missing")
    void getFile() {
        FileData fd = new FileData(); fd.setId("f1");
        when(repository.findById("f1")).thenReturn(java.util.Optional.of(fd));
        assertThat(service.getFile("f1").getId()).isEqualTo("f1");

        when(repository.findById("x")).thenReturn(java.util.Optional.empty());
        assertThatThrownBy(() -> service.getFile("x")).isInstanceOf(RuntimeException.class);
    }
}
