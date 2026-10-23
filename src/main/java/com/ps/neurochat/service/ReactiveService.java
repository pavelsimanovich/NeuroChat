package com.ps.neurochat.service;

import com.ps.neurochat.domain.FileData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Service
@RequiredArgsConstructor
public class ReactiveService {

    private final ChatMessageService chatMessageService;

    public Mono<ChatProcessingResult> processChatMessageReactive(String question, String chatId,
                                                                 String username, FileData fileData) {
        return Mono.fromCallable(() ->
                        chatMessageService.processChatMessage(question, chatId, username, fileData))
                .subscribeOn(Schedulers.boundedElastic());
    }
}
