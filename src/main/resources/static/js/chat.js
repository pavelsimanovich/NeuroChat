// Конфигурация
const config = {
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
    deleteRoomBtn: document.getElementById('deleteRoomBtn'),
    userId: document.getElementById('userId').value,
    userName: document.getElementById('userName').value,
};

// Инициализация приложения
let state = {
    currentRoom: null,
    rooms: [],
    messages: [], // Добавляем хранилище сообщений
};

function init() {
    loadRooms();
    setupEventListeners();
    updateDeleteButtonVisibility();
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
        const url = `${config.apiBaseUrl}/rooms?userId=${encodeURIComponent(elements.userId)}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rooms = await response.json();

        if (rooms.length === 0) {
            // todo прятать инпут и потом вернуть
            return;
        }

        state.rooms = rooms;
        renderRoomsList();
        switchToLastRoom()
    } catch (error) {
        console.error('Error loading rooms:', error);
        alert('Не удалось загрузить комнаты. Пожалуйста, обновите страницу.');
    }
}

// Рендер списка комнат
function renderRoomsList() {
    elements.roomsList.innerHTML = '';

    const sortedRooms = [...state.rooms].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    sortedRooms.forEach(room => {
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
    // Устанавливаем новую текущую комнату
    state.currentRoom = room;

    try {
        renderRoomsList();

        // Обновляем заголовок
        elements.currentRoomTitle.textContent = room.title;

        // Загружаем сообщения комнаты
        await loadRoomMessages(room.id);

        // Доступность поля ввода сообщений
        if (!room.active) {
            elements.messageInput.disabled = true;
            elements.sendMessageBtn.disabled = true;

            elements.messageInput.classList.add("grey-color");
            this.limitMessages = document.getElementById('limitMessages');
            this.limitMessages.innerHTML = `
              <div class="limit-messages">
                Превышен лимит сообщений в комнате
              </div>
            `;
        } else {
            elements.messageInput.disabled = false;
            elements.sendMessageBtn.disabled = false;
            elements.messageInput.classList.remove("grey-color");
            this.limitMessages.innerHTML = '';
        }

        // Прокручиваем вниз к последним сообщениям
        scrollToBottom();
        updateDeleteButtonVisibility();

    } catch (error) {
        showNotification("Ошибка загрузки", 'error')
    }
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

        state.messages = await response.json();
        renderMessages();

    } catch (error) {
        console.error('Error loading messages:', error);
        showNotification("Ошибка загрузки сообщений.", 'error')
        //todo remove?
        // const errorDiv = document.getElementById("error");
        // errorDiv.innerHTML = `
        //     <div class="error-message">
        //         Ошибка загрузки сообщений: ${error.message}
        //     </div>
        // `;
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
        messageElement.className = `message ${message.userId === elements.userId ? 'user-message' : 'ai-message'}`;

        // Добавляем класс для неотправленных сообщений
        if (message.error) {
            messageElement.classList.add('message-error');
        }

        messageElement.innerHTML = `
            <div class="message-sender">${message.userId === elements.userId ? 'Вы' : 'AI'}</div>
            <div class="message-content">${(marked.parse(message.content))}</div>
            <div class="message-meta">
                <span class="message-time">${formatTime(message.timestamp)}</span>
                ${message.error ? '<span class="message-status">(не отправлено)</span>' : ''}
            </div>
        `;

        elements.chatMessages.appendChild(messageElement);
    });

    Prism.highlightAll();
    scrollToBottom();
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
}

function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Создание новой комнаты
async function createRoom(title) {
    try {
        const response = await fetch(`${config.apiBaseUrl}/rooms/create?userId=${elements.userId}&title=${encodeURIComponent(title)}`, {
            method: 'GET'
        });

        if (!response.ok) throw new Error('Failed to create room');

        const newRoom = await response.json();
        state.rooms.push(newRoom);
        renderRoomsList();
        switchRoom(newRoom);
    } catch (error) {
        console.error('Error creating room:', error);
        showNotification('Не удалось создать комнату', 'error');
    }
}

// Отправка сообщения
async function sendMessage() {
    const messageContent = elements.messageInput.value.trim();
    if (!messageContent || !state.currentRoom) return;

    // Создаем временное сообщение для мгновенного отображения
    const tempMessage = {
        id: 'user-' + Date.now(),
        roomId: state.currentRoom.id,
        userId: elements.userId,
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
        const eventSource = new EventSource(`http://localhost:8080/api/direct/stream?chatId=${state.currentRoom.id}&question=${encodeURIComponent(messageContent)}`);
        const uuid = generateUUID;
        const messageElement = document.createElement('div');
        messageElement.id = uuid;
        messageElement.className = 'message ai-message';
        messageElement.innerHTML = `
            <div class="message-sender">AI</div>
            <div id="cm${uuid}" class="message-content"></div>`;

        let response = '';
        eventSource.onmessage = (e) => {
           typingIndicator.hide();
           if (!document.getElementById(uuid)) {
               elements.chatMessages.appendChild(messageElement);
           }
            response += JSON.parse(e.data).value;
            // response = DOMPurify.sanitize(response);
            document.getElementById(`cm${uuid}`).innerHTML = marked.parse(response);

            Prism.highlightAll();
            scrollToBottom();
        };

        eventSource.onerror = (e) => {
            eventSource.close();

            const aiMessage = {
                id: 'ai-' + Date.now(),
                roomId: state.currentRoom.id,
                userId: 'ai-assistant',
                type: 'AI_MESSAGE',
                content: response,
                timestamp: new Date().toISOString()
            };

            state.messages.push(aiMessage);
        };

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

   // Автоподстройка высоты
    function autoResize() {
        elements.messageInput.style.height = 'auto';
        elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 100) + 'px';
    }
    elements.messageInput.addEventListener('input', autoResize);
    elements.messageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift + Enter — вставляем перенос строки
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.setRangeText('\n', start, end, 'end');
                e.preventDefault(); // предотвращаем стандартное поведение
                autoResize();
            } else {
                // Просто Enter — отправляем сообщение
                e.preventDefault(); // отключаем стандартный Enter (перенос строки)
                if (!elements.sendMessageBtn.disabled) {
                    sendMessage();
                }
            }
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
                'X-User-Id': elements.userId
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

        // Удаляем ID последней комнаты из localStorage
        localStorage.removeItem('lastRoomId');

        // Пытаемся переключиться на другую комнату, если есть
        if (state.rooms.length > 0) {
            await switchRoom(state.rooms[0]);
        } else {
            // Если комнат не осталось, обновляем интерфейс
            //todo
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
    Prism.highlightAll();
    init()
} );

marked.setOptions({
    // Обработка кодовых блоков с Prism.js
    highlight: function(code, lang) {
        if (lang && Prism.languages[lang]) {
            return Prism.highlight(code, Prism.languages[lang], lang);
        } else {
            return Prism.highlight(code, Prism.languages.markup, 'markup');
        }
    },
    breaks: true,
    gfm: true
});

function generateUUID() {
    var d = new Date().getTime();//Timestamp
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

