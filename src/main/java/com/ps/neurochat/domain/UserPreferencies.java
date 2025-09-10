package com.ps.neurochat.domain;

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
    @Column(name = "user_id")
    private String userName;
    private String language;
    @Column(columnDefinition = "TEXT")
    private String userSystemPrompt;
    private String model;
    private String avatarFileId;

    // TTS preferences
    @Column(name = "tts_speak_while_generating")
    private Boolean ttsSpeakWhileGenerating;

    // Token usage controls
    // Monthly quota in tokens (approx). Null or 0 means unlimited.
    private Integer monthlyTokenLimit;
    // Tokens used in the current period (approx tokens). Reset when periodStart changes.
    @Column(name = "token_used_in_period")
    private Long tokenUsedInPeriod;
    // When the current counting period started. If null, will be initialized on first use.
    private LocalDateTime periodStart;
}
