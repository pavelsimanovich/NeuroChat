package com.ps.neurochat.repository;

import com.ps.neurochat.domain.UserPreferencies;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserPreferenciesRepository extends JpaRepository<UserPreferencies, String> {

    Optional<UserPreferencies> findByUserName(String userId);

}
