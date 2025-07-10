// Конфигурация
const config = {
    apiBaseUrl: 'http://localhost:8080/api/chat'
};

// DOM элементы
const elements = (function() {
    // Создаем объект с элементами
    const elements = {
        // Chat elements
        roomsList: document.getElementById('roomsList'),
        currentRoomTitle: document.getElementById('currentRoomTitle'),
        chatMessages: document.getElementById('chatMessages'),
        messageInput: document.getElementById('messageInput'),
        sendButton: document.getElementById('sendMessageBtn'),
        sendMessageBtn: document.getElementById('sendMessageBtn'), // Alias for backward compatibility
        createRoomBtn: document.getElementById('createRoomBtn'),
        confirmCreateRoom: document.getElementById('confirmCreateRoom'),
        roomTitleInput: document.getElementById('roomTitleInput'),
        createRoomModal: document.getElementById('createRoomModal') ? new bootstrap.Modal('#createRoomModal') : null,
        deleteRoomBtn: document.getElementById('deleteRoomBtn'),
        userId: document.getElementById('userId')?.value || '',
        userName: document.getElementById('userName')?.value || 'User',
        
        // File upload elements
        fileInput: null,
        filePreview: null,
        uploadButton: null,
    };
    
    // Инициализация элементов
    function init() {
        // Initialize file input
        elements.fileInput = document.createElement('input');
        elements.fileInput.type = 'file';
        elements.fileInput.multiple = true;
        elements.fileInput.style.display = 'none';
        
        // Initialize upload button if it doesn't exist in the DOM
        elements.uploadButton = document.querySelector('#uploadButton');
        if (!elements.uploadButton) {
            elements.uploadButton = document.createElement('button');
            elements.uploadButton.id = 'uploadButton';
            elements.uploadButton.type = 'button';
            elements.uploadButton.className = 'btn btn-outline-secondary';
            elements.uploadButton.innerHTML = '📎';
            elements.uploadButton.style.marginRight = '10px';
            elements.uploadButton.style.borderRadius = '20px';
            elements.uploadButton.style.padding = '5px 12px';
            elements.uploadButton.style.fontSize = '18px';
        }
        
        // Initialize file preview container if it doesn't exist
        if (!elements.filePreview) {
            elements.filePreview = document.createElement('div');
            elements.filePreview.id = 'filePreview';
            elements.filePreview.className = 'file-preview';
            elements.filePreview.style.display = 'none';
            elements.filePreview.style.marginBottom = '10px';
            elements.filePreview.style.maxHeight = '150px';
            elements.filePreview.style.overflowY = 'auto';
            elements.filePreview.style.padding = '5px';
            elements.filePreview.style.border = '1px dashed #ddd';
            elements.filePreview.style.borderRadius = '5px';
        }
        
        // Вставляем элементы в DOM, если messageInput существует
        if (elements.messageInput) {
            const messageInputContainer = elements.messageInput.closest('.message-input');
            if (messageInputContainer) {
                // Вставляем элементы в правильном порядке
                const messageInputWrapper = elements.messageInput.closest('.message-input-wrapper');
                const referenceNode = messageInputWrapper || elements.messageInput;
                const parentNode = referenceNode.parentNode;
                
                // Проверяем и вставляем filePreview
                if (elements.filePreview && !parentNode.contains(elements.filePreview)) {
                    parentNode.insertBefore(elements.filePreview, referenceNode);
                }
                
                // Проверяем и вставляем fileInput
                if (elements.fileInput && !parentNode.contains(elements.fileInput)) {
                    parentNode.insertBefore(elements.fileInput, referenceNode);
                }
                
                // Проверяем и вставляем uploadButton
                if (elements.uploadButton && !parentNode.contains(elements.uploadButton)) {
                    parentNode.insertBefore(elements.uploadButton, referenceNode);
                }
            }
        }
        
        return elements;
    }
    
    // Инициализируем и возвращаем элементы
    return init();
})();

let eventSource = null;
let chatConnections = {};

// Инициализация приложения
let state = {
    currentRoom: null,
    rooms: [],
    messages: [], // Добавляем хранилище сообщений
};

// Функция инициализации элементов
function initElements() {
    console.log('Initializing elements...');
    
    try {
        // Initialize elements that should exist in the DOM
        elements.messageInput = document.getElementById('messageInput');
        elements.sendButton = document.getElementById('sendMessageBtn') || elements.sendButton;
        elements.fileInput = elements.fileInput || document.getElementById('fileInput');
        elements.filePreview = elements.filePreview || document.getElementById('filePreview');
        elements.uploadButton = elements.uploadButton || document.getElementById('uploadButton');
        elements.deleteRoomBtn = document.getElementById('deleteRoomBtn') || elements.deleteRoomBtn;
        elements.userId = document.getElementById('userId').value || elements.userId;
        elements.userName = document.getElementById('userName').value || elements.userName;
        elements.currentRoomTitle = document.getElementById('currentRoomTitle') || elements.currentRoomTitle;

        // Check for required elements
        const requiredElements = ['messageInput', 'sendButton'];
        for (const elem of requiredElements) {
            if (!elements[elem]) {
                console.error(`Required element not found: ${elem}`);
                return false;
            }
        }
        
        // Set up message input container
        const messageInputContainer = elements.messageInput.closest('.message-input');
        if (!messageInputContainer) {
            console.error('Message input container not found');
            return false;
        }
        
        console.log('Message input container found:', messageInputContainer);
        
        // Initialize file upload button
        if (!elements.uploadButton) {
            console.log('Initializing file upload button');
            elements.uploadButton = document.querySelector('#uploadButton');
            
            if (!elements.uploadButton) {
                console.log('Creating file upload button');
                elements.uploadButton = document.createElement('button');
                elements.uploadButton.id = 'uploadButton';
                elements.uploadButton.type = 'button';
                elements.uploadButton.className = 'btn btn-outline-secondary';
                elements.uploadButton.innerHTML = '📎';
                elements.uploadButton.style.marginRight = '10px';
                elements.uploadButton.style.borderRadius = '20px';
                elements.uploadButton.style.padding = '5px 12px';
                elements.uploadButton.style.fontSize = '18px';
                messageInputContainer.insertBefore(elements.uploadButton, elements.messageInput);
                
                // Set up click handler for the upload button
                elements.uploadButton.addEventListener('click', () => {
                    if (elements.fileInput) {
                        elements.fileInput.click();
                    }
                });
            } else {
                // If button exists in HTML, ensure it has the click handler
                elements.uploadButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (elements.fileInput) {
                        elements.fileInput.click();
                    }
                });
            }
        }
        
        // Initialize file input if it doesn't exist
        if (!elements.fileInput) {
            console.log('Creating file input');
            elements.fileInput = document.createElement('input');
            elements.fileInput.type = 'file';
            elements.fileInput.id = 'fileInput';
            elements.fileInput.multiple = true;
            elements.fileInput.style.display = 'none';
            messageInputContainer.insertBefore(elements.fileInput, elements.uploadButton);
        }
        
        // Initialize file preview container if it doesn't exist
        if (!elements.filePreview) {
            console.log('Creating file preview container');
            elements.filePreview = document.createElement('div');
            elements.filePreview.id = 'filePreview';
            elements.filePreview.className = 'file-preview';
            elements.filePreview.style.display = 'none';
            elements.filePreview.style.marginBottom = '10px';
            elements.filePreview.style.maxHeight = '150px';
            elements.filePreview.style.overflowY = 'auto';
            elements.filePreview.style.padding = '5px';
            elements.filePreview.style.border = '1px dashed #ddd';
            elements.filePreview.style.borderRadius = '5px';
            messageInputContainer.insertBefore(elements.filePreview, elements.fileInput);
        }
        
        // Initialize send button state
        if (elements.sendButton) {
            elements.sendButton.disabled = true;
        }
        
        console.log('Elements initialized successfully:', {
            messageInput: !!elements.messageInput,
            sendButton: !!elements.sendButton,
            uploadButton: !!elements.uploadButton,
            fileInput: !!elements.fileInput,
            filePreview: !!elements.filePreview,
            deleteRoomBtn: !!elements.deleteRoomBtn,
            userId: !!elements.userId,
            userName: !!elements.userName,
            currentRoomTitle: !!elements.currentRoomTitle
        });
        
        return true;
    } catch (error) {
        console.error('Error initializing elements:', error);
        return false;
    }
}

async function switchToLastRoom() {
    console.log('switchToLastRoom called, rooms:', state.rooms);
    
    if (!state.rooms || state.rooms.length === 0) {
        console.log('No rooms available to switch to');
        // Create a default room if none exist
        await createRoom('Новый чат');
        return;
    }
    
    // Try to get the last room from localStorage
    const lastRoomId = localStorage.getItem('lastRoomId');
    console.log('Last room ID from localStorage:', lastRoomId);
    
    if (lastRoomId) {
        const lastRoom = state.rooms.find(r => r.id === lastRoomId);
        console.log('Found last room:', lastRoom);
        
        if (lastRoom) {
            console.log('Switching to last room:', lastRoom.title);
            await switchRoom(lastRoom);
            return;
        }
    }
    
    // If no last room or it's not found, switch to the first room
    console.log('No valid last room, switching to first room');
    if (state.rooms.length > 0) {
        await switchRoom(state.rooms[0]);
    }
}

// Загрузка списка комнат
async function loadRooms() {
    console.log('Starting to load rooms...');
    try {
        const url = `${config.apiBaseUrl}/rooms?userId=${encodeURIComponent(elements.userId)}`;
        console.log('Fetching rooms from URL:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        }

        const rooms = await response.json();
        console.log('Rooms loaded:', rooms);

        if (!rooms || !Array.isArray(rooms)) {
            console.error('Invalid rooms data received:', rooms);
            throw new Error('Invalid rooms data received from server');
        }

        if (rooms.length === 0) {
            console.log('No rooms found for user');
            state.rooms = [];
            renderRoomsList();
            return;
        }

        state.rooms = rooms;
        console.log('Rooms set in state, rendering list...');
        renderRoomsList();
        
        console.log('Switching to last room...');
        await switchToLastRoom();
        
        console.log('Rooms loading completed');
    } catch (error) {
        console.error('Error loading rooms:', error);
        showNotification('Не удалось загрузить комнаты. Пожалуйста, обновите страницу.', 'error');
    }
}

// Рендер списка комнат
function renderRoomsList() {
    console.log('Rendering rooms list, current rooms:', state.rooms);
    
    if (!elements.roomsList) {
        console.error('Rooms list container not found');
        return;
    }
    
    try {
        // Clear the current list
        elements.roomsList.innerHTML = '';
        
        if (!state.rooms || state.rooms.length === 0) {
            console.log('No rooms to display');
            const noRooms = document.createElement('div');
            noRooms.className = 'no-rooms';
            noRooms.textContent = 'Нет доступных чатов';
            elements.roomsList.appendChild(noRooms);
            return;
        }
        
        // Sort rooms by creation date (newest first)
        const sortedRooms = [...state.rooms].sort((a, b) => 
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        
        // Update state with sorted rooms
        state.rooms = sortedRooms;
        
        // Create room elements
        sortedRooms.forEach(room => {
            if (!room || !room.id || !room.title) {
                console.warn('Invalid room data:', room);
                return;
            }
            
            const roomElement = document.createElement('div');
            roomElement.className = `room-item ${state.currentRoom?.id === room.id ? 'active' : ''}`;
            roomElement.textContent = room.title || 'Без названия';
            roomElement.title = room.title || 'Без названия';
            
            // Add click handler
            roomElement.addEventListener('click', async () => {
                console.log('Room clicked:', room.title);
                await switchRoom(room);
            });
            
            elements.roomsList.appendChild(roomElement);
        });
        
        console.log(`Rendered ${sortedRooms.length} rooms`);
    } catch (error) {
        console.error('Error rendering rooms list:', error);
        elements.roomsList.innerHTML = '<div class="error">Ошибка загрузки списка чатов</div>';
    }
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
            hideInputs(true)
            elements.messageInput.classList.add("grey-color");
            this.limitMessages = document.getElementById('limitMessages');
            this.limitMessages.innerHTML = `
              <div class="limit-messages">
                Превышен лимит сообщений в комнате
              </div>
            `;
        } else {
            hideInputs(false)

            elements.messageInput.classList.remove("grey-color");
            this.limitMessages.innerHTML = '';
        }

        // Прокручиваем вниз к последним сообщениям
        scrollToBottom();
        updateDeleteButtonVisibility();

    } catch (error) {
        console.error(error)
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
        showNotification("Ошибка загрузки сообщений. Обновите страницу.", 'error')
    }
}

// Рендер сообщений
//todo
function renderMessages() {
    elements.chatMessages.innerHTML = '';

    if (state.messages.length === 0 && state.currentRoom !== null ) {
        elements.chatMessages.innerHTML = `
      <div class="no-messages">
        <style>
    /* Стили для загрузки файлов */
    .file-preview {
        width: 100%;
        max-height: 150px;
        overflow-y: auto;
        margin-bottom: 10px;
        border: 1px dashed #ddd;
        border-radius: 5px;
        padding: 5px;
        background-color: #f9f9f9;
    }
    
    .file-preview-item {
        display: flex;
        align-items: center;
        padding: 5px 10px;
        margin: 3px 0;
        background-color: #fff;
        border: 1px solid #eee;
        border-radius: 4px;
        font-size: 14px;
    }
    
    .file-preview-item:hover {
        background-color: #f5f5f5;
    }
    
    .file-preview-item button {
        margin-left: 10px;
        opacity: 0.5;
        transition: opacity 0.2s;
        border: none;
        background: none;
        cursor: pointer;
        padding: 2px 5px;
        line-height: 1;
    }
    
    .file-preview-item button:hover {
        opacity: 1;
        color: #dc3545;
    }
    
    /* Стили для сообщений */
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
    console.log(`Creating new room with title: ${title}`);
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
        console.error('Invalid room title');
        showNotification('Название комнаты не может быть пустым', 'error');
        return null;
    }
    
    try {
        const url = `${config.apiBaseUrl}/rooms/create?userId=${elements.userId}&title=${encodeURIComponent(title)}`;
        console.log('Sending request to:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': elements.userId
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to create room: ${response.status} ${response.statusText}`);
        }

        const newRoom = await response.json();
        console.log('New room created:', newRoom);
        
        if (!state.rooms.some(room => room.id === newRoom.id)) {
            state.rooms.push(newRoom);
        }
        
        renderRoomsList();
        await switchRoom(newRoom);
        
        return newRoom;
    } catch (error) {
        console.error('Error creating room:', error);
        showNotification(`Не удалось создать комнату: ${error.message}`, 'error');
        return null;
    }
}

function getTempMessage(roomId, messageContent, id, userID) {
    return {
        id: id + Date.now(),
        roomId: roomId,
        userId: userID,
        type: userID !== "ai-assistant" ? 'USER_MESSAGE' : "AI_MESSAGE",
        content: messageContent,
        timestamp: new Date().toISOString()
    };
}

// Отправка сообщения
async function sendMessage() {
    if (!elements.sendButton || elements.sendButton.disabled) return;
    
    const messageContent = elements.messageInput ? elements.messageInput.value.trim() : '';
    const files = elements.fileInput ? elements.fileInput.files : [];
    let fileUrls = [];
    
    // Проверяем, есть ли что отправить
    if (!messageContent && (!files || files.length === 0)) return;
    
    // Блокируем кнопку отправки
    elements.sendButton.disabled = true;
    
    // Загружаем файлы, если они есть
    if (files && files.length > 0) {
        try {
            for (let i = 0; i < files.length; i++) {
                const fileUrl = await uploadFile(files[i]);
                if (fileUrl) {
                    fileUrls.push(fileUrl);
                }
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            showNotification('Ошибка при загрузке файлов', 'error');
            elements.sendButton.disabled = false;
            return;
        }
    }
    if (!state.currentRoom) {
        elements.sendButton.disabled = false;
        return;
    }

    // Закрываем предыдущее соединение, если есть
    if (window.eventSource) {
        window.eventSource.close();
    }

    const roomId = state.currentRoom.id;
    // Создаем временное сообщение для мгновенного отображения
    const tempMessage = getTempMessage(roomId, messageContent, "temp-user-", elements.userId);

    // Добавляем в состояние и рендерим
    state.messages = state.messages || [];
    state.messages.push(tempMessage);
    renderMessages();
    scrollToBottom();
    
    // Очищаем поле ввода
    if (elements.messageInput) {
        elements.messageInput.value = '';
    }
    
    // Сбрасываем поле выбора файлов
    if (elements.fileInput) {
        elements.fileInput.value = '';
    }

    typingIndicator.show();

    try {
        // Если есть файлы, загружаем их
        if (files.length > 0) {
            try {
                const formData = new FormData();
                for (let i = 0; i < files.length; i++) {
                    formData.append('files', files[i]);
                }
                
                const uploadResponse = await fetch(`${config.apiBaseUrl}/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!uploadResponse.ok) throw new Error('Ошибка загрузки файлов');
                
                const result = await uploadResponse.json();
                fileUrls = result.fileUrls || [];

            } catch (error) {
                console.error('Ошибка при загрузке файлов:', error);
                showNotification('Не удалось загрузить файлы', 'error');
                return;
            }
        }

        // Формируем URL с параметрами
        const url = new URL(`/api/direct/stream`, window.location.origin);
        url.searchParams.append('chatId', roomId);
        url.searchParams.append('question', messageContent);
        
        // Добавляем URL файлов, если они есть
        if (fileUrls.length > 0) {
            url.searchParams.append('fileUrls', JSON.stringify(fileUrls));
        }
        
        // Создаем новое соединение EventSource
        eventSource = new EventSource(url.toString());
        chatConnections = chatConnections || {};
        chatConnections[roomId] = eventSource;

        const uuid = generateUUID();
        const messageElement = document.createElement('div');
        messageElement.id = uuid;
        messageElement.className = 'message ai-message';

        const contentDiv = document.createElement('div');
        contentDiv.id = `cm${uuid}`;
        contentDiv.className = 'message-content';

        const senderDiv = document.createElement('div');
        senderDiv.className = 'message-sender';
        senderDiv.textContent = 'AI';

        messageElement.appendChild(senderDiv);
        messageElement.appendChild(contentDiv);

        let response = '';
        let isStreamActive = true;

        // 4. onmessage handler
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

                if(message.error) {
                    if (message.error === 'LIMIT_EXCEEDED') {
                        handleLimitExceeded(uuid);
                    }
                } else {
                    const aiMessage = getTempMessage(roomId, response, "temp-ai-", 'ai-assistant');
                    state.messages.push(aiMessage);

                    // Очищаем превью файлов после успешной отправки
                    if (elements.filePreview) {
                        elements.filePreview.innerHTML = '';
                        elements.filePreview.style.display = 'none';
                    }
                    
                    // Триггерим событие об успешной отправке
                    window.dispatchEvent(new CustomEvent('messageSent'));

                    renderMessages(); // Обновляем UI
                    scrollToBottom();
                }

            } else {
                response += message.content;
                contentDiv.innerHTML = marked.parse(response);
                Prism.highlightAllUnder(contentDiv);
            }
        }

        eventSource.onerror = (e) => {
            isStreamActive = false;
            onErrorSendMessage(null, roomId, tempMessage);
        };

    } catch (error) {
        onErrorSendMessage(error, roomId, tempMessage);
    }
}

const handleLimitExceeded = (uuid) => {
    elements.messageInput.disabled = true;
    elements.sendMessageBtn.disabled = true;
    elements.messageInput.classList.add("grey-color");
    document.getElementById(uuid).remove();

    const limitMessages = document.getElementById('limitMessages');
    limitMessages.innerHTML = `
      <div class="limit-messages">
        Превышен лимит сообщений в комнате, пожалуйста создайте новую.
      </div>
    `;
}

const onErrorSendMessage = (error, roomId, tempMessage) => {
    if (error) {
        console.error('Error sending message:', error);
    }
    showNotification("Error sending message", "error");

    typingIndicator.hide();
    stopStream(roomId);

    // Помечаем сообщение как неотправленное
    const messageIndex = state.messages.findIndex(m => m.id === tempMessage.id);
    if (messageIndex !== -1) {
        state.messages[messageIndex].error = true;
        renderMessages();
    }
}

const stopStream = (chatId) => {
    if (chatConnections[chatId]) {
        chatConnections[chatId].close();
        delete chatConnections[chatId];
    }
}

// Функция для создания оверлея перетаскивания
function createDragOverlay(container) {
    const overlay = document.createElement('div');
    overlay.className = 'drag-overlay';
    overlay.innerHTML = '<p>Перетащите файлы сюда</p>';
    overlay.style.display = 'none';
    container.appendChild(overlay);
    return overlay;
}

// Настройка загрузки файлов
function setupFileUpload() {
    console.log('Setting up file upload...');
    
    // Проверяем наличие необходимых элементов
    if (!elements.uploadButton || !elements.fileInput) {
        console.error('File upload elements not found');
        return;
    }
    
    // Clone elements to remove old event listeners
    const newUploadButton = elements.uploadButton.cloneNode(true);
    const newFileInput = elements.fileInput.cloneNode(true);
    
    console.log('Cloned file upload elements');
    
    // Replace old elements with new ones
    if (elements.uploadButton.parentNode) {
        elements.uploadButton.parentNode.replaceChild(newUploadButton, elements.uploadButton);
    }
    if (elements.fileInput.parentNode) {
        elements.fileInput.parentNode.replaceChild(newFileInput, elements.fileInput);
    }
    
    // Update references
    elements.uploadButton = newUploadButton;
    elements.fileInput = newFileInput;
    
    // Add click handler for the upload button
    elements.uploadButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (elements.fileInput) {
            elements.fileInput.click();
        }
    });
    
    // Add change handler for file input
    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            console.log('Files selected:', e.target.files);
            // Handle file selection if needed
        }
    });
    
    console.log('File upload setup complete');
    // Добавляем обработчики для drag and drop
    const messageInputContainer = elements.messageInput?.closest('.message-input');
    if (messageInputContainer) {
        // Создаем оверлей для перетаскивания
        const dragOverlay = createDragOverlay(messageInputContainer);
        let dragCounter = 0;
        
        const showDragOverlay = () => {
            dragCounter++;
            if (dragCounter === 1) {
                dragOverlay.style.display = 'flex';
                messageInputContainer.classList.add('drag-over');
            }
        };
        
        const hideDragOverlay = () => {
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                dragOverlay.style.display = 'none';
                messageInputContainer.classList.remove('drag-over');
            }
        };
        
        // Обработчики для drag and drop
        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showDragOverlay();
        };
        
        const handleDragEnter = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showDragOverlay();
        };
        
        const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            hideDragOverlay();
        };
        
        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            hideDragOverlay();
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                // Обновляем файлы в input
                elements.fileInput.files = e.dataTransfer.files;
                showFilePreviews(Array.from(e.dataTransfer.files));
                updateSendButtonState();
            }
        };
        
        // Удаляем старые обработчики
        messageInputContainer.removeEventListener('dragover', handleDragOver);
        messageInputContainer.removeEventListener('dragenter', handleDragEnter);
        messageInputContainer.removeEventListener('dragleave', handleDragLeave);
        messageInputContainer.removeEventListener('drop', handleDrop);
        
        // Добавляем новые обработчики
        messageInputContainer.addEventListener('dragover', handleDragOver);
        messageInputContainer.addEventListener('dragenter', handleDragEnter);
        messageInputContainer.addEventListener('dragleave', handleDragLeave);
        messageInputContainer.addEventListener('drop', handleDrop);
        
        // Обработчики для всего документа на случай выхода за пределы контейнера
        const handleDocumentDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        
        const handleDocumentDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            hideDragOverlay();
        };
        
        document.removeEventListener('dragover', handleDocumentDragOver);
        document.removeEventListener('drop', handleDocumentDrop);
        
        document.addEventListener('dragover', handleDocumentDragOver);
        document.addEventListener('drop', handleDocumentDrop);
        
        // Очистка превью после отправки
        const handleMessageSent = () => {
            elements.fileInput.value = '';
            elements.filePreview.innerHTML = '';
            elements.filePreview.style.display = 'none';
            updateSendButtonState();
        };
        
        // Удаляем старый обработчик, если он есть
        window.removeEventListener('messageSent', handleMessageSent);
        // Добавляем новый обработчик
        window.addEventListener('messageSent', handleMessageSent, { once: true });
    }
}

function showFilePreviews(files) {
    const filePreview = document.getElementById('filePreview');
    if (!filePreview) return;
    
    // Очищаем существующие превью
    filePreview.innerHTML = '';
    
    // Скрываем контейнер, если файлов нет
    if (!files || files.length === 0) {
        filePreview.style.display = 'none';
        return;
    }
    
    filePreview.style.display = 'flex';
    
    Array.from(files).forEach((file, index) => {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const isImage = file.type.startsWith('image/');
        
        // Создаем элемент превью
        const previewElement = document.createElement('div');
        previewElement.className = 'file-preview-item';
        
        if (isImage) {
            const reader = new FileReader();
            reader.onload = function(e) {
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
                
                // Добавляем обработчик удаления
                const removeBtn = previewElement.querySelector('.file-preview-remove');
                if (removeBtn) {
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        removeFile(index);
                    });
                }
                
                filePreview.appendChild(previewElement);
            };
            reader.readAsDataURL(file);
        } else {
            // Для файлов, не являющихся изображениями
            const iconClass = getFileIconClass(fileExtension);
            
            previewElement.innerHTML = `
                <div class="file-icon">
                    <i class="bi ${iconClass}"></i>
                </div>
                <div class="file-preview-info">
                    <div class="file-preview-name">${file.name}</div>
                    <div class="file-preview-size">${formatFileSize(file.size)} • ${fileExtension.toUpperCase()}</div>
                </div>
                <button type="button" class="file-preview-remove" data-index="${index}" title="Удалить">
                    <i class="bi bi-x"></i>
                </button>
            `;
            
            // Добавляем обработчик удаления
            const removeBtn = previewElement.querySelector('.file-preview-remove');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeFile(index);
                });
            }
            
            filePreview.appendChild(previewElement);
        }
    });
    
    // Обновляем состояние кнопки отправки
    updateSendButtonState();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Настройка обработчиков событий
// Функция обновления состояния кнопки отправки
function updateSendButtonState() {
    if (!elements.sendButton) return;

    const hasText = elements.messageInput && elements.messageInput.value.trim().length > 0;
    const hasFiles = elements.fileInput && elements.fileInput.files && elements.fileInput.files.length > 0;

    elements.sendButton.disabled = !(hasText || hasFiles);

    // Update button appearance based on state
    if (elements.sendButton.disabled) {
        elements.sendButton.setAttribute('aria-label', 'Введите сообщение или прикрепите файл');
    } else {
        elements.sendButton.setAttribute('aria-label', 'Отправить сообщение');
    }
}

// Функция загрузки файла
async function uploadFile(file) {
    if (!file) return null;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/direct/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('File upload failed');
        }

        return await response.text();
    } catch (error) {
        console.error('Error uploading file:', error);
        showNotification('Не удалось загрузить файл', 'error');
        throw error;
    }
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Инициализация загрузки файлов
    console.log('Setting up file upload...');
    setupFileUpload();
    console.log('File upload setup complete');

    // Обработка нажатия на кнопку отправки
    if (elements.sendMessageBtn) {
        console.log('Setting up send button click handler');
        elements.sendMessageBtn.addEventListener('click', sendMessage);
    } else {
        console.error('Send button not found');
    }

    // Обработка нажатия Enter в поле ввода
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
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

    if (!await confirmDeleteChat(state.currentRoom.title)) {
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
        elements.currentRoomTitle.textContent = `${elements.userName} Выберите или создайте чат`;
        hideInputs(true)

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

async function confirmDeleteChat(title) {
    const result = await Swal.fire({
        title: 'Подтверждение удаления',
        html: `Вы уверены, что хотите удалить чат <b>"${title}"</b>?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Да, удалить',
        cancelButtonText: 'Отмена',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        reverseButtons: true,
        backdrop: true,
        allowOutsideClick: false,
        showClass: {
            popup: 'animate__animated animate__fadeInDown'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutUp'
        }
    });
    return result.isConfirmed;
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
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM полностью загружен, начинаем инициализацию...');

        // 1. Инициализируем элементы
        initElements();
        console.log('Элементы инициализированы');
        
        // 2. Настраиваем обработчики событий
        setupEventListeners();
        console.log('Обработчики событий настроены');
        
        // 3. Загружаем комнаты
        loadRooms();
        
        // 4. Обновляем видимость кнопки удаления
        updateDeleteButtonVisibility();

        console.log('Приложение инициализировано');
        updateSendButtonState(); // Устанавливаем начальное состояние

        // Обработка ввода текста
        if (elements.messageInput) {
            console.log('Настройка обработчиков для поля ввода');
            elements.messageInput.addEventListener('input', updateSendButtonState);

            // Обработка отправки по Enter
            elements.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (elements.sendButton && !elements.sendButton.disabled) {
                        console.log('Отправка сообщения по нажатию Enter');
                        sendMessage();
                    }
                }
            });
        } else {
            console.error('Поле ввода сообщения не найдено');
        }

        // Обработка загрузки файлов
        if (elements.fileInput) {
            console.log('Настройка обработчиков для загрузки файлов');
            elements.fileInput.addEventListener('change', () => {
                console.log('Выбран файл для загрузки');
                updateSendButtonState();
                // Показываем превью файлов, если есть выбранные файлы
                if (elements.fileInput.files && elements.fileInput.files.length > 0) {
                    showFilePreviews(elements.fileInput.files);
                }
            });

            // Обработка перетаскивания файлов
            elements.messageInputContainer?.addEventListener('dragover', (e) => {
                e.preventDefault();
                elements.messageInputContainer.classList.add('drag-over');
            });

            elements.messageInputContainer?.addEventListener('dragleave', () => {
                elements.messageInputContainer.classList.remove('drag-over');
            });

            elements.messageInputContainer?.addEventListener('drop', (e) => {
                e.preventDefault();
                elements.messageInputContainer.classList.remove('drag-over');

                if (e.dataTransfer.files.length) {
                    elements.fileInput.files = e.dataTransfer.files;
                    updateSendButtonState();
                    showFilePreviews(e.dataTransfer.files);
                }
            });
        } else {
            console.error('Поле выбора файлов не найдено');
        }

        // Кнопка загрузки файлов
        if (elements.uploadButton) {
            elements.uploadButton.addEventListener('click', () => {
                if (elements.fileInput) {
                    elements.fileInput.click();
                }
            });
        } else {
            console.error('Кнопка загрузки файлов не найдена');
        }

        console.log('Инициализация завершена успешно');
    } catch (error) {
        console.error('Ошибка при инициализации приложения:', error);
    }
});


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

hideInputs = (disabled) => {
    if (disabled) {
        elements.messageInput.disabled = true;
        elements.sendMessageBtn.disabled = true;
        elements.messageInput.classList.add("d-none");
        elements.sendMessageBtn.classList.add("d-none");
    } else {
        elements.messageInput.disabled = false;
        elements.sendMessageBtn.disabled = false;
        elements.messageInput.classList.remove("d-none");
        elements.sendMessageBtn.classList.remove("d-none");
    }
}

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



