package com.ps.ollamaai.repository;

import com.ps.ollamaai.domain.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    
    @Query("SELECT a FROM Announcement a WHERE a.active = true " +
           "AND (a.startDate IS NULL OR a.startDate <= :now) " +
           "AND (a.endDate IS NULL OR a.endDate >= :now) " +
           "ORDER BY a.startDate DESC")
    List<Announcement> findActiveAnnouncements(@Param("now") LocalDateTime now);
    
    List<Announcement> findAllByOrderByStartDateDesc();
}
