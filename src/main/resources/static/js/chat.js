window.chatState = {
    currentRoom: null,
    rooms: [],
    messages: []
};

// Config
const config = {
    // Auto-scroll configuration
    autoScroll: {
        enabled: true,
        threshold: 100 // pixels from bottom to consider user at the bottom
    },
    apiBaseUrl: '/api/chat',
    theme: {
        LIGHT: 'light',
        DARK: 'dark',
        STORAGE_KEY: 'chat_theme',
        ICONS: {
            LIGHT: 'bi-sun',
            DARK: 'bi-moon-stars'
        }
    }
};

// Text-to-Speech (TTS) functionality for AI messages
const tts = {
    supported: ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window),
    currentUtterance: null,
    speakingMessageId: null,
    isPaused: false,
    settings: {
        rate: 1.0,
        pitch: 1.0,
        autoplay: false,
        speakWhileGenerating: false
    },

    init() {
        if (!this.supported) return;
        // Load saved settings
        try {
            const saved = JSON.parse(localStorage.getItem('tts_settings') || '{}');
            this.settings = { voiceURI: '', rate: 1.0, pitch: 1.0, autoplay: false, speakWhileGenerating: false, ...saved };
        } catch (ex) {
            console.error(ex);
        }
        window.addEventListener('beforeunload', () => this.stop());
    },

    applySettings(newSettings = {}) {
        // Update runtime settings and persist
        this.settings = { ...this.settings, ...newSettings };
        try { localStorage.setItem('tts_settings', JSON.stringify(this.settings)); } catch (ex) {console.error(ex);}
        // If currently speaking, update control states
        this.updateControlsState();
    },

    // Queue a chunk without cancelling existing utterances (for streaming)
    speakChunk(text, messageId) {
        if (!this.supported || !text) return;
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = Number(this.settings.rate) || 1.0;
        utter.pitch = Number(this.settings.pitch) || 1.0;
        utter.onstart = () => {
            this.speakingMessageId = messageId;
            this.isPaused = false;
            this.updateControlsState();
        };
        utter.onend = () => {
            // Do not clear speakingMessageId here; next chunk or stop() will update state
            this.updateControlsState();
        };
        utter.onerror = () => {
            this.updateControlsState();
        };
        // Enqueue without canceling to preserve queue
        window.speechSynthesis.speak(utter);
        this.currentUtterance = utter;
        this.updateControlsState();
    },

    play(text, messageId) {
        if (!this.supported || !text) return;
        // If already speaking another message, stop it first
        if (this.isSpeaking() && this.speakingMessageId !== messageId) {
            this.stop();
        }

        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = Number(this.settings.rate) || 1.0; // normal speed
        utter.pitch = Number(this.settings.pitch) || 1.0; // normal pitch
        utter.onstart = () => {
            this.isPaused = false;
            this.updateControlsState();
        };
        utter.onpause = () => {
            this.isPaused = true;
            this.updateControlsState();
        };
        utter.onend = () => {
            this.currentUtterance = null;
            this.speakingMessageId = null;
            this.isPaused = false;
            this.updateControlsState();
        };
        utter.onerror = () => {
            this.currentUtterance = null;
            this.speakingMessageId = null;
            this.isPaused = false;
            this.updateControlsState();
        };

        this.currentUtterance = utter;
        this.speakingMessageId = messageId;
        this.isPaused = false;
        window.speechSynthesis.cancel(); // ensure queue is cleared
        window.speechSynthesis.speak(utter);
        this.updateControlsState();
    },

    stop() {
        if (!this.supported) return;
        window.speechSynthesis.cancel();
        this.currentUtterance = null;
        this.speakingMessageId = null;
        this.isPaused = false;
        this.updateControlsState();
    },

    pause() {
        if (!this.supported) return;
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            this.isPaused = true;
            this.updateControlsState();
        }
    },

    resume() {
        if (!this.supported) return;
        // Use internal flag to handle browsers with unreliable paused state
        if (this.currentUtterance && (this.isPaused || window.speechSynthesis.paused)) {
            window.speechSynthesis.resume();
            this.isPaused = false;
            // Some browsers need a small delay before state reflects correctly
            this.updateControlsState();
            setTimeout(() => this.updateControlsState(), 60);
        }
    },

    isSpeaking() {
        if (!this.supported) return false;
        return window.speechSynthesis.speaking && !window.speechSynthesis.paused;
    },

    updateControlsState() {
        // Update play/pause/stop buttons visual state
        document.querySelectorAll('.tts-controls').forEach(ctrl => {
            const mid = ctrl.getAttribute('data-message-id');
            const activeId = (this.speakingMessageId !== null && this.speakingMessageId !== undefined)
                ? String(this.speakingMessageId)
                : null;
            const isPaused = this.isPaused || window.speechSynthesis.paused;
            const isSpeakingOrPaused = (window.speechSynthesis.speaking || this.isPaused);
            const isActive = activeId === mid && isSpeakingOrPaused;
            ctrl.classList.toggle('tts-active', isActive);
            const playBtn = ctrl.querySelector('[data-tts="play"]');
            const pauseBtn = ctrl.querySelector('[data-tts="pause"]');
            const resumeBtn = ctrl.querySelector('[data-tts="resume"]');
            const stopBtn = ctrl.querySelector('[data-tts="stop"]');
            if (playBtn) playBtn.disabled = isActive; // disable play if currently playing this message
            if (pauseBtn) pauseBtn.disabled = !(activeId === mid && window.speechSynthesis.speaking && !isPaused);
            if (resumeBtn) resumeBtn.disabled = !(activeId === mid && isPaused);
            if (stopBtn) stopBtn.disabled = !(activeId === mid && (window.speechSynthesis.speaking || isPaused));
        });

        // Toggle highlight on the currently playing message
        try {
            const activeId = (this.speakingMessageId !== null && this.speakingMessageId !== undefined)
                ? String(this.speakingMessageId)
                : null;
            const activeState = (window.speechSynthesis.speaking || this.isPaused);
            document.querySelectorAll('.message[data-message-id]')
                .forEach(msg => {
                    const id = msg.getAttribute('data-message-id');
                    const on = activeId && id === activeId && activeState;
                    msg.classList.toggle('message-playing', !!on);
                });
        } catch (ex) {
            console.error(ex);
        }
    }
};

tts.init();
// Expose globally for settings module
window.tts = tts;

let eventSource = null;
let chatConnections = {};
// Используем глобальное состояние чата
const state = window.chatState;

// Context menu state
let contextMenuState = {
    roomId: null,
    roomElement: null
};

// DOM элементы
const elements = (function() {
    const elements = {
        roomsList: document.getElementById('roomsList'),
        currentRoomTitle: document.getElementById('currentRoomTitle'),
        chatMessages: document.getElementById('chatMessages'),
        scrollTopBtn: document.getElementById('scrollTopBtn'),
        scrollBottomBtn: document.getElementById('scrollBottomBtn'),
        messageInput: document.getElementById('messageInput'),
        sendButton: document.getElementById('sendMessageBtn'),
        stopButton: document.getElementById('stopGenerationBtn'),
        createRoomBtn: document.getElementById('createRoomBtn'),
        userId: document.getElementById('userId')?.value || '',
        userName: document.getElementById('userName')?.value || 'User',
        limitMessages: document.getElementById('limitMessages'),
        fileInput: null,
        filePreview: null,
        uploadButton: null
    };

    function init() {
        // Initialize stop button if it exists
        if (elements.stopButton) {
            elements.stopButton.addEventListener('click', () => {
                if (state.currentRoom && state.currentRoom.id) {
                    stopStream(state.currentRoom.id);
                    showNotification(window.i18n?.t('notify.generationStopped', 'Генерация остановлена'), 'info');
                }
            });
        }

        // Инициализация элементов для загрузки файлов
        elements.fileInput = document.createElement('input');
        elements.fileInput.type = 'file';
        elements.fileInput.accept = 'image/*'; // Только изображения, модель не поддерживает другие форматы
        elements.fileInput.multiple = false;
        elements.fileInput.style.display = 'none';

        elements.uploadButton = document.querySelector('#uploadButton') ||
            Object.assign(document.createElement('button'), {
                id: 'uploadButton',
                type: 'button',
                className: 'btn btn-outline-secondary',
                innerHTML: '📎',
                style: 'margin-right: 10px; border-radius: 20px; padding: 5px 12px; font-size: 18px;'
            });

        elements.filePreview = document.querySelector('#filePreview') ||
            Object.assign(document.createElement('div'), {
                id: 'filePreview',
                className: 'file-preview',
                style: 'display: none; margin-bottom: 10px; max-height: 150px; overflow-y: auto; padding: 5px; border: 1px dashed #ddd; border-radius: 5px;'
            });

        // Вставка элементов в DOM
        if (elements.messageInput) {
            const messageInputContainer = elements.messageInput.closest('.message-input');
            if (messageInputContainer) {
                const referenceNode = elements.messageInput.closest('.message-input-wrapper') || elements.messageInput;
                const parentNode = referenceNode.parentNode;

                [elements.filePreview, elements.fileInput, elements.uploadButton].forEach(element => {
                    if (element && !parentNode.contains(element)) {
                        parentNode.insertBefore(element, referenceNode);
                    }
                });
            }
        }
        // Scroll-to-top button click handler
        if (elements.scrollTopBtn && elements.chatMessages) {
            elements.scrollTopBtn.addEventListener('click', (e) => {
                e.preventDefault();
                try {
                    elements.chatMessages.scrollTo({ top: 0, behavior: 'smooth' });
                } catch (ex) {
                    console.error(ex);
                    elements.chatMessages.scrollTop = 0;
                }
            });
        }
        // Scroll-to-bottom button click handler
        if (elements.scrollBottomBtn && elements.chatMessages) {
            elements.scrollBottomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                try {
                    elements.chatMessages.scrollTo({ top: elements.chatMessages.scrollHeight, behavior: 'smooth' });
                } catch (ex) {
                    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
                }
            });
        }
        return elements;
    }
    return init();
})();

// Re-render rooms list when language changes to refresh group titles/empty state
window.addEventListener('i18n:changed', () => {
    try {
        renderRoomsList();
    }  catch (ex) {
        console.error(ex)
    }
});

async function switchToLastRoom() {
    if (!state.rooms?.length) {
        await createRoom('Новый чат');
        return;
    }

    const lastRoomId = localStorage.getItem('lastRoomId');
    const lastRoom = lastRoomId && state.rooms.find(r => r.id === lastRoomId);

    await switchRoom(lastRoom || state.rooms[0]);
}

async function loadRooms() {
    try {
        const response = await fetch(`${config.apiBaseUrl}/rooms?userId=${encodeURIComponent(elements.userId)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        state.rooms = await response.json();
        if (!Array.isArray(state.rooms)) {
            throw new Error('Invalid rooms data received from server');
        }

        renderRoomsList();
        if (state.rooms.length) {
            await switchToLastRoom();
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        showNotification(window.i18n?.t('error.roomsLoad', 'Не удалось загрузить комнаты. Пожалуйста, обновите страницу.'), 'error');
    }
}

function renderRoomsList() {
    if (!elements.roomsList) return;

    elements.roomsList.innerHTML = '';

    if (!state.rooms?.length) {
        const empty = window.i18n?.t('rooms.empty', 'История чатов пуста');
        elements.roomsList.innerHTML = `<div class="no-rooms">${empty}</div>`;
        hideInputs(true);
        return;
    }

    hideInputs(false);

    const groupedRooms = groupRoomsByDate(state.rooms);

    if (groupedRooms.pinned.length > 0) {
        renderChatGroup('pinned', window.i18n?.t('rooms.pinned', 'Закрепленные'), groupedRooms.pinned, 'bi-pin-angle-fill');
    }

    // Отображение групп по времени
    if (groupedRooms.today.length > 0) {
        renderChatGroup('today', window.i18n?.t('rooms.today', 'Сегодня'), groupedRooms.today, 'bi-clock');
    }

    if (groupedRooms.yesterday.length > 0) {
        renderChatGroup('yesterday', window.i18n?.t('rooms.yesterday', 'Вчера'), groupedRooms.yesterday, 'bi-clock-history');
    }

    if (groupedRooms.thisWeek.length > 0) {
        renderChatGroup('thisWeek', window.i18n?.t('rooms.thisWeek', 'На этой неделе'), groupedRooms.thisWeek, 'bi-calendar-week');
    }

    if (groupedRooms.older.length > 0) {
        renderChatGroup('older', window.i18n?.t('rooms.older', 'Ранее'), groupedRooms.older, 'bi-archive');
    }
}

function groupRoomsByDate(rooms) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups = {
        pinned: [],
        today: [],
        yesterday: [],
        thisWeek: [],
        older: []
    };

    const sortedRooms = [...rooms].sort((a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    sortedRooms.forEach(room => {
        if (!room?.id || !room?.title) return;

        if (isPinned(room.id)) {
            groups.pinned.push(room);
            return;
        }

        const roomDate = new Date(room.createdAt || 0);
        const roomDay = new Date(roomDate.getFullYear(), roomDate.getMonth(), roomDate.getDate());

        if (roomDay.getTime() === today.getTime()) {
            groups.today.push(room);
        } else if (roomDay.getTime() === yesterday.getTime()) {
            groups.yesterday.push(room);
        } else if (roomDate >= weekAgo) {
            groups.thisWeek.push(room);
        } else {
            groups.older.push(room);
        }
    });

    return groups;
}

function renderChatGroup(groupId, title, rooms, iconClass) {
    if (!rooms.length) return;

    const groupElement = document.createElement('div');
    groupElement.className = 'chat-group';
    groupElement.setAttribute('data-group', groupId);

    // Применяем сохраненное состояние сворачивания группы
    try {
        const collapsedGroups = JSON.parse(localStorage.getItem('collapsedGroups') || '[]');
        if (Array.isArray(collapsedGroups) && collapsedGroups.includes(groupId)) {
            groupElement.classList.add('collapsed');
        }
    } catch (e) {}

    const headerElement = document.createElement('div');
    headerElement.className = 'chat-group-header';
    headerElement.setAttribute('role', 'button');
    headerElement.setAttribute('tabindex', '0');
    headerElement.setAttribute('aria-expanded', groupElement.classList.contains('collapsed') ? 'false' : 'true');
    headerElement.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <i class="bi ${iconClass}"></i>
            <span>${title}</span>
        </div>
        <i class="bi bi-chevron-down group-chevron" aria-hidden="true"></i>
    `;

    const toggleGroup = () => {
        const willCollapse = !groupElement.classList.contains('collapsed');
        groupElement.classList.toggle('collapsed');
        headerElement.setAttribute('aria-expanded', willCollapse ? 'false' : 'true');
        try {
            const collapsedGroups = JSON.parse(localStorage.getItem('collapsedGroups') || '[]');
            const set = new Set(Array.isArray(collapsedGroups) ? collapsedGroups : []);
            if (willCollapse) {
                set.add(groupId);
            } else {
                set.delete(groupId);
            }
            localStorage.setItem('collapsedGroups', JSON.stringify(Array.from(set)));
        } catch (e) {
            console.error(e);
        }
    };

    headerElement.addEventListener('click', (e) => {
        e.preventDefault();
        toggleGroup();
    });
    headerElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleGroup();
        }
    });

    const contentElement = document.createElement('div');
    contentElement.className = 'chat-group-content';

    rooms.forEach(room => {
        const roomElement = createRoomElement(room);
        contentElement.appendChild(roomElement);
    });

    groupElement.appendChild(headerElement);
    groupElement.appendChild(contentElement);
    elements.roomsList.appendChild(groupElement);
}

function createRoomElement(room) {
    const roomElement = document.createElement('div');
    const isActive = state.currentRoom?.id === room.id;
    const pinned = isPinned(room.id);

    roomElement.className = `room-item ${isActive ? 'active' : ''} ${pinned ? 'pinned' : ''}`;
    roomElement.setAttribute('data-room-id', room.id);
    roomElement.setAttribute('data-room-title', room.title);

    // Название комнаты
    const nameElement = document.createElement('span');
    nameElement.className = 'room-name flex-grow-1';
    nameElement.textContent = room.title || 'Без названия';
    nameElement.title = room.title;

    // Контейнер для действий
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'room-actions';

    // Кнопка меню (три точки)
    const menuButton = document.createElement('button');
    menuButton.className = 'btn-menu';
    menuButton.innerHTML = '<i class="bi bi-three-dots-vertical"></i>';
    menuButton.title = window.i18n?.t('room.actions', 'Действия');
    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault(); // Предотвращаем любую стандартную обработку клика
        showContextMenu(e, room.id, roomElement, pinned);
    });

    // Добавляем элементы в контейнер действий
    actionsContainer.appendChild(menuButton);

    // Добавляем элементы в комнату
    roomElement.appendChild(nameElement);
    roomElement.appendChild(actionsContainer);

    // Обработчик клика на комнату для переключения
    roomElement.addEventListener('click', (e) => {
        // Проверяем, не является ли клик на кнопке меню
        if (e.target.closest('.btn-menu')) {
            return; // Пропускаем клик на кнопке меню
        }

        const room = state.rooms.find(r => r.id === roomElement.getAttribute('data-room-id'));
        if (room) {
            switchRoom(room);
        }
    });

    // Обработчик контекстного меню
    roomElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, room.id, roomElement, pinned);
    });

    return roomElement;
}

// Функции для работы с закрепленными чатами
function isPinned(roomId) {
    const pinnedRooms = JSON.parse(localStorage.getItem('pinnedRooms') || '[]');
    return pinnedRooms.includes(roomId);
}

function togglePin(roomId) {
    const pinnedRooms = JSON.parse(localStorage.getItem('pinnedRooms') || '[]');
    const index = pinnedRooms.indexOf(roomId);

    if (index > -1) {
        pinnedRooms.splice(index, 1);
        showNotification(window.i18n?.t('notify.unpinned', 'Чат откреплен'), 'info');
    } else {
        pinnedRooms.push(roomId);
        showNotification(window.i18n?.t('notify.pinned', 'Чат закреплен'), 'success');
    }

    localStorage.setItem('pinnedRooms', JSON.stringify(pinnedRooms));
    renderRoomsList(); // Перерисовываем список
}

async function switchRoom(room) {
    if (!room) return;

    const previousRoomId = state.currentRoom?.id;
    state.currentRoom = room;
    localStorage.setItem('lastRoomId', room.id);

    try {
        // Update UI for room selection without re-rendering the entire list
        updateRoomActiveState(previousRoomId, room.id);

        elements.currentRoomTitle.textContent = room.title;
        await loadRoomMessages(room.id);

        hideInputs(!room.active);
        elements.messageInput.classList.toggle('grey-color', !room.active);

        if (!room.active && elements.limitMessages) {
            const txt = window.i18n?.t('limit.exceeded', 'Превышен лимит сообщений в комнате');
            elements.limitMessages.innerHTML = `<div class="limit-messages">${txt}</div>`;
        } else if (elements.limitMessages) {
            elements.limitMessages.innerHTML = '';
        }

        scrollToBottom(true);
        // Закрываем сайдбар в мобильной версии после выбора чата
        if (window.innerWidth < 768 && window.sidebarManager) {
            setTimeout(() => window.sidebarManager.close(), 150);
        }
    } catch (error) {
        console.error('Error switching room:', error);
        showNotification(window.i18n?.t('error.switchRoom', 'Ошибка загрузки'), 'error');
    }
}

function updateRoomActiveState(previousRoomId, newRoomId) {
    // Remove active class from previous room
    if (previousRoomId) {
        const prevRoomElement = document.querySelector(`.room-item[data-room-id="${previousRoomId}"]`);
        if (prevRoomElement) {
            prevRoomElement.classList.remove('active');
        }
    }

    // Add active class to new room
    if (newRoomId) {
        const newRoomElement = document.querySelector(`.room-item[data-room-id="${newRoomId}"]`);
        if (newRoomElement) {
            newRoomElement.classList.add('active');
        }
    }
}

async function loadRoomMessages(roomId) {
    try {
        const response = await fetch(`${config.apiBaseUrl}/rooms/${roomId}/messages`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        state.messages = await response.json();
        renderMessages();
    } catch (error) {
        console.error('Error loading messages:', error);
        showNotification(window.i18n?.t('error.messagesLoad', 'Ошибка загрузки сообщений. Обновите страницу.'), 'error');
    }
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Track if user has scrolled up
let userScrolledUp = false;

// Check if user is near the bottom of the chat
function isNearBottom() {
    if (!elements || !elements.chatMessages) return true;
    const { scrollTop, scrollHeight, clientHeight } = elements.chatMessages;
    return scrollHeight - scrollTop - clientHeight <= config.autoScroll.threshold;
}

// Scroll to bottom only if user is already at the bottom or auto-scroll is forced
function scrollToBottom(force = false) {
    if (!elements || !elements.chatMessages) return;

    if (force || !userScrolledUp || isNearBottom()) {
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        userScrolledUp = false;
    }
}

// Handle scroll events to detect user scroll up
function setupScrollHandlers() {
    if (!elements || !elements.chatMessages) return;

    const updateScrollButtons = () => {
        const sc = elements.chatMessages.scrollTop;
        const max = elements.chatMessages.scrollHeight - elements.chatMessages.clientHeight;
        const showTop = sc > 200;
        const showBottom = max - sc > config.autoScroll.threshold; // not near bottom
        // Independent visibility: when in the middle, show both buttons
        if (elements.scrollTopBtn) {
            elements.scrollTopBtn.classList.toggle('d-none', !showTop);
        }
        if (elements.scrollBottomBtn) {
            elements.scrollBottomBtn.classList.toggle('d-none', !showBottom);
        }
        // If both are visible, stack the top button above the bottom one
        const bothVisible = showTop && showBottom;
        if (elements.scrollTopBtn) {
            elements.scrollTopBtn.classList.toggle('stacked', bothVisible);
        }
    };

    elements.chatMessages.addEventListener('scroll', () => {
        userScrolledUp = !isNearBottom();
        updateScrollButtons();
    });

    updateScrollButtons();
}

async function createRoom() {
    try {
        const response = await fetch(
            `${config.apiBaseUrl}/rooms/create?userId=${elements.userId}&title=${encodeURIComponent(window.i18n?.t('sidebar.newChat', 'Новый чат'))}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': elements.userId
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to create room: ${response.status}`);
        }

        const newRoom = await response.json();
        if (!state.rooms.some(room => room.id === newRoom.id)) {
            state.rooms.push(newRoom);
        }

        renderRoomsList();
        await switchRoom(newRoom);
        return newRoom;
    } catch (error) {
        console.error('Error creating room:', error);
        showNotification(`${window.i18n?.t('error.createRoom', 'Не удалось создать комнату')}: ${error.message}`, 'error');
        return null;
    }
}

function getTempMessage(roomId, messageContent, idPrefix, userId) {
    return {
        id: `${idPrefix}${Date.now()}`,
        roomId,
        userId,
        type: userId !== 'ai-assistant' ? 'USER_MESSAGE' : 'AI_MESSAGE',
        content: messageContent,
        timestamp: new Date().toISOString(),
        fileUrls: null
    };
}


async function generateChatNameFromMessage(message, roomId) {
    try {
        const response = await fetch(
            `${config.apiBaseUrl}/rooms/${roomId}/update?context=${encodeURIComponent(message)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        if (response.ok) {
            const updatedRoom = await response.json();
            // Update the room in the state
            const roomIndex = state.rooms.findIndex(r => r.id === updatedRoom.id);
            if (roomIndex !== -1) {
                state.rooms[roomIndex] = updatedRoom;
            }

            // Update the UI
            renderRoomsList();

            // If this is the current room, update the title
            if (state.currentRoom && state.currentRoom.id === updatedRoom.id) {
                state.currentRoom.title = updatedRoom.title;
                if (elements.currentRoomTitle) {
                    elements.currentRoomTitle.textContent = updatedRoom.title;
                }
            }
        }
    } catch (error) {
        console.error('Error updating chat name:', error);
        // Don't show error to user as this is a background operation
    }
}

async function sendMessage() {
    if (!elements.sendButton || elements.sendButton.disabled) return;

    const messageContent = elements.messageInput?.value.trim() || '';
    const files = elements.fileInput?.files || [];
    if (!messageContent && !files.length) return;

    elements.sendButton.disabled = true;
    if (voiceInput.isListening) {
        voiceInput.stopListening();
    }

    const roomId = state.currentRoom.id;
    const isFirstMessage = state.messages.length === 0;
    let fileData = null;

    // If this is the first message in the chat, generate a name based on the message
    if (isFirstMessage && messageContent) {
        // Don't await this, let it happen in the background
        generateChatNameFromMessage(messageContent, roomId);
    }

    // Upload file first if exists
    if (files.length) {
        try {
            fileData = await uploadFile(files[0]);
        } catch (error) {
            console.error('Error uploading file:', error);
            showNotification(window.i18n?.t('error.fileUpload', 'Ошибка при загрузке файла'), 'error');
            elements.sendButton.disabled = false;
            return;
        }
    }

    // Create temp message with file data if available
    const tempMessage = getTempMessage(roomId, messageContent, 'temp-user-', elements.userId);
    if (fileData) {
        tempMessage.fileData = fileData;
    }

    state.messages.push(tempMessage);
    renderMessages();
    scrollToBottom(true);

    try {
        if (!state.currentRoom) throw new Error('No current room selected');

        if (window.eventSource) {
            window.eventSource.close();
        }

        typingIndicator.show();
        if (elements.filePreview) {
            elements.filePreview.innerHTML = '';
            elements.filePreview.style.display = 'none';
        }

        const url = new URL(`/api/direct/stream`, window.location.origin);
        url.searchParams.append('chatId', roomId);
        url.searchParams.append('question', messageContent);
        if (fileData) {
            url.searchParams.append('fileId', fileData.id);
        }

        if (elements.messageInput) elements.messageInput.value = '';
        if (elements.fileInput) elements.fileInput.value = '';

        eventSource = new EventSource(url.toString());
        chatConnections[roomId] = eventSource;

        if (elements.stopButton) {
            elements.stopButton.style.display = 'flex';
            elements.stopButton.style.visibility = 'visible';
            elements.stopButton.style.opacity = '1';
            elements.stopButton.classList.remove('d-none');
        }

        toggleStreamingUI(true);

        const uuid = generateUUID();
        const messageElement = Object.assign(document.createElement('div'), {
            id: uuid,
            className: 'message ai-message',
            innerHTML: `
                <div class="message-sender">AI</div>
                <div id="cm${uuid}" class="message-content"></div>
            `
        });
        // Assign a stable message-id for streaming element for TTS highlight
        const streamMid = `stream-${uuid}`;
        messageElement.setAttribute('data-message-id', streamMid);

        let response = '';
        let isStreamActive = true;
        // Buffer for live TTS speaking by sentences
        let speakBuf = '';

        eventSource.onmessage = (e) => {
            if (roomId !== state.currentRoom.id || !isStreamActive) return;

            typingIndicator.hide();

            if (!document.getElementById(uuid)) {
                elements.chatMessages.appendChild(messageElement);
            }

            const message = JSON.parse(e.data);

            if (message.isEnd) {
                isStreamActive = false;
                stopStream(roomId);

                if (message.error === 'LIMIT_EXCEEDED') {
                    handleLimitExceeded(uuid);
                } else if (message.error === 'SERVER_ERROR') {
                    onErrorSendMessage(message.content, roomId, tempMessage);
                } else {
                    const finalMsg = getTempMessage(roomId, response, 'temp-ai-', 'ai-assistant');
                    state.messages.push(finalMsg);
                    window.dispatchEvent(new CustomEvent('messageSent'));
                    renderMessages();
                    scrollToBottom(true);
                    // Flush any remaining buffer for live speak
                    try {
                        if (window.tts && window.tts.supported && window.tts.settings.speakWhileGenerating && speakBuf.trim()) {
                            const chunk = speakBuf.replace(/<[^>]*>/g, '');
                            window.tts.speakChunk(chunk, streamMid);
                            speakBuf = '';
                        }
                    } catch (ex) {
                        console.error(ex)
                    }
                    // Autoplay TTS of the final text if enabled and not speaking live
                    try {
                        if (window.tts && window.tts.supported && window.tts.settings.autoplay && !window.tts.settings.speakWhileGenerating && finalMsg?.content) {
                            const plainText = finalMsg.content.replace(/<[^>]*>/g, '');
                            window.tts.play(plainText, finalMsg.id);
                        }
                    } catch (ex) {
                        console.error(ex)
                    }
                }
                elements.stopButton.classList.add('d-none');
            } else {
                response += message.content;
                const contentDiv = document.getElementById(`cm${uuid}`);
                if (contentDiv) {
                    contentDiv.innerHTML = marked.parse(response);
                    Prism.highlightAllUnder(contentDiv);
                    scrollToBottom();
                }
                // Live TTS chunking if enabled
                try {
                    if (window.tts && window.tts.supported && window.tts.settings.speakWhileGenerating) {
                        const deltaPlain = String(message.content || '').replace(/<[^>]*>/g, '');
                        if (deltaPlain) {
                            speakBuf += deltaPlain;
                            // Emit full sentences or lines
                            let cutIndex = -1;
                            while (true) {
                                // find earliest sentence boundary
                                const dot = speakBuf.indexOf('.')
                                const ex = speakBuf.indexOf('!');
                                const q = speakBuf.indexOf('?');
                                const nl = speakBuf.indexOf('\n');
                                const candidates = [dot, ex, q, nl].filter(i => i >= 0);
                                if (!candidates.length) break;
                                cutIndex = Math.min(...candidates);
                                const sentence = speakBuf.slice(0, cutIndex + 1).trim();
                                if (sentence) {
                                    window.tts.speakChunk(sentence, streamMid);
                                }
                                speakBuf = speakBuf.slice(cutIndex + 1);
                            }
                        }
                    }
                } catch (ex) {
                    console.error(ex)
                }
            }
        };

        eventSource.onerror = (e) => {
            isStreamActive = false;
            onErrorSendMessage(null, roomId, tempMessage);
            toggleStreamingUI(false);
        };
    } catch (error) {
        onErrorSendMessage(error, roomId, tempMessage);
    } finally {
        elements.sendButton.disabled = false;
    }
}

function handleLimitExceeded(uuid) {
    elements.messageInput.disabled = true;
    elements.sendButton.disabled = true;
    elements.messageInput.classList.add('grey-color');
    document.getElementById(uuid)?.remove();

    const limitMessages = document.getElementById('limitMessages');
    limitMessages.innerHTML = `
      <div class="limit-messages">
        Превышен лимит сообщений в комнате, пожалуйста создайте новую. Или закончилось количество доступных токенов
      </div>
    `;
}

function onErrorSendMessage(error, roomId, tempMessage) {
    if (error) {
        console.error('Error sending message:', error);
        showNotification('Ошибка отправки сообщения', 'error');
    }

    typingIndicator.hide();
    stopStream(roomId);

    const messageIndex = state.messages.findIndex(m => m.id === tempMessage.id);
    if (messageIndex !== -1) {
        state.messages[messageIndex].error = true;
        renderMessages();
    }
}

function toggleStreamingUI(isStreaming) {
    if (!elements.stopButton) {
        console.error('Stop button element not found in elements object');
        return;
    }

    if (isStreaming) {
        // Show and activate stop button
        elements.stopButton.classList.add('active');
        elements.stopButton.disabled = false;
        elements.stopButton.style.display = 'flex';
        elements.stopButton.style.visibility = 'visible';

        // Disable send button and upload button during streaming
        elements.sendButton.disabled = true;
        if (elements.uploadButton) elements.uploadButton.disabled = true;

        // Update current room state
        if (state.currentRoom) {
            state.currentRoom.isStreaming = true;
        }
    } else {
        // Deactivate stop button but keep it in the layout
        elements.stopButton.classList.remove('active');
        elements.stopButton.disabled = true;

        // Re-enable send button and upload button
        elements.sendButton.disabled = false;
        if (elements.uploadButton) elements.uploadButton.disabled = false;

        // Update current room state
        if (state.currentRoom) {
            state.currentRoom.isStreaming = false;
        }
    }
}

function stopStream(chatId) {
    if (chatConnections[chatId]) {
        chatConnections[chatId].close();
        delete chatConnections[chatId];

        if (state.currentRoom && state.currentRoom.id === chatId) {
            state.currentRoom.isStreaming = false;
        }
        typingIndicator.hide();
        toggleStreamingUI(false);
    }
}

function createDragOverlay(container) {
    return Object.assign(document.createElement('div'), {
        className: 'drag-overlay',
        innerHTML: '<p>Перетащите файлы сюда</p>',
        style: 'display: none;'
    });
}

function setupFileUpload() {
    if (!elements.uploadButton || !elements.fileInput || !elements.messageInput) return;

    const messageInputContainer = elements.messageInput.closest('.message-input');
    if (!messageInputContainer) return;

    // Обработчик клика по кнопке загрузки
    elements.uploadButton.addEventListener('click', (e) => {
        e.preventDefault();
        elements.fileInput.click();
    });

    // Drag and drop
    const dragOverlay = createDragOverlay(messageInputContainer);
    if (!messageInputContainer.contains(dragOverlay)) {
        messageInputContainer.appendChild(dragOverlay);
    }
    let dragCounter = 0;

    const showDragOverlay = () => {
        dragCounter++;
        if (dragCounter === 1) {
            dragOverlay.style.display = 'flex';
            messageInputContainer.classList.add('drag-over');
        }
    };

    const hideDragOverlay = () => {
        dragCounter = Math.max(0, dragCounter - 1);
        if (dragCounter === 0) {
            dragOverlay.style.display = 'none';
            messageInputContainer.classList.remove('drag-over');
        }
    };

    const handlers = {
        dragover: (e) => {
            e.preventDefault();
            e.stopPropagation();
            showDragOverlay();
        },
        dragenter: (e) => {
            e.preventDefault();
            e.stopPropagation();
            showDragOverlay();
        },
        dragleave: (e) => {
            e.preventDefault();
            e.stopPropagation();
            hideDragOverlay();
        },
        drop: (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter = 0; // Reset drag counter
            hideDragOverlay();
            if (e.dataTransfer.files?.length) {
                elements.fileInput.files = e.dataTransfer.files;
                showFilePreviews(Array.from(e.dataTransfer.files));
            }
        }
    };

    Object.entries(handlers).forEach(([event, handler]) => {
        messageInputContainer.removeEventListener(event, handler);
        messageInputContainer.addEventListener(event, handler);
    });

    const documentHandlers = {
        dragover: (e) => e.preventDefault(),
        drop: (e) => {
            e.preventDefault();
            hideDragOverlay();
        }
    };

    Object.entries(documentHandlers).forEach(([event, handler]) => {
        document.removeEventListener(event, handler);
        document.addEventListener(event, handler);
    });
}

function removeFile(index) {
    const files = Array.from(elements.fileInput.files);
    files.splice(index, 1);

    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    elements.fileInput.files = dataTransfer.files;

    showFilePreviews(files);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const showFilePreviews = debounce((files) => {
    if (!elements.filePreview) return;

    elements.filePreview.innerHTML = '';
    elements.filePreview.style.display = files?.length ? 'flex' : 'none';

    // Храним уникальные файлы по имени и размеру
    const uniqueFiles = [];
    const seen = new Set();
    files.forEach(file => {
        const key = `${file.name}:${file.size}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueFiles.push(file);
        }
    });

    uniqueFiles.forEach((file, index) => {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const isImage = file.type.startsWith('image/');
        const previewElement = document.createElement('div');
        previewElement.className = 'file-preview-item';

        if (isImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewElement.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <div class="file-preview-info">
                        <div class="file-preview-name">${file.name}</div>
                        <div class="file-preview-size">${formatFileSize(file.size)}</div>
                    </div>
                    <button type="button" class="file-preview-remove" data-index="${index}" title="Удалить">
                        <i class="bi bi-x"></i>
                    </button>
                `;
                attachRemoveHandler(previewElement, index);
                elements.filePreview.appendChild(previewElement);
            };
            reader.readAsDataURL(file);
        } else {
            previewElement.innerHTML = `
                <div class="file-icon">
                    <i class="bi ${getFileIconClass(fileExtension)}"></i>
                </div>
                <div class="file-preview-info">
                    <div class="file-preview-name">${file.name}</div>
                    <div class="file-preview-size">${formatFileSize(file.size)} • ${fileExtension.toUpperCase()}</div>
                </div>
                <button type="button" class="file-preview-remove" data-index="${index}" title="Удалить">
                    <i class="bi bi-x"></i>
                </button>
            `;
            attachRemoveHandler(previewElement, index);
            elements.filePreview.appendChild(previewElement);
        }
    });

    updateSendButtonState();
}, 100);

function attachRemoveHandler(previewElement, index) {
    const removeBtn = previewElement.querySelector('.file-preview-remove');
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile(index);
        });
    }
}

function getFileIconClass(extension) {
    const iconMap = {
        pdf: 'bi-file-earmark-pdf',
        doc: 'bi-file-earmark-word',
        docx: 'bi-file-earmark-word',
        txt: 'bi-file-earmark-text',
        xls: 'bi-file-earmark-excel',
        xlsx: 'bi-file-earmark-excel',
        default: 'bi-file-earmark'
    };
    return iconMap[extension] || iconMap.default;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateSendButtonState() {
    if (!elements.sendButton) return;

    const hasText = elements.messageInput?.value.trim().length > 0;
    const hasFiles = elements.fileInput?.files?.length > 0;

    elements.sendButton.disabled = !(hasText || hasFiles);
    elements.sendButton.setAttribute('aria-label',
        elements.sendButton.disabled
            ? 'Введите сообщение или прикрепите файл'
            : 'Отправить сообщение'
    );
}

async function uploadFile(file) {
    if (!file) return null;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`File upload failed: ${error}`);
        }

        // Get the file data from the response
        return await response.json();
    } catch (error) {
        console.error('Error uploading file:', error);
        showNotification(`Не удалось загрузить файл: ${error.message}`, 'error');
        throw error;
    }
}

function getFilePreviewUrl(fileData) {
    if (!fileData) return '';

    if (fileData.contentType && fileData.contentType.startsWith('image/')) {
        return `/api/files/${fileData.id}/preview`;
    }

    return ''; // For non-image files, we'll just show an icon
}

function autoResize(element) {
    element.style.height = 'auto';
    element.style.height = Math.min(element.scrollHeight, 100) + 'px';
}

const typingIndicator = {
    timer: null,
    container: null,

    init() {
        try {
            // Check if already initialized
            if (this.container && document.body.contains(this.container)) {
                return true;
            }

            // Try to find existing container or create a new one
            this.container = document.getElementById('typingIndicatorContainer');

            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'typingIndicatorContainer';
                this.container.style.cssText = 'display: none; min-height: 40px;';
                this.container.innerHTML = `
                    <div class="typing-indicator">
                        <div class="typing-dots">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                        </div>
                    </div>`;

                // Find the best place to insert the typing indicator
                const chatContainer = document.querySelector('.chat-messages')?.parentElement ||
                    document.querySelector('.chat-container') ||
                    document.body;

                if (chatContainer) {
                    // Insert before the chat input if possible
                    const chatInput = chatContainer.querySelector('.message-input') ||
                        chatContainer.querySelector('input[type="text"]') ||
                        chatContainer.lastElementChild;

                    if (chatInput) {
                        chatContainer.insertBefore(this.container, chatInput.nextSibling);
                    } else {
                        chatContainer.appendChild(this.container);
                    }
                    return true;
                }
                console.warn('Could not find a suitable container for the typing indicator');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error initializing typing indicator:', error);
            return false;
        }
    },

    show() {
        if (!this.init()) return;
        clearTimeout(this.timer);
        this.container.style.display = 'block';
        this.timer = setTimeout(() => this.hide(), 320000);
        this.scrollToBottom();
    },

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            clearTimeout(this.timer);
        }
    },

    scrollToBottom() {
        const container = this.container?.parentElement;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
};

// Voice input functionality
const voiceInput = {
    isListening: false,
    recognition: null,
    finalTranscript: '',

    init() {
        // Check for browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showUnsupportedMessage();
            return;
        }

        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = ((navigator.language || navigator.userLanguage || 'en')
            .toLowerCase()
            .startsWith('ru')) ? 'ru-RU' : 'en-EN';

        // Setup event handlers
        this.recognition.onstart = this.onStart.bind(this);
        this.recognition.onresult = this.onResult.bind(this);
        this.recognition.onerror = this.onError.bind(this);
        this.recognition.onend = this.onEnd.bind(this);

        // Add click handler to the voice input button
        const voiceBtn = document.getElementById('voiceInputBtn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', this.toggleListening.bind(this));
        }

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                this.toggleListening();
            }
        });
    },

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    },

    startListening() {
        if (!this.recognition) return;

        this.finalTranscript = '';
        this.isListening = true;
        document.getElementById('voiceInputBtn').classList.add('recording');

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            this.showError('Ошибка при запуске распознавания речи');
            this.stopListening();
        }
    },

    stopListening() {
        if (!this.recognition) return;

        this.isListening = false;

        try {
            this.recognition.stop();
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }

        const voiceBtn = document.getElementById('voiceInputBtn');
        if (voiceBtn) {
            voiceBtn.classList.remove('recording');
        }
    },

    onStart() {
        // Only clear on first start, not on auto-restart
        if (!this.isListening) {
            this.finalTranscript = '';
            showNotification('Диктуйте... (нажмите еще раз для остановки)', 'info');
        }
        this.isListening = true;
    },

    onResult(event) {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;

            if (result.isFinal) {
                // Add space between phrases for better readability
                this.finalTranscript = (this.finalTranscript + ' ' + transcript).trim();
                // Reset interim transcript when we get a final result
                interimTranscript = '';
            } else {
                // Show interim results as they come in
                interimTranscript = transcript;
            }
        }

        // Update the input field with both final and interim results
        const input = document.getElementById('messageInput');
        const displayText = (this.finalTranscript + ' ' + interimTranscript).trim();
        input.value = displayText;

        // Move cursor to the end of the input
        input.focus();
        input.setSelectionRange(displayText.length, displayText.length);

        // Trigger input event for any listeners
        input.dispatchEvent(new Event('input'));
    },

    // Clear the current transcription
    clearTranscription() {
        this.finalTranscript = '';
        const input = document.getElementById('messageInput');
        input.value = '';
        input.dispatchEvent(new Event('input'));
    },

    onError(event) {
        console.error('Speech recognition error', event.error);

        let errorMessage = 'Ошибка распознавания речи';
        if (event.error === 'not-allowed') {
            errorMessage = 'Доступ к микрофону запрещен. Пожалуйста, разрешите доступ к микрофону в настройках браузера.';
        } else if (event.error === 'audio-capture') {
            errorMessage = 'Не удалось получить доступ к микрофону. Убедитесь, что микрофон подключен и настроен правильно.';
        }

        this.showError(errorMessage);
        this.stopListening();
    },

    onEnd() {
        if (this.isListening) {
            try {
                // Restart recognition if it was stopped unexpectedly
                this.recognition.start();
            } catch (e) {
                console.error('Error restarting recognition:', e);
                this.stopListening();
            }
        }
    },

    showUnsupportedMessage() {
        const voiceBtn = document.getElementById('voiceInputBtn');
        if (voiceBtn) {
            voiceBtn.disabled = true;
            voiceBtn.title = 'Голосовой ввод не поддерживается в вашем браузере';
            voiceBtn.classList.add('tooltip');

            const tooltip = document.createElement('span');
            tooltip.className = 'tooltiptext';
            tooltip.textContent = 'Голосовой ввод поддерживается в последних версиях Chrome, Edge, Safari и других современных браузеров';
            voiceBtn.appendChild(tooltip);
        }
    },

    showError(message) {
        showNotification(message, 'error');
    }
};

const uxFeatures = {
    // Copy message functionality
    copyMessage: {
        addCopyButton(messageElement, content) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'message-copy-btn';
            copyBtn.innerHTML = '<i class="bi bi-copy"></i>';
            copyBtn.title = 'Копировать сообщение';

            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(content);
                    copyBtn.innerHTML = '<i class="bi bi-check"></i>';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="bi bi-copy"></i>';
                    }, 2000);
                    showNotification('Сообщение скопировано', 'success');
                } catch (error) {
                    console.error('Failed to copy:', error);
                    showNotification(window.i18n?.t('notify.copyError', 'Ошибка копирования'), 'error');
                }
            });

            messageElement.appendChild(copyBtn);
        }
    }
};

async function handleDeleteRoom(roomId, title) {
    if (!roomId || !title || !await confirmDeleteChat(title)) {
        return;
    }

    // Show loading state
    const deleteButton = document.querySelector(`[data-room-id="${roomId}"] .delete-room`);
    const originalText = deleteButton?.innerHTML;
    if (deleteButton) {
        deleteButton.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>';
        deleteButton.disabled = true;
    }

    try {
        const response = await fetch(`${config.apiBaseUrl}/rooms/${roomId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': elements.userId
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const wasCurrentRoom = state.currentRoom?.id === roomId;
        state.rooms = state.rooms.filter(room => room.id !== roomId);

        if (wasCurrentRoom) {
            state.currentRoom = null;
            state.messages = [];
            elements.chatMessages.innerHTML = '';
            elements.currentRoomTitle.textContent = window.i18n?.t('chat.header.selectOrCreate', 'Выберите или создайте чат');
        }

        renderRoomsList();

        // Switch to another room if available
        if (state.rooms.length > 0) {
            if (wasCurrentRoom) {
                await switchRoom(state.rooms[0]);
            }
        } else {
            // Create a new welcome screen
            const welcomeScreen = document.createElement('div');
            welcomeScreen.id = 'welcomeScreen';
            welcomeScreen.className = 'h-100 d-flex flex-column align-items-center justify-content-center text-center p-4';
            welcomeScreen.style.maxWidth = '800px';
            welcomeScreen.style.margin = '0 auto';
            welcomeScreen.style.display = 'flex';

            welcomeScreen.innerHTML = `
                <div class="mb-4" style="width: 130px; height: 130px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.2);">
                    <i class="bi bi-robot" style="font-size: 3.5rem; color: white;"></i>
                </div>
                <h3 class="mb-3 fw-bold" data-i18n="welcome.title">Добро пожаловать в AI Чат-ассистент</h3>
                <p class="text-muted mb-4 fs-5" data-i18n="welcome.subtitle">Ваш интеллектуальный помощник для решения любых задач. Задавайте вопросы, получайте консультации и находите решения прямо сейчас!</p>
                <button id="createRoomBtn1" class="btn btn-primary btn-lg px-4 py-2 shadow-sm" onclick="createRoom()">
                    <i class="bi bi-plus-lg me-2"></i><span data-i18n="welcome.start">Начать новый диалог</span>
                </button>
                <div class="mt-5 pt-4 border-top w-100">
                    <h5 class="mb-4" data-i18n="welcome.section.title">Что я могу для вас сделать:</h5>
                    <div class="row g-4">
                        <div class="col-md-6">
                            <div class="card h-100 border-0 shadow-sm hover-shadow cursor-pointer transition-all"
                                 onclick="setExampleQuestion(window.i18n?.t('welcome.cards.idea.text', 'Какие есть интересные идеи для веб-приложения на Spring Boot и Jakarta EE?'))">
                                <div class="card-body">
                                    <div class="d-flex align-items-center mb-3">
                                        <div class="bg-primary bg-opacity-10 p-2 rounded-circle me-3">
                                            <i class="bi bi-lightbulb-fill text-primary"></i>
                                        </div>
                                        <h6 class="mb-0 fw-bold" data-i18n="welcome.cards.idea.title">Идеи для разработки</h6>
                                    </div>
                                    <p class="text-muted mb-0" data-i18n="welcome.cards.idea.text">Какие есть интересные идеи для веб-приложения на Spring Boot и Jakarta EE?</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100 border-0 shadow-sm hover-shadow cursor-pointer transition-all"
                                 onclick="setExampleQuestion(window.i18n?.t('welcome.cards.optimize.text', 'Как оптимизировать SQL-запрос с множественными JOIN и подзапросами?'))">
                                <div class="card-body">
                                    <div class="d-flex align-items-center mb-3">
                                        <div class="bg-success bg-opacity-10 p-2 rounded-circle me-3">
                                            <i class="bi bi-code-square text-success"></i>
                                        </div>
                                        <h6 class="mb-0 fw-bold" data-i18n="welcome.cards.optimize.title">Оптимизация кода</h6>
                                    </div>
                                    <p class="text-muted mb-0" data-i18n="welcome.cards.optimize.text">Как оптимизировать SQL-запрос с множественными JOIN и подзапросами?</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100 border-0 shadow-sm hover-shadow cursor-pointer transition-all"
                                 onclick="setExampleQuestion(window.i18n?.t('welcome.cards.arch.text', 'Как создать RESTful API с Jakarta EE и документировать его с OpenAPI?'))">
                                <div class="card-body">
                                    <div class="d-flex align-items-center mb-3">
                                        <div class="bg-info bg-opacity-10 p-2 rounded-circle me-3">
                                            <i class="bi bi-gear-fill text-info"></i>
                                        </div>
                                        <h6 class="mb-0 fw-bold" data-i18n="welcome.cards.arch.title">Архитектура приложений</h6>
                                    </div>
                                    <p class="text-muted mb-0" data-i18n="welcome.cards.arch.text">Как создать RESTful API с Jakarta EE и документировать его с OpenAPI?</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card h-100 border-0 shadow-sm hover-shadow cursor-pointer transition-all"
                                 onclick="setExampleQuestion(window.i18n?.t('welcome.cards.examples.text', 'Напиши пример использования Spring Data JPA с Lombok для создания сущности и репозитория'))">
                                <div class="card-body">
                                    <div class="d-flex align-items-center mb-3">
                                        <div class="bg-warning bg-opacity-10 p-2 rounded-circle me-3">
                                            <i class="bi bi-file-earmark-code-fill text-warning"></i>
                                        </div>
                                        <h6 class="mb-0 fw-bold" data-i18n="welcome.cards.examples.title">Примеры кода</h6>
                                    </div>
                                    <p class="text-muted mb-0" data-i18n="welcome.cards.examples.text">Напиши пример использования Spring Data JPA с Lombok для создания сущности и репозитория</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;

            try { window.i18n?.apply(welcomeScreen); } catch (_) {}

            // Clear chat messages and append new welcome screen
            elements.chatMessages.innerHTML = '';
            elements.chatMessages.appendChild(welcomeScreen);

            // Hide the typing indicator if it's visible
            const typingIndicator = document.querySelector('.typing-indicator');
            if (typingIndicator) {
                typingIndicator.style.display = 'none';
            }
            hideInputs(true);
            localStorage.removeItem('lastRoomId');
        }

        showNotification(window.i18n?.t('success.chatDeleted', 'Чат успешно удалён'), 'success');
    } catch (error) {
        console.error('Error deleting room:', error);
        showNotification(`${window.i18n?.t('error.deleteChat', 'Не удалось удалить чат')}: ${error.message}`, 'error');
    } finally {
        // Restore button state
        if (deleteButton) {
            deleteButton.innerHTML = originalText;
            deleteButton.disabled = false;
        }
    }
}

async function confirmDeleteChat(title) {
    const result = await Swal.fire({
        title: `<span class="delete-title">${window.i18n?.t('delete.confirm.title', 'Подтверждение удаления')}</span>`,
        html: `<div class="delete-message">
                <div class="delete-icon-container">
                    <i class="bi bi-trash-fill delete-icon-animated"></i>
                </div>
                <p>${window.i18n?.t('delete.confirm.text', 'Вы уверены, что хотите удалить чат')}</p>
                <p class="chat-title">«${title}»</p>
                <p class="delete-warning">${window.i18n?.t('delete.confirm.warning', 'Это действие нельзя будет отменить')}</p>
              </div>`,
        icon: null,
        showCancelButton: true,
        confirmButtonText: `<i class="bi bi-trash me-1"></i> ${window.i18n?.t('delete.confirm.ok', 'Удалить')}`,
        cancelButtonText: `<i class="bi bi-x me-1"></i> ${window.i18n?.t('delete.confirm.cancel', 'Отмена')}`,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        reverseButtons: true,
        backdrop: true,
        customClass: {
            container: 'delete-dialog-container',
            popup: 'delete-dialog-popup',
            title: 'delete-dialog-title',
            confirmButton: 'btn-delete-confirm',
            cancelButton: 'btn-delete-cancel',
            actions: 'delete-dialog-actions'
        },
        buttonsStyling: true,
        allowOutsideClick: false,
        showClass: {
            popup: 'animate__animated animate__fadeInDown animate__faster'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp animate__faster'
        },
        didOpen: (modal) => {
            // Добавляем стили для красивого отображения диалога
            const style = document.createElement('style');
            style.textContent = `
                .delete-dialog-container {
                    z-index: 1060;
                }
                .delete-dialog-popup {
                    border-radius: 16px;
                    box-shadow: 0 12px 24px rgba(0,0,0,0.2);
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    padding: 24px;
                    max-width: 400px;
                }
                .delete-title {
                    font-weight: 600;
                    font-size: 1.25rem;
                    margin-bottom: 0;
                    color: var(--danger-color);
                }
                .delete-message {
                    margin: 20px 0;
                    text-align: center;
                }
                .delete-icon-container {
                    margin-bottom: 16px;
                }
                .delete-icon-animated {
                    font-size: 3rem;
                    color: var(--danger-color);
                    animation: shake 0.5s ease-in-out 0.2s;
                    display: inline-block;
                }
                .chat-title {
                    font-weight: 600;
                    font-size: 1.1rem;
                    margin: 8px 0;
                    color: var(--text-primary);
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .delete-warning {
                    margin-top: 16px;
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }
                .delete-dialog-actions {
                    margin-top: 16px;
                    gap: 12px;
                }
                .btn-delete-confirm {
                    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
                    transition: all 0.2s ease;
                    border-radius: 8px;
                    font-weight: 500;
                }
                .btn-delete-confirm:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(220, 53, 69, 0.5);
                }
                .btn-delete-confirm:active {
                    transform: translateY(0);
                }
                .btn-delete-cancel {
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    font-weight: 500;
                }
                .btn-delete-cancel:hover {
                    transform: translateY(-2px);
                }
                @keyframes shake {
                    0%, 100% { transform: rotate(0); }
                    20% { transform: rotate(-10deg); }
                    40% { transform: rotate(10deg); }
                    60% { transform: rotate(-10deg); }
                    80% { transform: rotate(10deg); }
                }
            `;
            document.head.appendChild(style);

            // Добавляем эффект при открытии
            setTimeout(() => {
                const icon = modal.querySelector('.delete-icon-animated');
                if (icon) icon.style.animation = 'shake 0.5s ease-in-out';
            }, 200);

            // Убираем стили при закрытии
            modal.addEventListener('close', () => {
                document.head.removeChild(style);
            });
        }
    });

    return result.isConfirmed;
}

function showNotification(message, type = 'info') {
    const notification = Object.assign(document.createElement('div'), {
        className: `notification ${type}`,
        textContent: message
    });
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

function hideInputs(disabled) {
    elements.messageInput.disabled = disabled;
    elements.sendButton.disabled = disabled;
    elements.uploadButton.disabled = disabled;
    elements.uploadButton.classList.toggle('d-none', disabled);
    elements.messageInput.classList.toggle('d-none', disabled);
    elements.sendButton.classList.toggle('d-none', disabled);
    document.getElementById("messageInputArea").classList.toggle('d-none', disabled);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// Image modal functionality
const imageModal = {
    modal: null,

    init() {
        this.modal = this.createModal();
        document.body.appendChild(this.modal);
        this.setupEventListeners();
    },

    createModal() {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <button class="image-modal-close" aria-label="Close">
                <i class="bi bi-x"></i>
            </button>
            <img src="" alt="">
        `;
        return modal;
    },

    setupEventListeners() {
        // Close modal on close button click
        this.modal.querySelector('.image-modal-close').addEventListener('click', () => {
            this.hide();
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.hide();
            }
        });
    },

    show(imageSrc, imageAlt = '') {
        const img = this.modal.querySelector('img');
        img.src = imageSrc;
        img.alt = imageAlt;
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    },

    hide() {
        this.modal.classList.remove('show');
        document.body.style.overflow = '';
    }
};

// Track last clicked room and menu state
let lastClickedRoom = null;
let isContextMenuOpen = false;

// Show context menu for room actions
function showContextMenu(event, roomId, roomElement, isPinned = false) {
    // Prevent default context menu
    event.preventDefault();
    event.stopPropagation();

    // Get context menu element
    const contextMenu = document.getElementById('roomContextMenu');
    if (!contextMenu) return;

    // Check if clicking the same room with an open menu
    const isSameRoom = lastClickedRoom === roomId;
    const menuIsVisible = contextMenu.classList.contains('visible');

    if (isSameRoom && menuIsVisible) {
        hideContextMenu();
        return;
    }

    // Update state
    contextMenuState.roomId = roomId;
    contextMenuState.roomElement = roomElement;
    lastClickedRoom = roomId;
    isContextMenuOpen = true;

    // Update pin menu item text and icon based on current pin state
    const pinItem = contextMenu.querySelector('[data-action="pin"]');
    if (pinItem) {
        const pinIcon = pinItem.querySelector('i');
        const pinText = pinItem.querySelector('.pin-text');
        if (pinIcon) {
            pinIcon.className = isPinned ? 'bi bi-pin-angle-fill' : 'bi bi-pin-angle';
        }
        if (pinText) {
            pinText.textContent = isPinned
                ? window.i18n?.t('context.unpin', 'Открепить')
                : window.i18n?.t('context.pin', 'Закрепить');
        }
    }

    // Position the menu
    const x = Math.min(event.clientX, window.innerWidth - 250); // 250 is the min-width of the menu
    const y = Math.min(event.clientY, window.innerHeight - 200); // Approximate height of the menu

    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;

    // Show the context menu with animation
    contextMenu.classList.remove('d-none');
    contextMenu.classList.add('visible');

    // Add click handler for the entire document
    const clickHandler = (e) => {
        // If click is outside the context menu, hide it
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
            document.removeEventListener('click', clickHandler);
        }
    };

    // Add the click handler with a small delay to prevent immediate closing
    setTimeout(() => {
        document.addEventListener('click', clickHandler, { once: true });
    }, 10);
}

// Hide context menu
function hideContextMenu() {
    const contextMenu = document.getElementById('roomContextMenu');
    if (contextMenu) {
        contextMenu.classList.remove('visible');
        setTimeout(() => {
            contextMenu.classList.add('d-none');
        }, 150); // Match this with CSS transition duration
    }
    document.removeEventListener('click', handleClickOutside);
}

// Handle clicks outside the context menu
function handleClickOutside(event) {
    hideContextMenu();
}

// Handle context menu actions
function handleContextMenuAction(action) {
    const roomId = contextMenuState.roomId;
    const roomElement = contextMenuState.roomElement;

    if (!roomId || !roomElement) return;

    switch (action) {
        case 'pin':
            togglePin(roomId);
            break;
        case 'rename':
            showRenameRoomModal(roomId, roomElement.getAttribute('data-room-title'));
            break;
        case 'export':
            exportChatHistory(roomId);
            break;
        case 'delete':
            handleDeleteRoom(roomId, roomElement.getAttribute('data-room-title'));
            break;
    }

    hideContextMenu();
}

// Show rename room modal
function showRenameRoomModal(roomId, currentTitle) {
    // Unified SweetAlert2 dialog styled similarly to delete confirmation
    Swal.fire({
        title: `<span class="rename-title">${window.i18n?.t('rename.title', 'Переименовать чат')}</span>`,
        input: 'text',
        inputValue: currentTitle || '',
        inputAttributes: {
            maxlength: '50',
            autocapitalize: 'off',
            autocorrect: 'off',
            'aria-label': window.i18n?.t('rename.label', 'Новое название')
        },
        html: `<div class="rename-message">
                <div class="rename-icon-container">
                    <i class="bi bi-pencil-square rename-icon-animated"></i>
                </div>
                <p class="text-muted mb-0">${window.i18n?.t('rename.placeholder', 'Введите новое название чата')}</p>
               </div>`,
        showCancelButton: true,
        confirmButtonText: `<i class="bi bi-check-lg me-1"></i> ${window.i18n?.t('common.save', 'Сохранить')}`,
        cancelButtonText: `<i class="bi bi-x me-1"></i> ${window.i18n?.t('common.cancel', 'Отмена')}`,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d',
        reverseButtons: true,
        backdrop: true,
        customClass: {
            container: 'rename-dialog-container',
            popup: 'rename-dialog-popup',
            title: 'rename-dialog-title',
            confirmButton: 'btn-rename-confirm',
            cancelButton: 'btn-rename-cancel',
            actions: 'rename-dialog-actions',
            input: 'rename-dialog-input'
        },
        buttonsStyling: true,
        allowOutsideClick: false,
        focusConfirm: false,
        showClass: {
            popup: 'animate__animated animate__fadeInDown animate__faster'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp animate__faster'
        },
        didOpen: (modal) => {
            const style = document.createElement('style');
            style.textContent = `
                .rename-dialog-container { z-index: 1060; }
                .rename-dialog-popup {
                    border-radius: 16px;
                    box-shadow: 0 12px 24px rgba(0,0,0,0.2);
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    padding: 24px;
                    max-width: 420px;
                }
                .rename-title {
                    font-weight: 600;
                    font-size: 1.25rem;
                    margin-bottom: 0;
                    color: var(--primary-color, #0d6efd);
                }
                .rename-message { margin: 12px 0 8px; text-align: center; }
                .rename-icon-container { margin-bottom: 10px; }
                .rename-icon-animated {
                    font-size: 2.5rem;
                    color: var(--primary-color, #0d6efd);
                    animation: pulse 0.6s ease-in-out 0.2s;
                    display: inline-block;
                }
                .rename-dialog-input {
                    margin-top: 6px;
                }
                .rename-dialog-actions { margin-top: 10px; gap: 12px; }
                .btn-rename-confirm {
                    box-shadow: 0 4px 12px rgba(13, 110, 253, 0.35);
                    transition: all 0.2s ease; border-radius: 8px; font-weight: 500;
                }
                .btn-rename-confirm:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(13, 110, 253, 0.45); }
                .btn-rename-confirm:active { transform: translateY(0); }
                .btn-rename-cancel { border-radius: 8px; transition: all 0.2s ease; font-weight: 500; }
                .btn-rename-cancel:hover { transform: translateY(-2px); }
                @keyframes pulse { 0%{ transform: scale(0.95);} 50%{ transform: scale(1.03);} 100%{ transform: scale(1);} }
            `;
            document.head.appendChild(style);
            modal.addEventListener('close', () => {
                if (style.parentNode) document.head.removeChild(style);
            });
        },
        preConfirm: () => {
            const value = Swal.getInput()?.value?.trim();
            if (!value) {
                Swal.showValidationMessage('Название не может быть пустым');
                return false;
            }
            return value;
        }
    }).then(async (result) => {
        if (!result.isConfirmed) return;
        const newTitle = result.value;
        try {
            const response = await fetch(`${config.apiBaseUrl}/rooms/${roomId}/rename?title=${encodeURIComponent(newTitle)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error('Не удалось переименовать чат');

            // Update room title in the UI
            const roomElement = document.querySelector(`.room-item[data-room-id="${roomId}"]`);
            if (roomElement) {
                const nameElement = roomElement.querySelector('.room-name');
                if (nameElement) {
                    nameElement.textContent = newTitle;
                    nameElement.title = newTitle;
                    roomElement.setAttribute('data-room-title', newTitle);
                }
                if (state.currentRoom?.id === roomId) {
                    state.currentRoom.title = newTitle;
                    document.getElementById('currentRoomTitle').textContent = newTitle;
                }
            }
            showNotification('Чат успешно переименован', 'success');
        } catch (error) {
            console.error('Error renaming room:', error);
            showNotification('Ошибка при переименовании чата', 'error');
        }
    });
}

/**
 * Универсальный компонент для отображения состояния загрузки
 */
const loadingState = {
    /**
     * Показывает индикатор загрузки с возможностью отмены
     * @param {Object} options - Опции для настройки индикатора загрузки
     * @param {string} [options.message='Загрузка...'] - Сообщение для отображения
     * @param {Function} [options.onCancel=null] - Функция, вызываемая при отмене
     * @param {string} [options.buttonText='Отмена'] - Текст кнопки отмены
     */
    show: function(options = {}) {
        const {
            message = 'Загрузка...',
            onCancel = null,
            buttonText = 'Отмена'
        } = options;

        // Создаем элемент индикатора загрузки, если он не существует
        let loadingElement = document.getElementById('loading-overlay-component');

        if (!loadingElement) {
            loadingElement = document.createElement('div');
            loadingElement.id = 'loading-overlay-component';
            loadingElement.innerHTML = `
                <div class="loading-overlay">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Загрузка</span>
                    </div>
                    <p id="loading-message">${message}</p>
                    ${onCancel ? `<button class="btn btn-sm btn-outline-light mt-2" id="cancel-loading-btn">${buttonText}</button>` : ''}
                </div>
            `;
            document.body.appendChild(loadingElement);
        } else {
            // Обновляем сообщение и кнопку, если элемент уже существует
            const messageEl = loadingElement.querySelector('#loading-message');
            if (messageEl) messageEl.textContent = message;

            const cancelBtn = loadingElement.querySelector('#cancel-loading-btn');

            if (onCancel) {
                if (!cancelBtn) {
                    const cancelBtnNew = document.createElement('button');
                    cancelBtnNew.id = 'cancel-loading-btn';
                    cancelBtnNew.className = 'btn btn-sm btn-outline-light mt-2';
                    cancelBtnNew.textContent = buttonText;
                    loadingElement.querySelector('.loading-overlay').appendChild(cancelBtnNew);
                } else {
                    cancelBtn.textContent = buttonText;
                    cancelBtn.style.display = '';
                }
            } else if (cancelBtn) {
                cancelBtn.style.display = 'none';
            }
        }

        // Добавляем обработчик для кнопки отмены
        const cancelBtn = loadingElement.querySelector('#cancel-loading-btn');

        if (cancelBtn) {
            // Удаляем все существующие обработчики
            const newCancelBtn = cancelBtn.cloneNode(true);
            if (cancelBtn.parentNode) {
                cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            }

            if (onCancel) {
                newCancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    onCancel();
                    this.hide();
                });
            }
        }

        // Показываем индикатор загрузки
        loadingElement.style.display = 'block';
        document.body.style.overflow = 'hidden';
    },

    /**
     * Скрывает индикатор загрузки
     */
    hide: function() {
        const loadingElement = document.getElementById('loading-overlay-component');
        if (loadingElement) {
            loadingElement.style.display = 'none';
            document.body.style.overflow = '';
        }
    },

    /**
     * Обновляет сообщение в индикаторе загрузки
     * @param {string} message - Новое сообщение
     */
    updateMessage: function(message) {
        const loadingElement = document.getElementById('loading-overlay-component');
        if (loadingElement) {
            const messageEl = loadingElement.querySelector('#loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
    }
};

// Export chat history
let exportController = null;

async function exportChatHistory(roomId) {
    if (!roomId) {
        showNotification('Ошибка: ID комнаты не указан', 'error');
        return;
    }

    // Показываем индикатор загрузки с возможностью отмены
    loadingState.show({
        message: 'Экспорт истории чата...',
        buttonText: 'Отменить',
        onCancel: () => {
            if (exportController) {
                exportController.abort();
                exportController = null;
                showNotification('Экспорт отменен', 'info');
            }
        }
    });

    try {
        // Создаем новый AbortController для этого запроса
        exportController = new AbortController();
        const signal = exportController.signal;

        const response = await fetch(`${config.apiBaseUrl}/rooms/${roomId}/export`, {
            headers: {
                'X-User-Id': elements.userId
            },
            signal: signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        // Обрабатываем ответ
        const blob = await response.blob();

        // Получаем имя файла из заголовков или используем стандартное
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `chat_history_${roomId}.txt`;

        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename=\"(.+)\"/i);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        // Создаем URL и ссылку для скачивания
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Очищаем ресурсы
        setTimeout(() => {
            URL.revokeObjectURL(url);
            a.remove();
        }, 100);

        showNotification('История чата успешно экспортирована', 'success');
    } catch (error) {
        // Не показываем ошибку, если запрос был отменен
        if (error.name !== 'AbortError') {
            console.error('Ошибка экспорта:', error);
            showNotification('Ошибка при экспорте истории: ' + (error.message || 'Неизвестная ошибка'), 'error');
        }
    } finally {
        loadingState.hide();
        exportController = null;

        // Закрываем сайдбар в мобильной версии
        if (window.innerWidth < 768 && window.sidebarManager) {
            setTimeout(() => window.sidebarManager.close(), 150);
        }
    }
}

function renderMessages() {
    if (!elements.chatMessages) return;

    elements.chatMessages.innerHTML = '';

    if (!state.messages.length && state.currentRoom) {
        const t = (k, f) => (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t(k, f) : (f || k);
        const s1 = t('emptyChat.suggestion.1', 'Расскажи о себе');
        const s2 = t('emptyChat.suggestion.2', 'Помоги мне с Java');
        const s3 = t('emptyChat.suggestion.3', 'Что такое Spring Data JPA?');
        const esc = (str) => String(str).replace(/'/g, "&#39;");
        elements.chatMessages.innerHTML = `
            <div class="empty-chat-container">
                <div class="empty-chat-illustration">
                    <i class="bi bi-chat-dots"></i>
                </div>
                <h4>${t('emptyChat.title', 'Начните общение')}</h4>
                <p class="text-muted">${t('emptyChat.subtitle', 'Это начало вашего разговора с AI ассистентом. Чем я могу вам помочь?')}</p>
                <div class="empty-chat-suggestions">
                    <button class="suggestion-btn" onclick="setExampleQuestion('${esc(s1)}')">${s1}</button>
                    <button class="suggestion-btn" onclick="setExampleQuestion('${esc(s2)}')">${s2}</button>
                    <button class="suggestion-btn" onclick="setExampleQuestion('${esc(s3)}')">${s3}</button>
                </div>
            </div>`;
        return;
    }

    const sortedMessages = [...state.messages].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
    );

    sortedMessages.forEach((message, idx) => {
        const mid = String(
            message.id ?? message.uuid ?? message._id ?? message.messageId ?? `${message.timestamp || Date.now()}-${idx}`
        );
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.userId === elements.userId ? 'user-message' : 'ai-message'}`;
        messageElement.setAttribute('data-message-id', mid);

        // File previews with click handlers
        let filePreviews = '';
        if (message.fileData) {
            const fileData = message.fileData;
            const fileExtension = fileData.fileName ? fileData.fileName.split('.').pop().toLowerCase() : '';
            const isImage = fileData.contentType && fileData.contentType.startsWith('image/');
            const fileUrl = `/api/files/${fileData.id}`;
            const previewUrl = getFilePreviewUrl(fileData);

            filePreviews = '<div class="message-files">';

            if (isImage) {
                filePreviews += `
                    <div class="message-file-preview">
                        <img src="${previewUrl || fileUrl}" 
                             alt="${fileData.fileName || 'Image'}" 
                             class="message-file-thumbnail" 
                             loading="lazy"
                             data-full-src="${fileUrl}"
                             data-filename="${fileData.fileName || 'image'}">
                    </div>`;
            } else {
                filePreviews += `
                    <div class="message-file">
                        <a href="${fileUrl}" download="${fileData.fileName || 'download'}" class="file-link">
                            <i class="bi ${getFileIconClass(fileExtension)} file-icon"></i>
                            <div class="file-info">
                                <div class="file-name">${fileData.fileName || 'File'}</div>
                                ${fileData.size ? `<div class="file-size">${formatFileSize(fileData.size)}</div>` : ''}
                            </div>
                        </a>
                    </div>`;
            }
            filePreviews += '</div>';
        }

        const isAI = message.userId !== elements.userId;
        const disabledAttr = tts.supported ? '' : 'disabled title="TTS не поддерживается браузером"';
        const ttsControls = (isAI && message.content) ? `
            <div class="tts-controls d-inline-flex align-items-center gap-1" data-message-id="${mid}" title="Озвучить ответ">
                <button class="btn btn-sm btn-outline-secondary" data-tts="play" aria-label="Озвучить" ${disabledAttr}><i class="bi bi-volume-up"></i></button>
                <button class="btn btn-sm btn-outline-secondary" data-tts="pause" aria-label="Пауза" ${disabledAttr}><i class="bi bi-pause"></i></button>
                <button class="btn btn-sm btn-outline-secondary" data-tts="resume" aria-label="Продолжить" ${disabledAttr}><i class="bi bi-play"></i></button>
                <button class="btn btn-sm btn-outline-secondary" data-tts="stop" aria-label="Стоп" ${disabledAttr}><i class="bi bi-stop"></i></button>
            </div>
        ` : '';

        messageElement.innerHTML = `
            <div class="message-sender">${isAI ? 'AI' : 'Вы'}</div>
            ${filePreviews}
            <div class="message-content">${message.content ? marked.parse(message.content) : ''}</div>
            <div class="message-meta d-flex align-items-center gap-2">
                <span class="message-time">${formatTime(message.timestamp)}</span>
                ${message.error ? '<span class="message-status">(не отправлено)</span>' : ''}
                ${ttsControls}
            </div>
        `;

        // Add copy button for non-empty messages
        if (message.content && message.content.trim()) {
            uxFeatures.copyMessage.addCopyButton(messageElement, message.content);
        }

        elements.chatMessages.appendChild(messageElement);

        // Bind TTS controls for AI messages
        if (isAI && message.content) {
            const ctrl = messageElement.querySelector('.tts-controls');
            if (ctrl) {
                const textToSpeak = message.content.replace(/<[^>]*>/g, '');
                const playBtn = ctrl.querySelector('[data-tts="play"]');
                const pauseBtn = ctrl.querySelector('[data-tts="pause"]');
                const resumeBtn = ctrl.querySelector('[data-tts="resume"]');
                const stopBtn = ctrl.querySelector('[data-tts="stop"]');
                if (tts.supported) {
                    if (playBtn) playBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        // Immediate UI feedback
                        try {
                            document.querySelectorAll('.message.message-playing').forEach(m => m.classList.remove('message-playing'));
                            const container = ctrl.closest('.message');
                            if (container) container.classList.add('message-playing');
                        }  catch (ex) {
                            console.error(ex)
                        }
                        tts.play(textToSpeak, mid);
                    });
                    if (pauseBtn) pauseBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        tts.pause();
                    });
                    if (resumeBtn) resumeBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        tts.resume();
                    });
                    if (stopBtn) stopBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        tts.stop();
                        // Remove highlight immediately
                        try {
                            const container = ctrl.closest('.message');
                            if (container) container.classList.remove('message-playing');
                        } catch (ex) {
                            console.error(ex)
                        }
                    });
                }
            }
        }
    });

    // Add click handlers for images
    elements.chatMessages.querySelectorAll('.message-file-thumbnail').forEach(img => {
        img.addEventListener('click', (e) => {
            e.preventDefault();
            const fullSrc = img.getAttribute('data-full-src');
            const filename = img.getAttribute('data-filename');
            imageModal.show(fullSrc, filename);
        });
    });

    Prism.highlightAll();
    // Re-apply TTS UI and playing highlight after DOM update
    try { if (window.tts && typeof window.tts.updateControlsState === 'function') window.tts.updateControlsState(); } catch (_) { /* noop */ }
    scrollToBottom(true);
}

// Функция поиска чатов
function setupChatSearch() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'chat-search-container mb-2';
    searchContainer.innerHTML = `
    <div class="search-box position-relative">
        <i class="bi bi-search position-absolute start-0 top-50 translate-middle-y ms-3 text-muted"></i>
        <input type="text" id="chatSearchInput" class="form-control rounded-pill ps-5" data-i18n-attr="placeholder" data-i18n="search.room" placeholder="Поиск чатов...">
        <i id="clearSearchBtn" class="bi bi-x-circle position-absolute end-0 top-50 translate-middle-y me-3 text-muted d-none" style="cursor: pointer;"></i>
    </div>
`;

// Вставляем контейнер поиска перед списком чатов
    const roomsList = document.getElementById('roomsList');
    if (roomsList && roomsList.parentNode) {
        roomsList.parentNode.insertBefore(searchContainer, roomsList);
    }

    const searchInput = document.getElementById('chatSearchInput');
    const clearButton = document.getElementById('clearSearchBtn');

    if (!searchInput || !clearButton) return;

// Функция поиска
    const performSearch = (query) => {
        query = query.toLowerCase().trim();
        clearButton.classList.toggle('d-none', !query);

        if (!query) {
            // Если поиск пустой, восстанавливаем исходное отображение и состояние свернутых групп
            document.querySelectorAll('.chat-group').forEach(group => {
                group.style.display = '';

                // Восстанавливаем состояние групп из localStorage
                const groupId = group.getAttribute('data-group');
                const collapsedGroups = JSON.parse(localStorage.getItem('collapsedGroups') || '[]');
                if (collapsedGroups.includes(groupId)) {
                    group.classList.add('collapsed');
                } else {
                    group.classList.remove('collapsed');
                }
            });

            document.querySelectorAll('.room-item').forEach(room => {
                room.style.display = '';
            });
            return;
        }

        // Ищем комнаты, соответствующие запросу
        document.querySelectorAll('.room-item').forEach(room => {
            const roomTitle = room.getAttribute('data-room-title').toLowerCase();
            const matches = roomTitle.includes(query);
            room.style.display = matches ? '' : 'none';
        });

        // Показываем только группы, в которых есть видимые комнаты
        document.querySelectorAll('.chat-group').forEach(group => {
            const hasVisibleRooms = Array.from(group.querySelectorAll('.room-item')).some(room =>
                room.style.display !== 'none'
            );
            group.style.display = hasVisibleRooms ? '' : 'none';

            // Разворачиваем группы с результатами поиска
            if (hasVisibleRooms) {
                group.classList.remove('collapsed');
            }
        });
    };

    searchInput.addEventListener('input', () => {
        performSearch(searchInput.value);
    });

    clearButton.addEventListener('click', clearSearch);

    // Функция очистки поиска
    function clearSearch() {
        searchInput.value = '';
        performSearch('');
        searchInput.focus();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    try {
        typingIndicator.init();
        setupFileUpload();
        voiceInput.init();
        setupChatSearch(); // Инициализация поиска чатов

        // Initialize context menu event listeners
        document.addEventListener('click', (e) => {
            const clickedMenuItem = e.target.closest('.context-menu-item');
            if (clickedMenuItem) {
                e.preventDefault();
                e.stopPropagation();

                const action = clickedMenuItem.getAttribute('data-action');
                if (action) {
                    handleContextMenuAction(action);
                }
                // return;
            }
        });

        // Handle right-click on room items to show context menu
        document.addEventListener('contextmenu', (e) => {
            const roomItem = e.target.closest('.room-item');
            if (roomItem) {
                e.preventDefault();
                const roomId = roomItem.getAttribute('data-room-id');
                const isPinned = roomItem.classList.contains('pinned');
                showContextMenu(e, roomId, roomItem, isPinned);
            }
        });

        // Handle click on room items for switching rooms
        document.addEventListener('click', (e) => {
            // Handle room item click (for switching rooms)
            const roomItem = e.target.closest('.room-item');
            if (roomItem && !e.target.closest('.room-actions') && !e.target.closest('.context-menu-item')) {
                e.preventDefault();
                e.stopPropagation();

                const roomId = roomItem.getAttribute('data-room-id');
                const room = state.rooms.find(r => r.id === roomId);
                if (room) {
                    switchRoom(room);
                }
                return;
            }

            // Handle menu button click (three dots)
            const menuButton = e.target.closest('.btn-menu');
            if (menuButton) {
                e.preventDefault();
                e.stopPropagation();
                const roomItem = menuButton.closest('.room-item');
                if (roomItem) {
                    const roomId = roomItem.getAttribute('data-room-id');
                    const isPinned = roomItem.classList.contains('pinned');
                    showContextMenu(e, roomId, roomItem, isPinned);
                }
            }
        });

        if (elements.sendButton) {
            elements.sendButton.addEventListener('click', sendMessage);
        }

        if (elements.messageInput) {
            elements.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });

            elements.messageInput.addEventListener('input', () => {
                autoResize(elements.messageInput);
                updateSendButtonState();
            });

            elements.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.shiftKey) {
                    e.preventDefault();
                    const start = this.selectionStart;
                    const end = this.selectionEnd;
                    this.value = this.value.substring(0, start) + '\n' + this.value.substring(end);
                    this.selectionStart = this.selectionEnd = start + 1;
                    autoResize(this);
                }
            });
        }

        if (elements.createRoomBtn) {
            elements.createRoomBtn.addEventListener('click', () => {
                createRoom();
            });
        }

        loadRooms();
        updateSendButtonState();

        if (elements.fileInput) {
            elements.fileInput.addEventListener('change', () => {
                if (elements.fileInput.files?.length) {
                    showFilePreviews(Array.from(elements.fileInput.files));
                }
            });

            const messageInputContainer = elements.messageInput?.closest('.message-input');
            if (messageInputContainer) {
                messageInputContainer.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    messageInputContainer.classList.add('drag-over');
                });

                messageInputContainer.addEventListener('dragleave', () => {
                    messageInputContainer.classList.remove('drag-over');
                });

                messageInputContainer.addEventListener('drop', (e) => {
                    e.preventDefault();
                    messageInputContainer.classList.remove('drag-over');
                    if (e.dataTransfer.files.length) {
                        elements.fileInput.files = e.dataTransfer.files;
                        updateSendButtonState();
                        showFilePreviews(Array.from(e.dataTransfer.files));
                    }
                });
            }
        }

        imageModal.init();

        window.setExampleQuestion = function(value) {
            createRoom().then(() => {
                const messageInput = document.getElementById('messageInput');
                messageInput.value = value;
                messageInput.dispatchEvent(new Event('input'));
                elements.sendButton.click();
            }).catch(error => {
                console.error('Error creating room:', error);
                showNotification('Ошибка при создании комнаты', 'error');
            });
        };

        const btn = document.getElementById('logoutBtn');
        if (!btn) return;
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const form = btn.closest('form');
            if (!form) return;

            if (window.Swal && typeof window.Swal.fire === 'function') {
                Swal.fire({
                    title: `<span class="logout-title">${window.i18n?.t('logout.confirm.title', 'Выйти из аккаунта?')}</span>`,
                    html: `<div class="logout-message">
                            <div class="logout-icon-container">
                                <i class="bi bi-box-arrow-right logout-icon-animated"></i>
                            </div>
                            <p class="text-muted mb-0">${window.i18n?.t('logout.confirm.text', 'Вы уверены, что хотите выйти?')}</p>
                           </div>`,
                    icon: null,
                    showCancelButton: true,
                    confirmButtonText: `<i class="bi bi-door-open me-1"></i> ${window.i18n?.t('logout.confirm.ok', 'Выйти')}`,
                    cancelButtonText: `<i class="bi bi-x me-1"></i> ${window.i18n?.t('logout.confirm.cancel', 'Отмена')}`,
                    reverseButtons: true,
                    focusCancel: true,
                    confirmButtonColor: '#0d6efd',
                    cancelButtonColor: '#6c757d',
                    customClass: {
                        container: 'logout-dialog-container',
                        popup: 'logout-dialog-popup',
                        title: 'logout-dialog-title',
                        confirmButton: 'btn-logout-confirm',
                        cancelButton: 'btn-logout-cancel',
                        actions: 'logout-dialog-actions'
                    },
                    buttonsStyling: true,
                    allowOutsideClick: true,
                    showClass: { popup: 'animate__animated animate__fadeInDown animate__faster' },
                    hideClass: { popup: 'animate__animated animate__fadeOutUp animate__faster' },
                    didOpen: (modal) => {
                        const style = document.createElement('style');
                        style.textContent = `
                            .logout-dialog-container { z-index: 1060; }
                            .logout-dialog-popup {
                                border-radius: 16px; box-shadow: 0 12px 24px rgba(0,0,0,0.2);
                                background: var(--bg-secondary); border: 1px solid var(--border-color);
                                padding: 24px; max-width: 420px;
                            }
                            .logout-title { font-weight: 600; font-size: 1.25rem; margin-bottom: 0; color: var(--primary-color, #0d6efd); }
                            .logout-message { margin: 12px 0 8px; text-align: center; }
                            .logout-icon-container { margin-bottom: 10px; }
                            .logout-icon-animated { font-size: 2.5rem; color: var(--primary-color, #0d6efd); animation: slide 0.5s ease-in-out 0.2s; display: inline-block; }
                            .logout-dialog-actions { margin-top: 10px; gap: 12px; }
                            .btn-logout-confirm { box-shadow: 0 4px 12px rgba(13, 110, 253, 0.35); transition: all 0.2s ease; border-radius: 8px; font-weight: 500; }
                            .btn-logout-confirm:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(13, 110, 253, 0.45); }
                            .btn-logout-confirm:active { transform: translateY(0); }
                            .btn-logout-cancel { border-radius: 8px; transition: all 0.2s ease; font-weight: 500; }
                            .btn-logout-cancel:hover { transform: translateY(-2px); }
                            @keyframes slide { 0%{ transform: translateX(-4px);} 50%{ transform: translateX(2px);} 100%{ transform: translateX(0);} }
                        `;
                        document.head.appendChild(style);
                        modal.addEventListener('close', () => {
                            if (style.parentNode) document.head.removeChild(style);
                        });
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        form.submit();
                    }
                });
            } else {
                // Fallback на стандартное подтверждение, если SweetAlert2 недоступен
                if (confirm(window.i18n?.t('logout.confirm.title', 'Выйти из аккаунта?'))) {
                    form.submit();
                }
            }
        });

        setupScrollHandlers();
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Ошибка при инициализации приложения', 'error');
    }
});

marked.setOptions({
    highlight: (code, lang) => lang && Prism.languages[lang]
        ? Prism.highlight(code, Prism.languages[lang], lang)
        : Prism.highlight(code, Prism.languages.markup, 'markup'),
    breaks: true,
    gfm: true
});