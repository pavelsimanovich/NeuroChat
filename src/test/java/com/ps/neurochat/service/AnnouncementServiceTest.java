package com.ps.neurochat.service;

import com.ps.neurochat.domain.Announcement;
import com.ps.neurochat.dto.AnnouncementDto;
import com.ps.neurochat.repository.AnnouncementRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnnouncementServiceTest {

    @Mock
    private AnnouncementRepository repository;

    @InjectMocks
    private AnnouncementService service;

    @Test
    @DisplayName("getActiveAnnouncements maps entities to DTOs")
    void getActiveAnnouncements() {
        Announcement a = new Announcement();
        a.setId(1L);
        a.setTitle("t");
        when(repository.findActiveAnnouncements(any(LocalDateTime.class))).thenReturn(List.of(a));

        List<AnnouncementDto> dtos = service.getActiveAnnouncements();

        assertThat(dtos).hasSize(1);
        assertThat(dtos.get(0).getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getAnnouncement returns DTO or throws when missing")
    void getAnnouncement() {
        Announcement a = new Announcement();
        a.setId(5L);
        a.setTitle("hello");
        when(repository.findById(5L)).thenReturn(Optional.of(a));

        AnnouncementDto dto = service.getAnnouncement(5L);
        assertThat(dto.getId()).isEqualTo(5L);

        when(repository.findById(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getAnnouncement(7L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("7");
    }

    @Test
    @DisplayName("createAnnouncement saves and returns DTO")
    void createAnnouncement() {
        AnnouncementDto dto = new AnnouncementDto();
        dto.setTitle("title");
        Announcement saved = dto.toEntity();
        saved.setId(10L);
        when(repository.save(any())).thenReturn(saved);

        AnnouncementDto out = service.createAnnouncement(dto);
        assertThat(out.getId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("updateAnnouncement updates existing or throws")
    void updateAnnouncement() {
        Announcement existing = new Announcement();
        existing.setId(2L);
        existing.setTitle("old");
        when(repository.findById(2L)).thenReturn(Optional.of(existing));
        when(repository.save(existing)).thenReturn(existing);

        AnnouncementDto dto = new AnnouncementDto();
        dto.setTitle("new");
        AnnouncementDto updated = service.updateAnnouncement(2L, dto);
        assertThat(updated.getTitle()).isEqualTo("new");

        when(repository.findById(3L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.updateAnnouncement(3L, dto))
                .isInstanceOf(RuntimeException.class);
    }
}
