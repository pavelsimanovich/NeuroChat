package com.ps.ollamaai.domain;

import com.ps.ollamaai.dto.enums.AiRole;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

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
    private String userSystemPrompt;
    @Enumerated(EnumType.STRING)
    private AiRole aiRole;
}
