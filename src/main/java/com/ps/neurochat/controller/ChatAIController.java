package com.ps.neurochat.controller;

import com.ps.neurochat.domain.FileData;
import com.ps.neurochat.dto.ChunkResponseDTO;
import com.ps.neurochat.dto.UserPreferencesDTO;
import com.ps.neurochat.dto.enums.ErrorType;
import com.ps.neurochat.exceptions.LimitExceededException;
import com.ps.neurochat.service.ChatMessageService;
import com.ps.neurochat.service.ChatRoomService;
import com.ps.neurochat.service.FileStorageService;
import com.ps.neurochat.service.OllamaService;
import com.ps.neurochat.service.ReactiveService;
import com.ps.neurochat.service.TokenQuotaService;
import com.ps.neurochat.service.UserPreferencesService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.content.Media;
import org.springframework.ai.ollama.api.OllamaChatOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.util.MimeType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.SignalType;
import reactor.core.scheduler.Schedulers;

import java.security.Principal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import static com.ps.neurochat.dto.enums.ErrorType.LIMIT_EXCEEDED;
import static com.ps.neurochat.dto.enums.ErrorType.SERVER_ERROR;
import static com.ps.neurochat.llm.Prompts.CURRENT_PROMPT_INSTRUCTIONS;
import static com.ps.neurochat.llm.Prompts.PROMPT_GENERAL_INSTRUCTIONS;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/direct")
public class ChatAIController {

    private static final ChunkResponseDTO DONE_CHUNK = new ChunkResponseDTO("[DONE]", true, null, null);
    private static final Duration TITLE_GENERATION_TIMEOUT = Duration.ofSeconds(60);

    private final ChatClient chatClient;
    private final ChatMessageService chatMessageService;
    private final ChatRoomService chatRoomService;
    private final OllamaService ollamaService;
    private final ReactiveService reactiveService;
    private final FileStorageService fileStorageService;
    private final UserPreferencesService userPreferencesService;
    private final TokenQuotaService tokenQuotaService;
    private final MessageSource messageSource;

    @Value("${app.use-token-limits}")
    private boolean useTokenLimits;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ChunkResponseDTO> streamChat(
            @RequestParam String question,
            @RequestParam String chatId,
            @RequestParam(required = false) String fileId,
            Principal principal) {

        final Locale locale = LocaleContextHolder.getLocale();

        if (!StringUtils.hasText(question) || !StringUtils.hasText(chatId)) {
            return Flux.just(errorChunk(msg("error.server", null, locale), SERVER_ERROR));
        }

        final String username = principal.getName();

        return loadFileData(fileId)
                .flatMapMany(fileData -> reactiveService
                        .processChatMessageReactive(question, chatId, username, fileData.orElse(null))
                        .flatMapMany(result -> loadUserPreferences(username)
                                .flatMapMany(prefs -> streamResponse(
                                        question, chatId, username, fileData.orElse(null),
                                        result.history(), result.firstMessage(), prefs, locale))))
                .onErrorResume(LimitExceededException.class, e -> Mono
                        .fromRunnable(() -> chatRoomService.setInactive(chatId))
                        .subscribeOn(Schedulers.boundedElastic())
                        .thenMany(Flux.just(errorChunk(
                                msg("error.limit.exceeded", new Object[]{e.getMessage()}, locale),
                                LIMIT_EXCEEDED))))
                .onErrorResume(e -> {
                    log.error("Error processing chat message for chatId={}", chatId, e);
                    return Flux.just(errorChunk(msg("error.server", null, locale), SERVER_ERROR));
                });
    }

    /**
     * Runs the model stream for a single chat turn: buffers every chunk for
     * persistence, forwards it to the client and finalizes the turn on any
     * termination signal (complete, cancel or error).
     */
    private Flux<ChunkResponseDTO> streamResponse(String question,
                                                  String chatId,
                                                  String username,
                                                  FileData fileData,
                                                  List<Message> currentHistory,
                                                  boolean firstMessage,
                                                  UserPreferencesDTO prefs,
                                                  Locale locale) {
        if (useTokenLimits) {
            final Optional<ChunkResponseDTO> quotaError = checkQuota(question, username, locale);
            if (quotaError.isPresent()) {
                return Flux.just(quotaError.get());
            }
        }

        final Prompt prompt = new Prompt(
                buildMessages(question, fileData, currentHistory, resolveSystemPrompt(prefs)));

        final Flux<ChunkResponseDTO> content = buildRequestSpec(prompt, chatId, prefs.getPreferredModel())
                .stream()
                .content()
                .doOnNext(chunk -> chatMessageService.saveChunk(chatId, chunk))
                .map(chunk -> new ChunkResponseDTO(chunk, false, null, null));

        final String titleContext = resolveTitleContext(question, fileData);
        final Flux<ChunkResponseDTO> stream = firstMessage && StringUtils.hasText(titleContext)
                ? content.mergeWith(generateRoomTitle(chatId, titleContext))
                : content;

        return stream
                .concatWith(Mono.just(DONE_CHUNK))
                .doFinally(signal -> finalizeStream(signal, username, chatId, question, currentHistory));
    }

    /**
     * Context for title generation: the user question, or the attached file
     * name when the first message contains only a file.
     */
    private String resolveTitleContext(String question, FileData fileData) {
        if (StringUtils.hasText(question)) {
            return question;
        }
        return fileData != null ? fileData.getFileName() : null;
    }

    /**
     * Generates a room title off the request thread and renames the room.
     * Emits a single chunk carrying the new title; completes empty on any
     * failure or timeout so the main stream is never broken.
     */
    private Mono<ChunkResponseDTO> generateRoomTitle(String chatId, String titleContext) {
        return Mono.fromCallable(() -> {
                    final String generated = ollamaService.generateChatName(titleContext);
                    if (!StringUtils.hasText(generated)) {
                        return null;
                    }
                    return chatRoomService.renameRoom(chatId, generated).getTitle();
                })
                .subscribeOn(Schedulers.boundedElastic())
                .timeout(TITLE_GENERATION_TIMEOUT)
                .map(title -> new ChunkResponseDTO(null, false, null, title))
                .doOnError(e -> log.warn("Failed to auto-generate room title for chatId={}: {}",
                        chatId, e.toString()))
                .onErrorResume(e -> Mono.empty());
    }

    /**
     * Pre-checks the estimated cost of this turn (question + expected answer by
     * heuristic) against the user's monthly token quota. Returns an error chunk
     * when the quota is exceeded, or empty when streaming may proceed.
     */
    private Optional<ChunkResponseDTO> checkQuota(String question, String username, Locale locale) {
        try {
            estimateAndCheckQuota(username, question);
            return Optional.empty();
        } catch (LimitExceededException ex) {
            return Optional.of(errorChunk(
                    msg("error.limit.exceeded", new Object[]{ex.getMessage()}, locale),
                    LIMIT_EXCEEDED));
        }
    }

    private String resolveSystemPrompt(UserPreferencesDTO prefs) {
        return StringUtils.hasText(prefs.getSystemPrompt())
                ? prefs.getSystemPrompt()
                : PROMPT_GENERAL_INSTRUCTIONS;
    }

    private void estimateAndCheckQuota(String username, String question) {
        int estimate = TokenQuotaService.estimateTokensForTurn(question, null);
        tokenQuotaService.checkAndReserveTokens(username, estimate);
    }

    private ChatClient.ChatClientRequestSpec buildRequestSpec(Prompt prompt, String chatId, String preferredModel) {
        var spec = chatClient
                .prompt(prompt)
                .advisors(advisor -> advisor.param(ChatMemory.CONVERSATION_ID, chatId));

        if (StringUtils.hasText(preferredModel)) {
            spec = spec.options(OllamaChatOptions.builder().model(preferredModel));
        }
        return spec;
    }

    /**
     * Persists the buffered assistant response and records token usage when the
     * stream terminates. Runs on every termination signal — including client
     * disconnects (cancel) and mid-stream errors — so partial answers are saved
     * and the chunk buffer never leaks.
     */
    private void finalizeStream(SignalType signal, String username, String chatId,
                                String question, List<Message> currentHistory) {
        log.debug("Stream terminated for chatId={} with signal {}", chatId, signal);
        Mono.fromRunnable(() -> {
                    final String response = chatMessageService.saveAiResponse(chatId);
                    if (response.isBlank()) {
                        return;
                    }
                    // Extend in-memory history for the next turn
                    currentHistory.add(new UserMessage(question));
                    currentHistory.add(new AssistantMessage(response));
                    // Add usage (approx): question + response
                    final int used = TokenQuotaService.estimateTokensForMessages(question)
                            + tokenQuotaService.estimateTokensForText(response);
                    tokenQuotaService.addUsage(username, used);
                })
                .subscribeOn(Schedulers.boundedElastic())
                .subscribe();
    }

    private Mono<UserPreferencesDTO> loadUserPreferences(String username) {
        return Mono.fromCallable(() -> userPreferencesService.getUserPreferencesOrDefault(username))
                .subscribeOn(Schedulers.boundedElastic());
    }

    /**
     * Loads the optional attachment off the request thread. Emits an Optional so
     * the chain keeps flowing when no file was attached; a missing file surfaces
     * as a server-error chunk instead of a synchronous exception.
     */
    private Mono<Optional<FileData>> loadFileData(String fileId) {
        return Mono.fromCallable(() -> Optional.ofNullable(getFileData(fileId)))
                .subscribeOn(Schedulers.boundedElastic());
    }

    private FileData getFileData(String fileId) {
        return StringUtils.hasText(fileId) ? fileStorageService.getFile(fileId) : null;
    }

    private ChunkResponseDTO errorChunk(String message, ErrorType errorType) {
        return new ChunkResponseDTO(message, true, errorType.name(), null);
    }

    private String msg(String key, Object[] args, Locale locale) {
        return messageSource.getMessage(key, args, locale);
    }

    private List<Message> buildMessages(String question, FileData fileData, List<Message> currentHistory,
                                        String systemPrompt) {
        final List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt));
        messages.addAll(currentHistory);
        messages.add(buildUserMessage(question, fileData));
        return messages;
    }

    private UserMessage buildUserMessage(String question, FileData fileData) {
        if (fileData == null) {
            return new UserMessage(CURRENT_PROMPT_INSTRUCTIONS + question);
        }

        final FileData finalFileData = fileData;
        ByteArrayResource resource = new ByteArrayResource(fileData.getData()) {
            @Override
            public String getFilename() {
                return finalFileData.getFileName();
            }
        };

        final Media imageMedia = Media.builder()
                .data(resource)
                .mimeType(MimeType.valueOf(finalFileData.getContentType()))
                .build();

        return UserMessage.builder()
                .text(CURRENT_PROMPT_INSTRUCTIONS + question)
                .media(List.of(imageMedia))
                .build();
    }
}