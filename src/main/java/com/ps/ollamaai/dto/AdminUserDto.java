package com.ps.ollamaai.dto;

import com.ps.ollamaai.domain.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserDto {
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private boolean enabled;
    private LocalDateTime createdAt;

    public static AdminUserDto from(User u) {
        return new AdminUserDto(
                u.getId(),
                u.getEmail(),
                u.getFirstName(),
                u.getLastName(),
                u.getRole(),
                u.isEnabled(),
                u.getCreatedAt()
        );
    }
}
