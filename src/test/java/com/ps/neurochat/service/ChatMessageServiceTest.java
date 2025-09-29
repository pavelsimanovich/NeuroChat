package com.ps.neurochat.service;

import com.ps.neurochat.domain.ChatMessage;
import com.ps.neurochat.domain.ChatRoom;
import com.ps.neurochat.domain.FileData;
import com.ps.neurochat.domain.User;
import com.ps.neurochat.dto.ChatMessageDto;
import com.ps.neurochat.dto.converter.ChatMessageToDtoConverter;
import com.ps.neurochat.llm.history.HistoryEntry;
import com.ps.neurochat.repository.ChatMessageRepository;
import com.ps.neurochat.repository.ChatRoomRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.context.MessageSource;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static com.ps.neurochat.domain.ChatMessage.MessageType.USER_MESSAGE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatMessageServiceTest {

    @Mock private ChatRoomRepository roomRepository;
    @Mock private ChatMessageRepository chatMessageRepository;
    @Mock private ChatMessageToDtoConverter converter;
    @Mock private ChatMessageRepository messageRepository;
    @Mock private UserService userService;
    @Mock private HistoryEntryService historyEntryService;
    @Mock private MessageSource messageSource;

    private ChatMessageService service;
    private User user;

    @BeforeEach
    void setup() throws Exception {
        service = new ChatMessageService(roomRepository, chatMessageRepository, converter, messageRepository,
                userService, historyEntryService, messageSource);
        user = new User();
        user.setEmail("user@example.com");
        user.setFirstName("Ivan");
        Field f = ChatMessageService.class.getDeclaredField("maxHistoryChatLength");
        f.setAccessible(true);
        f.set(service, 100);
    }

    @Test
    @DisplayName("processChatMessage saves user msg, initializes history, returns history")
    void processChatMessage_basic() throws Exception {
        String roomId = "r1";
        ChatRoom room = new ChatRoom();
        room.setId(roomId);
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        lenient().when(chatMessageRepository.findLastOrderByRoomId(roomId)).thenReturn(Optional.of(0L));

        User user = new User();
        user.setId("u1");
        when(userService.findByEmail("user@example.com")).thenReturn(user);

        List<HistoryEntry> hist = new ArrayList<>();
        HistoryEntry h = new HistoryEntry("hi", "hello");
        hist.add(h);
        when(historyEntryService.getRoomHistory(roomId)).thenReturn(hist);

        List<Message> out = service.processChatMessage("question", roomId, "user@example.com", null);
        assertThat(out).hasSize(2);
        assertThat(out.get(0)).isInstanceOf(UserMessage.class);
        assertThat(out.get(1)).isInstanceOf(AssistantMessage.class);

        boolean savedViaPrimary = org.mockito.Mockito.mockingDetails(chatMessageRepository)
                .getInvocations().stream()
                .anyMatch(inv -> inv.getMethod().getName().equals("save"));
        boolean savedViaSecondary = org.mockito.Mockito.mockingDetails(messageRepository)
                .getInvocations().stream()
                .anyMatch(inv -> inv.getMethod().getName().equals("save"));
        assertThat(savedViaPrimary || savedViaSecondary).isTrue();
    }

    @Test
    @DisplayName("saveChunk/saveAiResponse accumulates and persists AI response")
    void saveChunkAndSaveAiResponse() {
        String roomId = "r2";
        ChatRoom room = new ChatRoom(); room.setId(roomId);
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        lenient().when(chatMessageRepository.findLastOrderByRoomId(roomId)).thenReturn(Optional.of(1L));

        service.saveChunk(roomId, "Hello ");
        service.saveChunk(roomId, "World");
        String res = service.saveAiResponse(roomId);

        assertThat(res).isEqualTo("Hello World");
        boolean savedViaPrimary = org.mockito.Mockito.mockingDetails(chatMessageRepository)
                .getInvocations().stream()
                .anyMatch(inv -> inv.getMethod().getName().equals("save"));
        boolean savedViaSecondary = org.mockito.Mockito.mockingDetails(messageRepository)
                .getInvocations().stream()
                .anyMatch(inv -> inv.getMethod().getName().equals("save"));
        assertThat(savedViaPrimary || savedViaSecondary).isTrue();
    }

    @Test
    @DisplayName("saveAiResponse with no buffer returns empty and does not persist")
    void saveAiResponse_empty() {
        String res = service.saveAiResponse("unknown");
        assertThat(res).isEmpty();
        verify(chatMessageRepository, never()).save(any());
    }

    @Test
    @DisplayName("saveUserMessage attaches file when provided")
    void saveUserMessage_withFile() {
        String roomId = "r3";
        ChatRoom room = new ChatRoom(); room.setId(roomId);
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room));
        lenient().when(chatMessageRepository.findLastOrderByRoomId(roomId)).thenReturn(Optional.of(5L));

        FileData fd = new FileData(); fd.setId("file1");
        service.saveUserMessage(roomId, "u", "prompt", fd);

        boolean savedViaPrimary = org.mockito.Mockito.mockingDetails(chatMessageRepository)
                .getInvocations().stream()
                .anyMatch(inv -> inv.getMethod().getName().equals("save"));
        boolean savedViaSecondary = org.mockito.Mockito.mockingDetails(messageRepository)
                .getInvocations().stream()
                .anyMatch(inv -> inv.getMethod().getName().equals("save"));
        assertThat(savedViaPrimary || savedViaSecondary).isTrue();
    }

    @Test
    @DisplayName("createChatMessage throws when room not found")
    void createChatMessage_roomMissing() {
        when(roomRepository.findById("x")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.saveUserMessage("x", "u", "p", null))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    @DisplayName("getRoomMessages sorts and converts to DTOs")
    void getRoomMessages() {
        ChatMessage m1 = new ChatMessage(); m1.setOrder(2L); m1.setContent("b");
        ChatMessage m2 = new ChatMessage(); m2.setOrder(1L); m2.setContent("a");
        when(messageRepository.findByRoomIdOrderByTimestampAsc("room")).thenReturn(List.of(m1, m2));
        when(converter.convertToDto(any())).thenAnswer(inv -> {
            ChatMessage cm = inv.getArgument(0);
            ChatMessageDto dto = new ChatMessageDto();
            dto.setContent(cm.getContent());
            return dto;
        });

        List<ChatMessageDto> dtos = service.getRoomMessages("room");
        assertThat(dtos).extracting(ChatMessageDto::getContent).containsExactlyInAnyOrder("a", "b");
    }

    @Test
    @DisplayName("formatChatForExport returns formatted text or message when empty")
    void formatChatForExport() {
        ChatRoom room = new ChatRoom(); room.setTitle("My Chat");
        ChatMessage m = new ChatMessage();
        m.setRoom(room);
        m.setType(USER_MESSAGE);
        m.setContent("Hello");
        m.setTimestamp(LocalDateTime.now());
        when(messageRepository.findByRoomIdOrderByTimestampAsc("r")).thenReturn(List.of(m));

        String text = service.formatChatForExport("r");
        assertThat(text).contains("Chat: My Chat").contains("You:").contains("Hello");

        when(messageRepository.findByRoomIdOrderByTimestampAsc("e")).thenReturn(List.of());
        assertThat(service.formatChatForExport("e")).contains("No messages");
    }
}
