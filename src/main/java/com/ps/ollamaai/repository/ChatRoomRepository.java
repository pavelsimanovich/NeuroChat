package com.ps.ollamaai.repository;

import com.ps.ollamaai.domain.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, String> {
    List<ChatRoom> findByUserId(String userId);

    @Modifying
    @Query("update ChatRoom cr set cr.active = false where cr.id = :roomId")
    void setInactiveRoom(@Param("roomId") String roomId);
}
