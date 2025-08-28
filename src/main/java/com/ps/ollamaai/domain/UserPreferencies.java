package com.ps.ollamaai.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "user_preferencies")
public class UserPreferencies implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private String userId;
    private String language;
    @Column(columnDefinition = "TEXT")
    private String userSystemPrompt;
    private String model;
    // ID загруженного файла-аватара (из таблицы file_data)
    private String avatarFileId;

    // Token usage controls
    // Monthly quota in tokens (approx). Null or 0 means unlimited.
    private Integer monthlyTokenLimit;
    // Tokens used in the current period (approx tokens). Reset when periodStart changes.
    @Column(name = "token_used_in_period")
    private Long tokenUsedInPeriod;
    // When the current counting period started. If null, will be initialized on first use.
    private LocalDateTime periodStart;
}
