package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.Announcement;
import com.ps.ollamaai.dto.AnnouncementDto;
import com.ps.ollamaai.repository.AnnouncementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;

    public List<AnnouncementDto> getActiveAnnouncements() {
        return announcementRepository.findActiveAnnouncements(LocalDateTime.now())
                .stream()
                .map(AnnouncementDto::from)
                .toList();
    }

    public List<AnnouncementDto> getAllAnnouncements() {
        return announcementRepository.findAllByOrderByStartDateDesc()
                .stream()
                .map(AnnouncementDto::from)
                .toList();
    }

    public AnnouncementDto getAnnouncement(Long id) {
        return announcementRepository.findById(id)
                .map(AnnouncementDto::from)
                .orElseThrow(() -> new RuntimeException("Announcement not found with id: " + id));
    }

    @Transactional
    public AnnouncementDto createAnnouncement(AnnouncementDto dto) {
        Announcement announcement = dto.toEntity();
        return AnnouncementDto.from(announcementRepository.save(announcement));
    }

    @Transactional
    public AnnouncementDto updateAnnouncement(Long id, AnnouncementDto dto) {
        return announcementRepository.findById(id)
                .map(existing -> {
                    existing.setTitle(dto.getTitle());
                    existing.setContent(dto.getContent());
                    existing.setActive(dto.isActive());
                    existing.setStartDate(dto.getStartDate());
                    existing.setEndDate(dto.getEndDate());
                    return AnnouncementDto.from(announcementRepository.save(existing));
                })
                .orElseThrow(() -> new RuntimeException("Announcement not found with id: " + id));
    }

    @Transactional
    public void deleteAnnouncement(Long id) {
        announcementRepository.deleteById(id);
    }
}
