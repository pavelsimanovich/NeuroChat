package com.ps.ollamaai.service;

import com.ps.ollamaai.domain.ChatMessage;
import com.ps.ollamaai.domain.ChatRoom;
import com.ps.ollamaai.dto.ChatRoomDto;
import com.ps.ollamaai.dto.converter.ChatRoomToDtoConverter;
import com.ps.ollamaai.repository.ChatMessageRepository;
import com.ps.ollamaai.repository.ChatRoomRepository;
import com.ps.ollamaai.repository.FileDataRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatRoomServiceTest {

    @Mock private ChatRoomRepository chatRoomRepository;
    @Mock private ChatMessageRepository chatMessageRepository;
    @Mock private ChatRoomToDtoConverter chatRoomToDtoConverter;
    @Mock private ChatMessageService chatMessageService;
    @Mock private FileDataRepository fileDataRepository;
    @Mock private EntityManager entityManager;

    @InjectMocks private ChatRoomService service;

    @org.junit.jupiter.api.BeforeEach
    void initEntityManager() throws Exception {
        Field f = ChatRoomService.class.getDeclaredField("entityManager");
        f.setAccessible(true);
        f.set(service, entityManager);
    }

    @Test
    @DisplayName("createRoom saves and returns DTO")
    void createRoom() {
        ChatRoom room = new ChatRoom(); room.setId("r1"); room.setTitle("t");
        when(chatRoomRepository.save(any())).thenReturn(room);
        ChatRoomDto dtoOut = new ChatRoomDto();
        dtoOut.setId("r1");
        dtoOut.setTitle("t");
        dtoOut.setActive(true);
        when(chatRoomToDtoConverter.convert(room)).thenReturn(dtoOut);

        ChatRoomDto dto = service.createRoom("u", "t");
        assertThat(dto.getId()).isEqualTo("r1");
    }

    @Test
    @DisplayName("getUserRooms maps rooms to DTOs")
    void getUserRooms() {
        ChatRoom room = new ChatRoom(); room.setId("r1"); room.setTitle("t");
        when(chatRoomRepository.findByUserId("u")).thenReturn(List.of(room));
        ChatRoomDto dto = new ChatRoomDto();
        dto.setId("r1");
        dto.setTitle("t");
        dto.setActive(true);
        when(chatRoomToDtoConverter.convert(room)).thenReturn(dto);

        List<ChatRoomDto> out = service.getUserRooms("u");
        assertThat(out).hasSize(1);
    }

    @Test
    @DisplayName("renameRoom updates title or throws when missing")
    void renameRoom() {
        ChatRoom room = new ChatRoom(); room.setId("r1"); room.setTitle("old");
        when(chatRoomRepository.findById("r1")).thenReturn(Optional.of(room));
        ChatRoomDto renamed = new ChatRoomDto();
        renamed.setId("r1");
        renamed.setTitle("new");
        renamed.setActive(true);
        when(chatRoomToDtoConverter.convert(room)).thenReturn(renamed);

        ChatRoomDto dto = service.renameRoom("r1", "new");
        assertThat(dto.getTitle()).isEqualTo("new");

        when(chatRoomRepository.findById("x")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.renameRoom("x", "n")).isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    @DisplayName("deleteRoom validates ownership and deletes associated data")
    void deleteRoom_flow() {
        String roomId = "r1";
        ChatRoom room = new ChatRoom(); room.setId(roomId); room.setUserId("u1");
        ChatMessage m1 = new ChatMessage(); m1.setRoom(room);
        List<ChatMessage> messages = new ArrayList<>();
        m1.setFileData(null); // no file
        messages.add(m1);
        room.setMessages(messages);

        when(chatRoomRepository.findById(roomId)).thenReturn(Optional.of(room));
        when(chatMessageRepository.findByRoomIdOrderByTimestampAsc(roomId)).thenReturn(List.of(m1));

        service.deleteRoom(roomId, "u1");

        verify(chatMessageRepository).deleteAll(anyList());
        verify(chatMessageService).deleteConversationHistory(roomId);
        verify(chatRoomRepository).deleteById(roomId);
    }

    @Test
    @DisplayName("deleteRoom throws AccessDenied when another user tries to delete")
    void deleteRoom_accessDenied() {
        ChatRoom room = new ChatRoom(); room.setId("r1"); room.setUserId("owner");
        when(chatRoomRepository.findById("r1")).thenReturn(Optional.of(room));
        assertThatThrownBy(() -> service.deleteRoom("r1", "other"))
                .isInstanceOf(AccessDeniedException.class);
    }
}
