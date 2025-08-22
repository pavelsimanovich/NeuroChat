package com.ps.ollamaai.dto;

import com.ps.ollamaai.domain.Announcement;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnnouncementDto {
    private Long id;
    private String title;
    private String content;
    private boolean active;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AnnouncementDto from(Announcement announcement) {
        return AnnouncementDto.builder()
                .id(announcement.getId())
                .title(announcement.getTitle())
                .content(announcement.getContent())
                .active(announcement.isActive())
                .startDate(announcement.getStartDate())
                .endDate(announcement.getEndDate())
                .createdAt(announcement.getCreatedAt())
                .updatedAt(announcement.getUpdatedAt())
                .build();
    }

    public Announcement toEntity() {
        return Announcement.builder()
                .id(this.id)
                .title(this.title)
                .content(this.content)
                .active(this.active)
                .startDate(this.startDate)
                .endDate(this.endDate)
                .build();
    }
}
