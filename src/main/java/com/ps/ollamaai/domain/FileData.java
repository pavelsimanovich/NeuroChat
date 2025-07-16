package com.ps.ollamaai.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "file_data")
public class FileData {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private String id;
    
    @Column(name = "file_name", nullable = false)
    private String fileName;
    
    @Column(name = "content_type", nullable = false)
    private String contentType;
    
    @Lob
    @Column(nullable = false, columnDefinition = "LONGBLOB")
    private byte[] data;
    
    @Column(nullable = false)
    private Long size;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Version
    private Long version = 0L;
}
