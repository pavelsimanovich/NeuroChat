package com.ps.neurochat.dto.converter;

import com.ps.neurochat.domain.ChatRoom;
import com.ps.neurochat.dto.ChatRoomDto;
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
