package com.ps.neurochat.service;

import com.ps.neurochat.domain.ChatMessage;
import com.ps.neurochat.domain.ChatRoom;
import com.ps.neurochat.domain.FileData;
import com.ps.neurochat.domain.User;
import com.ps.neurochat.dto.ChatMessageDto;
import com.ps.neurochat.dto.converter.ChatMessageToDtoConverter;
import com.ps.neurochat.exceptions.LimitExceededException;
import com.ps.neurochat.llm.history.HistoryEntry;
import com.ps.neurochat.repository.ChatMessageRepository;
import com.ps.neurochat.repository.ChatRoomRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static com.ps.neurochat.domain.ChatMessage.MessageType;
import static com.ps.neurochat.domain.ChatMessage.MessageType.AI_RESPONSE;
import static com.ps.neurochat.domain.ChatMessage.MessageType.USER_MESSAGE;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatMessageService {

    @Value("${app.chat-limit}")
    private int maxHistoryChatLength;

    private final ChatRoomRepository roomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatMessageToDtoConverter chatMessageToDtoConverter;
    private final ChatMessageRepository messageRepository;
    private final UserService userService;
    private final HistoryEntryService historyEntryService;
    private final MessageSource messageSource;

    private final Map<String, List<Message>> conversationalHistory = new ConcurrentHashMap<>();
    private final Map<String, StringBuilder> buffers = new ConcurrentHashMap<>();

    public List<ChatMessageDto> searchMessages(String roomId, String query) {
        return chatMessageRepository.searchMessages(roomId, query)
                .stream()
                .map(chatMessageToDtoConverter::convertToDto)
                .toList();
    }

    @Transactional
    public ChatProcessingResult processChatMessage(String message, String chatId, String userName, FileData fileData)
            throws LimitExceededException {
        final User user = userService.findByEmail(userName);
        final ChatMessage savedMessage = saveUserMessage(chatId, user.getId(), message, fileData);
        final boolean firstMessage = savedMessage.getOrder() != null && savedMessage.getOrder() == 1L;

        checkHistory(chatId);

        final List<Message> currentHistory = conversationalHistory.computeIfAbsent(chatId,
                k -> new ArrayList<>());

        try {
            checkLimit(currentHistory);
        } catch (RuntimeException ex) {
            conversationalHistory.remove(chatId);
            throw new LimitExceededException(messageSource.getMessage("error.limit.exceeded",
                    new Object[]{ex.getMessage()}, LocaleContextHolder.getLocale()));
        }

        return new ChatProcessingResult(currentHistory, firstMessage);
    }

    public void saveChunk(String chatId, String chunk) {
        buffers.computeIfAbsent(chatId, k -> new StringBuilder()).append(chunk);
    }

    public String saveAiResponse(String roomId) {
        StringBuilder buffer = buffers.remove(roomId);
        if (buffer == null) {
            log.warn("No buffer found for roomId: {}", roomId);
            return "";
        }
        final String fullResponse = buffer.toString();
        if (!fullResponse.isBlank()) {
            final ChatMessage aiResponse = createChatMessage(roomId, "ai-assistant", AI_RESPONSE, fullResponse);
            chatMessageRepository.save(aiResponse);
        }
        return fullResponse;
    }

    public ChatMessage saveUserMessage(final String roomId, final String userId, final String userPrompt, FileData fileData) {
        final ChatMessage message = createChatMessage(roomId, userId, USER_MESSAGE, userPrompt);
        if (fileData != null) {
            message.setFileData(fileData);
        }
        chatMessageRepository.save(message);
        return message;
    }

    private ChatMessage createChatMessage(String roomId, String userId, ChatMessage.MessageType userMessage,
                                          String userPrompt) {
        final ChatRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new EntityNotFoundException("Room not found"));
        // Получаем последний порядковый номер для этой комнаты
        final Long lastOrder = chatMessageRepository.findLastOrderByRoomId(roomId).orElse(0L);

        final ChatMessage message = new ChatMessage();
        message.setRoom(room);
        message.setUserId(userId);
        message.setType(userMessage);
        message.setContent(userPrompt);
        message.setOrder(lastOrder + 1); // Увеличиваем порядок
        return message;
    }

    public List<ChatMessageDto> getRoomMessages(final String roomId) {
        final List<ChatMessage> chatMessages = messageRepository.findByRoomIdOrderByTimestampAsc(roomId);
        return chatMessages.stream()
                .sorted(Comparator.comparing(ChatMessage::getOrder))
                .map(chatMessageToDtoConverter::convertToDto)
                .toList();
    }

    private void checkHistory(String chatId) {
        if (CollectionUtils.isEmpty(conversationalHistory.get(chatId))) {
            List<Message> chatHistory = new ArrayList<>();
            List<HistoryEntry> history = historyEntryService.getRoomHistory(chatId);
            for (HistoryEntry msg : history) {
                chatHistory.add(new UserMessage(msg.getPrompt()));
                chatHistory.add(new AssistantMessage(msg.getResponse()));
            }
            conversationalHistory.put(chatId, chatHistory);
        }
    }

    private void checkLimit(List<Message> currentHistory) {
        if (currentHistory.size() >= maxHistoryChatLength + 1) {
            throw new RuntimeException(messageSource.getMessage("error.limit.exceeded",
                    null, LocaleContextHolder.getLocale()));
        }
    }

    public void deleteConversationHistory(String chatId) {
        conversationalHistory.remove(chatId);
    }


    @Transactional(readOnly = true)
    public String formatChatForExport(String roomId) {
        List<ChatMessage> messages = messageRepository.findByRoomIdOrderByTimestampAsc(roomId);
        if (messages.isEmpty()) {
            return "No messages found in this chat.";
        }
        
        StringBuilder exportContent = new StringBuilder();
        String roomTitle = messages.get(0).getRoom().getTitle();
        exportContent.append("Chat: ").append(roomTitle).append("\n");
        exportContent.append("-".repeat(80)).append("\n\n");
        
        for (ChatMessage message : messages) {
            String sender = message.getType() == MessageType.USER_MESSAGE ? "You" : "Assistant";
            String timestamp = message.getTimestamp().toString();
            
            exportContent.append("[").append(timestamp).append("] ");
            exportContent.append(sender).append(":\n");
            exportContent.append(message.getContent()).append("\n\n");
        }
        
        return exportContent.toString();
    }
}