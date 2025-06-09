package com.ps.ollamaai.repository;

import com.ps.ollamaai.domain.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, String> {
    List<ChatRoom> findByUserId(String userId);

    @Query("SELECT cr FROM ChatRoom cr LEFT JOIN FETCH cr.messages WHERE cr.id = :roomId")
    Optional<ChatRoom> findByIdWithMessages(@Param("roomId") String roomId);
}
