package com.ps.neurochat.dto;

import com.ps.neurochat.domain.Announcement;
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
    private String imageUrl;
    private boolean isAd;
    private String adTargetUrl;

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
                .imageUrl(announcement.getImageUrl())
                .isAd(announcement.isAd())
                .adTargetUrl(announcement.getAdTargetUrl())
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
                .imageUrl(this.imageUrl)
                .isAd(this.isAd)
                .adTargetUrl(this.adTargetUrl)
                .build();
    }
}
