// Конфигурация
const config = {
    apiBaseUrl: 'http://localhost:8080/api/chat'
};

// DOM элементы
const elements = (function() {
    const elements = {
        roomsList: document.getElementById('roomsList'),
        currentRoomTitle: document.getElementById('currentRoomTitle'),
        chatMessages: document.getElementById('chatMessages'),
        messageInput: document.getElementById('messageInput'),
        sendButton: document.getElementById('sendMessageBtn'),
        createRoomBtn: document.getElementById('createRoomBtn'),
        confirmCreateRoom: document.getElementById('confirmCreateRoom'),
        roomTitleInput: document.getElementById('roomTitleInput'),
        createRoomModal: document.getElementById('createRoomModal')
            ? new bootstrap.Modal('#createRoomModal')
            : null,
        userId: document.getElementById('userId')?.value || '',
        userName: document.getElementById('userName')?.value || 'User',
        fileInput: null,
        filePreview: null,
        uploadButton: null
    };

    function init() {
        // Инициализация элементов для загрузки файлов
        elements.fileInput = document.createElement('input');
        elements.fileInput.type = 'file';
        elements.fileInput.accept = 'image/*'; // Только изображения
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

        return elements;
    }

    return init();
})();

let eventSource = null;
let chatConnections = {};
let state = {
    currentRoom: null,
    rooms: [],
    messages: []
};

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
        showNotification('Не удалось загрузить комнаты. Пожалуйста, обновите страницу.', 'error');
    }
}

function renderRoomsList() {
    if (!elements.roomsList) return;

    elements.roomsList.innerHTML = '';

    if (!state.rooms?.length) {
        elements.roomsList.innerHTML = '<div class="no-rooms">Нет доступных чатов</div>';
        return;
    }

    state.rooms = [...state.rooms].sort((a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    state.rooms.forEach(room => {
        if (!room?.id || !room?.title) return;

        const roomElement = document.createElement('div');
        roomElement.className = `room-item ${state.currentRoom?.id === room.id ? 'active' : ''}`;

        // Контейнер для названия и кнопки удаления
        const roomContent = document.createElement('div');
        roomContent.className = 'room-content';
        roomContent.style.display = 'flex';
        roomContent.style.alignItems = 'center';
        roomContent.style.justifyContent = 'space-between';

        // Название комнаты
        const titleElement = document.createElement('span');
        titleElement.textContent = room.title;
        titleElement.title = room.title;
        titleElement.style.flex = '1';
        titleElement.style.cursor = 'pointer';
        titleElement.addEventListener('click', () => switchRoom(room));

        // Кнопка удаления
        const deleteButton = document.createElement('button');
         deleteButton.id= 'deleteRoomBtn';
         deleteButton.className = 'btn-delete';
         deleteButton.innerHTML = '<svg class="icon-delete" viewBox="0 0 24 24">' +
             '                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>' +
             '                    </svg>';
        deleteButton.title = `Удалить "${room.title}"`;
        deleteButton.style.marginLeft = '10px';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем переключение комнаты при клике на кнопку
            handleDeleteRoom(room);
        });

        roomContent.appendChild(titleElement);
        roomContent.appendChild(deleteButton);
        roomElement.appendChild(roomContent);

        elements.roomsList.appendChild(roomElement);
    });
}

async function switchRoom(room) {
    if (!room) return;

    localStorage.setItem('lastRoomId', room.id);
    state.currentRoom = room;

    try {
        renderRoomsList();
        elements.currentRoomTitle.textContent = room.title;
        await loadRoomMessages(room.id);

        hideInputs(!room.active);
        elements.messageInput.classList.toggle('grey-color', !room.active);

        if (!room.active && elements.limitMessages) {
            elements.limitMessages.innerHTML = '<div class="limit-messages">Превышен лимит сообщений в комнате</div>';
        } else if (elements.limitMessages) {
            elements.limitMessages.innerHTML = '';
        }

        scrollToBottom();
    } catch (error) {
        console.error('Error switching room:', error);
        showNotification('Ошибка загрузки', 'error');
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
        showNotification('Ошибка загрузки сообщений. Обновите страницу.', 'error');
    }
}

function renderMessages() {
    if (!elements.chatMessages) return;

    elements.chatMessages.innerHTML = '';

    if (!state.messages.length && state.currentRoom) {
        elements.chatMessages.innerHTML = '<div class="no-messages">Нет сообщений</div>';
        return;
    }

    const sortedMessages = [...state.messages].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
    );

    sortedMessages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.userId === elements.userId ? 'user-message' : 'ai-message'}`;
        messageElement.setAttribute('data-message-id', message.id);
        if (message.error) messageElement.classList.add('message-error');

        // Handle file data if it exists
        let filePreviews = '';
        if (message.fileData) {
            const fileData = message.fileData;
            const fileExtension = fileData.fileName ? fileData.fileName.split('.').pop().toLowerCase() : '';
            const isImage = fileData.contentType && fileData.contentType.startsWith('image/');
            const fileUrl = `/api/files/${fileData.id}`;
            const previewUrl = getFilePreviewUrl(fileData);
            
            if (isImage) {
                filePreviews = `
                    <div class="file-preview">
                        <img src="${previewUrl}" alt="${fileData.fileName || 'Image'}" class="file-preview-image">
                    </div>
                `;
            } else {
                filePreviews = `
                    <div class="file-preview">
                        <div class="file-icon">
                            <i class="bi ${getFileIconClass(fileExtension)}"></i>
                        </div>
                        <div class="file-preview-info">
                            <div class="file-preview-name">${fileData.fileName || 'File'}</div>
                            ${fileData.size ? `<div class="file-preview-size">${formatFileSize(fileData.size)}${fileExtension ? ' • ' + fileExtension.toUpperCase() : ''}</div>` : ''}
                        </div>
                        <a href="${fileUrl}" class="file-download" download="${fileData.fileName || 'download'}" title="Скачать">
                            <i class="bi bi-download"></i>
                        </a>
                    </div>
                `;
            }
        }

        messageElement.innerHTML = `
            <div class="message-sender">${message.userId === elements.userId ? 'Вы' : 'AI'}</div>
            ${filePreviews}
            <div class="message-content">${message.content ? marked.parse(message.content) : ''}</div>
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
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function scrollToBottom() {
    if (elements.chatMessages) {
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }
}

async function createRoom(title) {
    if (!title?.trim()) {
        showNotification('Название комнаты не может быть пустым', 'error');
        return null;
    }

    try {
        const response = await fetch(
            `${config.apiBaseUrl}/rooms/create?userId=${elements.userId}&title=${encodeURIComponent(title)}`,
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
        showNotification(`Не удалось создать комнату: ${error.message}`, 'error');
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

async function sendMessage() {
    if (!elements.sendButton || elements.sendButton.disabled) return;

    const messageContent = elements.messageInput?.value.trim() || '';
    const files = elements.fileInput?.files || [];
    if (!messageContent && !files.length) return;

    elements.sendButton.disabled = true;

    const roomId = state.currentRoom.id;
    let fileData = null;
    
    // Upload file first if exists
    if (files.length) {
        try {
            fileData = await uploadFile(files[0]);
        } catch (error) {
            console.error('Error uploading file:', error);
            showNotification('Ошибка при загрузке файла', 'error');
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
    scrollToBottom();

    try {
        if (!state.currentRoom) throw new Error('No current room selected');

        if (window.eventSource) {
            window.eventSource.close();
        }

        if (elements.messageInput) elements.messageInput.value = '';
        if (elements.fileInput) elements.fileInput.value = '';

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
        
        // Clear message input and file input
        if (elements.messageInput) elements.messageInput.value = '';
        if (elements.fileInput) elements.fileInput.value = '';


        eventSource = new EventSource(url.toString());
        chatConnections[roomId] = eventSource;

        const uuid = generateUUID();
        const messageElement = Object.assign(document.createElement('div'), {
            id: uuid,
            className: 'message ai-message',
            innerHTML: `
                <div class="message-sender">AI</div>
                <div id="cm${uuid}" class="message-content"></div>
            `
        });

        let response = '';
        let isStreamActive = true;

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
                } else {
                    state.messages.push(getTempMessage(roomId, response, 'temp-ai-', 'ai-assistant'));
                    window.dispatchEvent(new CustomEvent('messageSent'));
                    renderMessages();
                    scrollToBottom();
                }
            } else {
                response += message.content;
                const contentDiv = document.getElementById(`cm${uuid}`);
                if (contentDiv) {
                    contentDiv.innerHTML = marked.parse(response);
                    Prism.highlightAllUnder(contentDiv);
                }
            }
        };

        eventSource.onerror = () => {
            isStreamActive = false;
            onErrorSendMessage(null, roomId, tempMessage);
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

    if (elements.limitMessages) {
        elements.limitMessages.innerHTML = '<div class="limit-messages">Превышен лимит сообщений в комнате, пожалуйста создайте новую.</div>';
    }
}

function onErrorSendMessage(error, roomId, tempMessage) {
    if (error) console.error('Error sending message:', error);
    showNotification('Ошибка отправки сообщения', 'error');

    typingIndicator.hide();
    stopStream(roomId);

    const messageIndex = state.messages.findIndex(m => m.id === tempMessage.id);
    if (messageIndex !== -1) {
        state.messages[messageIndex].error = true;
        renderMessages();
    }
}

function stopStream(chatId) {
    if (chatConnections[chatId]) {
        chatConnections[chatId].close();
        delete chatConnections[chatId];
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

    // Клонируем элементы для предотвращения дублирования обработчиков
    const newUploadButton = elements.uploadButton.cloneNode(true);
    const newFileInput = elements.fileInput.cloneNode(true);

    elements.uploadButton.parentNode?.replaceChild(newUploadButton, elements.uploadButton);
    elements.fileInput.parentNode?.replaceChild(newFileInput, elements.fileInput);

    elements.uploadButton = newUploadButton;
    elements.fileInput = newFileInput;

    // Обработчик клика по кнопке загрузки
    elements.uploadButton.addEventListener('click', (e) => {
        e.preventDefault();
        elements.fileInput.click();
    });

    // Обработчик изменения fileInput
    const handleFileChange = () => {
        if (elements.fileInput.files?.length) {
            showFilePreviews(Array.from(elements.fileInput.files));
        }
    };
    elements.fileInput.removeEventListener('change', handleFileChange);
    elements.fileInput.addEventListener('change', handleFileChange);

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

    const handleMessageSent = () => {
        elements.fileInput.value = '';
        elements.filePreview.innerHTML = '';
        elements.filePreview.style.display = 'none';
        updateSendButtonState();
    };

    window.removeEventListener('messageSent', handleMessageSent);
    window.addEventListener('messageSent', handleMessageSent, { once: true });
}

function removeFile(index) {
    const files = Array.from(elements.fileInput.files);
    files.splice(index, 1);

    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    elements.fileInput.files = dataTransfer.files;

    showFilePreviews(files);
}

// Утилита для debouncing
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

// Модифицированная функция showFilePreviews
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
}, 100); // Задержка 100 мс

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

function setupEventListeners() {
    setupFileUpload();

    if (elements.sendButton) {
        elements.sendButton.addEventListener('click', sendMessage);
    }

    if (elements.messageInput) {
        elements.messageInput.addEventListener('keypress', (e) => {
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
                const { selectionStart, selectionEnd, value } = elements.messageInput;
                elements.messageInput.value = value.slice(0, selectionStart) + '\n' + value.slice(selectionEnd);
                elements.messageInput.selectionStart = elements.messageInput.selectionEnd = selectionStart + 1;
                autoResize(elements.messageInput);
            }
        });
    }

    if (elements.createRoomBtn && elements.createRoomModal) {
        elements.createRoomBtn.addEventListener('click', () => {
            elements.roomTitleInput.value = '';
            elements.createRoomModal.show();
        });
    }

    if (elements.confirmCreateRoom) {
        elements.confirmCreateRoom.addEventListener('click', () => {
            const title = elements.roomTitleInput.value.trim();
            if (title) {
                createRoom(title);
                elements.createRoomModal.hide();
            }
        });
    }
}

function autoResize(element) {
    element.style.height = 'auto';
    element.style.height = Math.min(element.scrollHeight, 100) + 'px';
}

const typingIndicator = {
    timer: null,
    container: null,

    init() {
        this.container = document.getElementById('typingIndicatorContainer') ||
            Object.assign(document.createElement('div'), {
                id: 'typingIndicatorContainer',
                style: 'display: none; min-height: 40px;',
                innerHTML: `
                    <div class="typing-indicator">
                        <div class="typing-dots">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                        </div>
                        <span>AI печатает ответ...</span>
                    </div>`
            });

        const chatContainer = document.querySelector('.chat-messages')?.parentElement;
        if (chatContainer && !document.getElementById('typingIndicatorContainer')) {
            chatContainer.appendChild(this.container);
        }
        return !!chatContainer;
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

async function handleDeleteRoom() {
    if (!state.currentRoom || !await confirmDeleteChat(state.currentRoom.title)) return;

    try {
        const response = await fetch(`/api/chat/rooms/${state.currentRoom.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': elements.userId
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        state.rooms = state.rooms.filter(room => room.id !== state.currentRoom.id);
        state.messages = [];
        state.currentRoom = null;

        renderRoomsList();
        renderMessages();
        elements.currentRoomTitle.textContent = `${elements.userName} Выберите или создайте чат`;
        hideInputs(true);
        localStorage.removeItem('lastRoomId');

        if (state.rooms.length) {
            await switchRoom(state.rooms[0]);
        }

        showNotification('Чат успешно удален', 'success');
    } catch (error) {
        console.error('Error deleting room:', error);
        showNotification('Не удалось удалить чат', 'error');
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
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' }
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
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        setupEventListeners();
        loadRooms();
        updateSendButtonState();

        if (elements.messageInput) {
            elements.messageInput.addEventListener('input', updateSendButtonState);
            elements.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !elements.sendButton.disabled) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }

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

        if (elements.uploadButton) {
            elements.uploadButton.addEventListener('click', () => elements.fileInput.click());
        }
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