package com.ps.ollamaai.service;

import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.messages.Message;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReactiveService {

    private final ChatMessageService chatMessageService;

    public Mono<List<Message>> processChatMessageReactive(String question, String chatId, String username) {
        return Mono.fromCallable(() -> chatMessageService.processChatMessage(question, chatId, username))
                .subscribeOn(Schedulers.boundedElastic());
    }
}
