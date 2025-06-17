package com.ps.ollamaai.service;

import com.ps.ollamaai.llm.history.HistoryEntry;
import com.ps.ollamaai.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor(onConstructor = @__(@Autowired))
public class HistoryEntryService {

    private final ChatMessageRepository messageRepository;

    public List<HistoryEntry> getRoomHistory(final String roomId) {
        return messageRepository.findHistoryByRoomId(roomId);
    }
}
