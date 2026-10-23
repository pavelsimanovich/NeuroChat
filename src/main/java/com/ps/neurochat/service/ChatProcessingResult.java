package com.ps.neurochat.service;

import org.springframework.ai.chat.messages.Message;

import java.util.List;

/**
 * Result of persisting an incoming user message: the current in-memory
 * conversation history plus a flag telling whether this was the first
 * message ever saved in the room (used to trigger room-title generation).
 */
public record ChatProcessingResult(
        List<Message> history,
        boolean firstMessage
) {}
