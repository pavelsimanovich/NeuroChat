// DOM элементы
const searchElements = {
    searchInput: null,
    searchResults: null,
    searchButton: null,
    searchBar: null,
    toggleSearch: null,
    init() {
        this.searchInput = document.getElementById('searchInput');
        this.searchResults = document.getElementById('searchResults');
        this.searchButton = document.getElementById('searchButton');
        this.searchBar = document.querySelector('.search-bar');
        this.toggleSearch = document.getElementById('toggleSearch');
        return this;
    }
};

// Инициализация
searchElements.init();

// Функция для отображения/скрытия поля поиска
function toggleSearch() {
    if (!searchElements.searchBar || !searchElements.searchResults) return;
    
    if (searchElements.searchBar.classList.contains('d-none')) {
        searchElements.searchBar.classList.remove('d-none');
        searchElements.searchResults.classList.remove('d-none');
        searchElements.searchInput.focus();
    } else {
        searchElements.searchBar.classList.add('d-none');
        searchElements.searchResults.classList.add('d-none');
        searchElements.searchInput.value = '';
    }
}

// Добавляем обработчик для кнопки поиска
if (searchElements.toggleSearch) {
    searchElements.toggleSearch.addEventListener('click', toggleSearch);
}

// Добавляем обработчик для кнопки поиска
if (searchElements.searchButton) {
    searchElements.searchButton.addEventListener('click', () => {
        searchMessages(searchElements.searchInput.value);
    });
}

// Добавляем обработчик для поля ввода
if (searchElements.searchInput) {
    searchElements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchMessages(searchElements.searchInput.value);
        }
    });
}

async function searchMessages(query) {
    if (!query.trim()) {
        if (searchElements.searchResults) {
            searchElements.searchResults.innerHTML = '';
        }
        return;
    }

    try {
        const response = await fetch(`${config.apiBaseUrl}/messages/search?roomId=${state.currentRoom?.id}&query=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const results = await response.json();
        if (searchElements.searchResults) {
            renderSearchResults(results);
        }
    } catch (error) {
        console.error('Error searching messages:', error);
        if (searchElements.searchResults) {
            searchElements.searchResults.innerHTML = '<div class="text-muted">Ошибка при поиске сообщений</div>';
        }
    }
}

function renderSearchResults(results) {
    if (!results?.length) {
        searchElements.searchResults.innerHTML = '<div class="text-muted">Сообщения не найдены</div>';
        return;
    }

    const html = results.map(result => `
        <div class="search-result-item p-2 border-bottom">
            <div class="d-flex justify-content-between">
                <div>
                    <small class="text-muted">${formatTime(result.timestamp)}</small>
                </div>
                <button class="btn btn-link p-0" onclick="jumpToMessage('${result.id}')">
                    <i class="bi bi-arrow-right"></i>
                </button>
            </div>
            <div class="mt-1">${result.content}</div>
        </div>
    `).join('');

    searchElements.searchResults.innerHTML = html;
}

function jumpToMessage(messageId) {
    if (!searchElements.searchResults || !searchElements.searchBar) return;
    
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth' });
        messageElement.classList.add('highlight');
        setTimeout(() => messageElement.classList.remove('highlight'), 2000);
    }
    searchElements.searchResults.classList.add('d-none');
    searchElements.searchBar.classList.add('d-none');
    searchElements.searchInput.value = '';
}

if (searchElements.searchInput) {
    searchElements.searchInput.addEventListener('input', debounce(() => {
        searchMessages(searchElements.searchInput.value);
    }, 300));
}

// Добавляем стили для выделения найденных сообщений
const style = document.createElement('style');
style.textContent = `
    .highlight {
        background-color: #fff59d;
        transition: background-color 0.3s;
    }
    .search-results {
        position: fixed;
        top: 100px;
        right: 20px;
        width: 300px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        max-height: 500px;
        overflow-y: auto;
        z-index: 1000;
    }
    .search-result-item {
        cursor: pointer;
        transition: background-color 0.2s;
    }
    .search-result-item:hover {
        background-color: #f8f9fa;
    }
`;
document.head.appendChild(style);
