package com.ps.ollamaai.dto.converter;

import com.ps.ollamaai.domain.ChatRoom;
import com.ps.ollamaai.dto.ChatRoomDto;
import org.springframework.stereotype.Component;

@Component
public class ChatRoomToDtoConverter {

    public ChatRoomDto convert(final ChatRoom chatRoom) {
        final ChatRoomDto chatRoomDto = new ChatRoomDto();
        chatRoomDto.setId(chatRoom.getId());
        chatRoomDto.setTitle(chatRoom.getTitle());
        chatRoomDto.setUserId(chatRoom.getUserId());
        chatRoomDto.setCreatedAt(chatRoom.getCreatedAt());
        chatRoomDto.setActive(chatRoom.isActive());
        return chatRoomDto;
    }
}
