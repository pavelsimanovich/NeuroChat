package com.ps.ollamaai.repository;

import com.ps.ollamaai.domain.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, String> {
    List<ChatRoom> findByUserId(String userId);
}
