package com.ps.ollamaai.service;

import com.ps.ollamaai.llm.history.HistoryEntry;
import com.ps.ollamaai.repository.ChatMessageRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HistoryEntryServiceTest {

    @Mock private ChatMessageRepository messageRepository;
    @InjectMocks private HistoryEntryService service;

    @Test
    @DisplayName("getRoomHistory delegates to repository")
    void getRoomHistory() {
        HistoryEntry e = new HistoryEntry("p", "r");
        when(messageRepository.findHistoryByRoomId("room")).thenReturn(List.of(e));

        List<HistoryEntry> out = service.getRoomHistory("room");
        assertThat(out).hasSize(1);
        verify(messageRepository).findHistoryByRoomId("room");
    }
}
