package com.ps.neurochat.repository;

import com.ps.neurochat.domain.ChatMessage;
import com.ps.neurochat.llm.history.HistoryEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {
    List<ChatMessage> findByRoomIdOrderByTimestampAsc(String roomId);

    @Modifying
    @Query("DELETE FROM ChatMessage cm WHERE cm.room.id = :roomId")
    void deleteByRoomId(@Param("roomId") String roomId);

    @Query("SELECT MAX(m.order) FROM ChatMessage m WHERE m.room.id = :roomId")
    Optional<Long> findLastOrderByRoomId(@Param("roomId") String roomId);

    @Query("""
        SELECT new com.ps.neurochat.llm.history.HistoryEntry (
            q.content as prompt,
            a.content as response
        )
        FROM ChatMessage q
        LEFT JOIN ChatMessage a ON 
            a.room.id = q.room.id AND 
            a.type = 'AI_RESPONSE' AND 
            a.order = q.order + 1
        WHERE 
            q.type = 'USER_MESSAGE' AND
            a.content is not null AND        
            q.room.id = :roomId          
        ORDER BY q.timestamp ASC 
        """)
    List<HistoryEntry> findHistoryByRoomId(@Param("roomId") String roomId);

    @Query("""
        SELECT q FROM ChatMessage q
        WHERE q.content LIKE %:query% AND q.room.id = :roomId
        ORDER BY q.timestamp ASC
        """)
    List<ChatMessage> searchMessages(@Param("roomId") String roomId, @Param("query") String query);

    long countByFileDataId(String fileDataId);
}
