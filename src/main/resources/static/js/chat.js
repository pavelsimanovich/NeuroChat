// Конфигурация
const config = {
    userId: document.getElementById('userId').value,
    apiBaseUrl: 'http://localhost:8080/api/chat'
};

// DOM элементы
const elements = {
    roomsList: document.getElementById('roomsList'),
    currentRoomTitle: document.getElementById('currentRoomTitle'),
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendMessageBtn: document.getElementById('sendMessageBtn'),
    createRoomBtn: document.getElementById('createRoomBtn'),
    confirmCreateRoom: document.getElementById('confirmCreateRoom'),
    roomTitleInput: document.getElementById('roomTitleInput'),
    createRoomModal: new bootstrap.Modal('#createRoomModal'),
    deleteRoomBtn: document.getElementById('deleteRoomBtn')
};

// Инициализация приложения
let state = {
    currentRoom: null,
    stompClient: null,
    rooms: [],
    messages: [], // Добавляем хранилище сообщений
    userId: localStorage.getItem('userId') || document.getElementById('userId').value
};

// При инициализации сохраняем userId
function init() {
    localStorage.setItem('userId', state.userId);
    loadRooms();
    setupEventListeners();

    switchToLastRoom();
}

function switchToLastRoom() {
    // Восстанавливаем последнюю комнату из localStorage
    const lastRoomId = localStorage.getItem('lastRoomId');
    if (lastRoomId) {
        const lastRoom = state.rooms.find(r => r.id === lastRoomId);
        if (lastRoom) switchRoom(lastRoom);
    }
}

// Загрузка списка комнат
async function loadRooms() {
    try {
        const url = `${config.apiBaseUrl}/rooms?userId=${encodeURIComponent(config.userId)}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Проверяем content-type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error("Invalid content type");
        }

        const rooms = await response.json();

        // Проверяем что получили массив
        if (!Array.isArray(rooms)) {
            throw new Error("Expected array of rooms");
        }

        // Сохраняем только если данные валидны
        state.rooms = rooms;
        renderRoomsList();

        // Восстанавливаем последнюю комнату если есть
        const lastRoomId = localStorage.getItem('lastRoomId');
        if (lastRoomId) {
            const lastRoom = state.rooms.find(r => r.id === lastRoomId);
            if (lastRoom) await switchRoom(lastRoom);
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        alert('Не удалось загрузить комнаты. Пожалуйста, обновите страницу.');
        // Можно добавить повторную попытку через несколько секунд
    }
}

// Рендер списка комнат
function renderRoomsList() {
    elements.roomsList.innerHTML = '';

    state.rooms.forEach(room => {
        const roomElement = document.createElement('div');
        roomElement.className = `room-item ${state.currentRoom?.id === room.id ? 'active' : ''}`;
        roomElement.textContent = room.title;
        roomElement.addEventListener('click', () => switchRoom(room));
        elements.roomsList.appendChild(roomElement);
    });
}

// Переключение комнаты
async function switchRoom(room) {
    localStorage.setItem('lastRoomId', room.id);
    // Отключаемся от текущей комнаты, если есть
    if (state.stompClient) {
        state.stompClient.disconnect();
    }

    // Устанавливаем новую текущую комнату
    state.currentRoom = room;
    renderRoomsList();

    // Обновляем заголовок
    elements.currentRoomTitle.textContent = room.title;

    // Загружаем сообщения комнаты
    await loadRoomMessages(room.id);

    // Подключаемся к WebSocket
    connectToRoom(room.id);

    // Доступность поля ввода сообщений
    if (!room.active) {
        elements.messageInput.disabled = true;
        elements.sendMessageBtn.disabled = true;
        //todo add message
    } else {
        elements.messageInput.disabled = false;
        elements.sendMessageBtn.disabled = false;
    }

    // Прокручиваем вниз к последним сообщениям
    scrollToBottom();
    updateDeleteButtonVisibility();
}

// Загрузка сообщений комнаты
async function loadRoomMessages(roomId) {
    try {
        console.log('Loading messages for room:', roomId); // Лог

        const response = await fetch(`${config.apiBaseUrl}/rooms/${roomId}/messages`);

        console.log('Response status:', response.status); // Лог статуса

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const messages = await response.json();
        console.log('Received messages:', messages); // Лог полученных сообщений

        state.messages = messages;
        renderMessages();

    } catch (error) {
        console.error('Error loading messages:', error);
        elements.chatMessages.innerHTML = `
            <div class="error-message">
                Ошибка загрузки сообщений: ${error.message}
            </div>
        `;
    }
}

// Рендер сообщений
function renderMessages() {
    elements.chatMessages.innerHTML = '';

    if (state.messages.length === 0) {
        elements.chatMessages.innerHTML = `
      <div class="no-messages">
        Нет сообщений
      </div>
    `;
        return;
    }

    // Сортируем сообщения по времени
    const sortedMessages = [...state.messages].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
    );

    sortedMessages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.userId === config.userId ? 'user-message' : 'ai-message'}`;

        // Добавляем класс для неотправленных сообщений
        if (message.error) {
            messageElement.classList.add('message-error');
        }

        messageElement.innerHTML = `
            <div class="message-sender">${message.userId === config.userId ? 'Вы' : 'AI'}</div>
            <div class="message-content">${message.content}</div>
            <div class="message-meta">
                <span class="message-time">${formatTime(message.timestamp)}</span>
                ${message.error ? '<span class="message-status">(не отправлено)</span>' : ''}
            </div>
        `;

        elements.chatMessages.appendChild(messageElement);
    });

    scrollToBottom();
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Подключение к комнате через WebSocket
function connectToRoom(roomId) {
    const socket = new SockJS('/ws-chat');
    state.stompClient = Stomp.over(socket);

    state.stompClient.connect({}, function (frame) {
        console.log('Connected to room:', roomId);

        state.stompClient.subscribe(`/topic/room/${roomId}`, function (message) {
            typingIndicator.hide();
            const messageData = JSON.parse(message.body);
            console.log('Received message:', messageData);

            if (messageData.error) {
                showNotification(messageData.error, 'error');
                if (messageData.errorType === 'LIMIT_EXCEEDED') {
                    elements.messageInput.disabled = true;
                    elements.sendMessageBtn.disabled = true;
                    //todo: добавить сообщение внизу чата об ошибке. удалить последнее сообщение
                }
                return;
            }

            // Удаляем временное сообщение если есть
            if (messageData.id && messageData.id.startsWith('temp-')) {
                state.messages = state.messages.filter(m => m.id !== messageData.id);
            }

            // Проверяем нет ли уже такого сообщения
            if (!state.messages.some(m => m.id === messageData.id)) {
                state.messages.push(messageData);
                renderMessages();
            }
        });
    });
}

// Создание новой комнаты
async function createRoom(title) {
    try {
        const response = await fetch(`${config.apiBaseUrl}/rooms/create?userId=${config.userId}&title=${encodeURIComponent(title)}`, {
            method: 'GET'
        });

        if (!response.ok) throw new Error('Failed to create room');

        const newRoom = await response.json();
        state.rooms.push(newRoom);
        renderRoomsList();
        switchRoom(newRoom);
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Не удалось создать комнату');
    }
}

// Отправка сообщения
async function sendMessage() {
    const messageContent = elements.messageInput.value.trim();
    if (!messageContent || !state.currentRoom) return;

    // Создаем временное сообщение для мгновенного отображения
    const tempMessage = {
        id: 'temp-' + Date.now(),
        roomId: state.currentRoom.id,
        userId: config.userId,
        type: 'USER_MESSAGE',
        content: messageContent,
        timestamp: new Date().toISOString()
    };

    // Добавляем в состояние и рендерим
    state.messages.push(tempMessage);
    renderMessages();
    elements.messageInput.value = '';

    typingIndicator.show();

    try {
        // Отправляем на сервер через WebSocket
        state.stompClient.send(
            `/app/chat/${state.currentRoom.id}/send`,
            {},
            JSON.stringify({
                userId: config.userId,
                content: messageContent
            })
        );
        scrollToBottom();
    } catch (error) {
        console.error('Error sending message:', error);
        typingIndicator.hide();
        // Помечаем сообщение как неотправленное
        const messageIndex = state.messages.findIndex(m => m.id === tempMessage.id);
        if (messageIndex !== -1) {
            state.messages[messageIndex].error = true;
            renderMessages();
        }
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Отправка сообщения по кнопке
    elements.sendMessageBtn.addEventListener('click', sendMessage);

    // Отправка сообщения по Enter
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Создание комнаты
    elements.createRoomBtn.addEventListener('click', () => {
        elements.roomTitleInput.value = '';
        elements.createRoomModal.show();
    });

    elements.confirmCreateRoom.addEventListener('click', () => {
        const title = elements.roomTitleInput.value.trim();
        if (title) {
            createRoom(title);
            elements.createRoomModal.hide();
        }
    });
}

// Глобальный объект для управления индикатором
const typingIndicator = {
    timer: null,
    container: null,

    init() {
        // Создаем контейнер если его нет
        if (!this.container) {
            this.container = document.getElementById('typingIndicatorContainer');

            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'typingIndicatorContainer';
                this.container.style.display = 'none';
                this.container.style.minHeight = '40px';
                this.container.innerHTML = `
                    <div class="typing-indicator">
                        <div class="typing-dots">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                        </div>
                        <span>AI печатает ответ...</span>
                    </div>`;

                const chatContainer = document.querySelector('.chat-messages')?.parentElement;
                if (chatContainer) {
                    chatContainer.appendChild(this.container);
                } else {
                    console.error('Chat container not found');
                    return false;
                }
            }
        }
        return true;
    },

    show() {
        if (!this.init()) return;

        clearTimeout(this.timer);
        this.container.style.display = 'block';

        // Автоскрытие через 320 секунд на случай проблем
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

// Обработчик удаления комнаты
async function handleDeleteRoom() {
    if (!state.currentRoom) {
        console.error('Нет текущей комнаты для удаления');
        return;
    }

    if (!confirm(`Удалить чат "${state.currentRoom.title}"?`)) {
        return;
    }

    const deleteBtn = elements.deleteRoomBtn;
    const originalHtml = deleteBtn.innerHTML;

    try {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<div class="spinner"></div>';

        const response = await fetch(`/api/chat/rooms/${state.currentRoom.id}`, {
                method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': state.userId
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        // Обновляем состояние
        const deletedRoomId = state.currentRoom.id;
        state.rooms = state.rooms.filter(room => room.id !== deletedRoomId);
        state.messages = [];
        state.currentRoom = null;

        // Обновляем интерфейс
        renderRoomsList();
        renderMessages();
        elements.currentRoomTitle.textContent = 'Выберите чат';
        elements.messageInput.disabled = true;
        elements.sendMessageBtn.disabled = true;

        // Отключаем WebSocket соединение
        if (state.stompClient) {
            state.stompClient.disconnect();
            state.stompClient = null;
        }

        // Удаляем ID последней комнаты из localStorage
        localStorage.removeItem('lastRoomId');

        // Пытаемся переключиться на другую комнату, если есть
        if (state.rooms.length > 0) {
            await switchRoom(state.rooms[0]);
        } else {
            // Если комнат не осталось, обновляем интерфейс
            updateDeleteButtonVisibility();
        }

        showNotification('Чат успешно удален', 'success');
    } catch (error) {
        console.error('Ошибка при удалении комнаты:', error);
        showNotification('Не удалось удалить чат', 'error');
    } finally {
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalHtml;
        }
    }
}



// Обновление видимости кнопки
function updateDeleteButtonVisibility() {
    const deleteBtn = document.getElementById('deleteRoomBtn');
    if (!deleteBtn) return;

    deleteBtn.addEventListener('click', handleDeleteRoom);

    if (state?.currentRoom) {
        deleteBtn.style.display = 'flex';
    } else {
        deleteBtn.style.display = 'none';
    }
}

// Вспомогательная функция для уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Инициализация при полной загрузке DOM
document.addEventListener('DOMContentLoaded', ()=> {
    init()
    updateDeleteButtonVisibility()
} );

