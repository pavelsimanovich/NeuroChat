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
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomToDtoConverter chatRoomToDtoConverter;
    private final ChatMessageService chatMessageService;
    private final FileDataRepository fileDataRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public ChatRoomDto createRoom(final String userId, final String title) {
        final ChatRoom room = new ChatRoom();
        room.setUserId(userId);
        room.setTitle(title);
        room.setActive(true);
        final ChatRoom chatRoom = chatRoomRepository.save(room);
        return chatRoomToDtoConverter.convert(chatRoom);
    }

    public List<ChatRoomDto> getUserRooms(final String userId) {
        final List<ChatRoom> chatRooms = chatRoomRepository.findByUserId(userId);
        return chatRooms.stream()
                .map(chatRoomToDtoConverter::convert)
                .toList();
    }

    public ChatRoomDto renameRoom(final String roomId, final String newName) {
        final ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));
        chatRoom.setTitle(newName);
        chatRoomRepository.save(chatRoom);
        return chatRoomToDtoConverter.convert(chatRoom);
    }

    @Transactional
    public void deleteRoom(final String roomId, final String userId) {
        final ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));
        if (!room.getUserId().equals(userId)) {
            throw new AccessDeniedException("You can only delete your own rooms");
        }
        List<ChatMessage> messages = room.getMessages();

        // 1. Сохраняем id всех файлов, которые нужно удалить
        List<String> fileIdsToDelete = messages.stream()
                .filter(m -> m.getFileData() != null)
                .map(m -> m.getFileData().getId())
                .toList();
        log.info("File ids to delete: {}", fileIdsToDelete);

        // 2. Отключаем fileData у сообщений и сохраняем их
        for (ChatMessage message : messages) {
            if (message.getFileData() != null) {
                message.setFileData(null);
                chatMessageRepository.save(message);
            }
        }
        entityManager.flush();
        entityManager.clear();

        // 3. Удаляем файлы по сохранённым id
        for (String fileId : fileIdsToDelete) {
            long count = chatMessageRepository.countByFileDataId(fileId);
            if (count == 0) {
                log.info("Deleting fileData with id: {}", fileId);
                fileDataRepository.deleteById(fileId);
            } else {
                log.warn("FileData {} is still referenced by {} messages, not deleting!", fileId, count);
            }
        }
        entityManager.flush();
        entityManager.clear();

        // 4. Снова получаем сообщения и удаляем их
        List<ChatMessage> messagesToDelete = chatMessageRepository.findByRoomIdOrderByTimestampAsc(roomId);
        chatMessageRepository.deleteAll(messagesToDelete);
        entityManager.flush();
        entityManager.clear();

        // 5. Удаляем историю и комнату
        chatMessageService.deleteConversationHistory(roomId);
        chatRoomRepository.deleteById(roomId);
        entityManager.flush();
        entityManager.clear();
    }

    @Transactional
    public void setInactive(final String roomId) {
        chatRoomRepository.setInactiveRoom(roomId);
    }
}
