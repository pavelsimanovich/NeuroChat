package com.ps.ollamaai.repository;

import com.ps.ollamaai.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);

    List<User> findByEmailContainingIgnoreCaseOrFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
            String email, String firstName, String lastName);

    long countByEnabled(boolean enabled);

    long countByRole(String role);

    long countByCreatedAtAfter(LocalDateTime createdAt);
}
