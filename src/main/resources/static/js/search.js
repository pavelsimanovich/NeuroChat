// Utility function for debouncing
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

// Состояние поиска
const searchState = {
    isSearchActive: false,
    currentQuery: '',
    results: [],
    isLoading: false,
    selectedIndex: -1
};

// DOM элементы
const searchElements = {
    searchInput: null,
    searchResults: null,
    searchResultsContent: null,
    searchButton: null,
    searchBar: null,
    toggleSearch: null,
    clearSearchBtn: null,
    closeSearchResults: null,
    searchInfo: null,
    searchResultsCount: null,

    init() {
        this.searchInput = document.getElementById('searchInput');
        this.searchResults = document.getElementById('searchResults');
        this.searchResultsContent = document.getElementById('searchResultsContent');
        this.searchButton = document.getElementById('searchButton');
        this.searchBar = document.querySelector('.search-bar');
        this.toggleSearch = document.getElementById('toggleSearch');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.closeSearchResults = document.getElementById('closeSearchResults');
        this.searchInfo = document.getElementById('searchInfo');
        this.searchResultsCount = document.getElementById('searchResultsCount');
        return this;
    }
};

// Инициализация элементов
searchElements.init();

/**
 * Функция для отображения/скрытия поля поиска
 */
function toggleSearch() {
    if (!searchElements.searchBar) return;

    if (searchElements.searchBar.classList.contains('d-none')) {
        // Показываем поле поиска
        searchElements.searchBar.classList.remove('d-none');
        // Фокусируемся на поле ввода
        searchElements.searchInput.focus();
        // Скрываем результаты
        hideSearchResults();
        // Обновляем состояние
        searchState.isSearchActive = true;
    } else {
        // Скрываем поле поиска и результаты
        searchElements.searchBar.classList.add('d-none');
        hideSearchResults();
        // Очищаем поле ввода
        clearSearch();
        // Обновляем состояние
        searchState.isSearchActive = false;
    }
}

/**
 * Очистка поля поиска
 */
function clearSearch() {
    if (searchElements.searchInput) {
        searchElements.searchInput.value = '';
        searchState.currentQuery = '';
        searchElements.clearSearchBtn.classList.add('d-none');
        hideSearchResults();

        if (searchElements.searchInfo) {
            searchElements.searchInfo.classList.add('d-none');
        }
    }
}

/**
 * Скрытие результатов поиска
 */
function hideSearchResults() {
    if (searchElements.searchResults) {
        searchElements.searchResults.classList.add('d-none');
        if (searchElements.searchResultsContent) {
            searchElements.searchResultsContent.innerHTML = '';
        }
    }
}

/**
 * Показать индикатор загрузки в результатах поиска
 */
function showSearchLoading() {
    if (searchElements.searchResultsContent) {
        searchElements.searchResults.classList.remove('d-none');
        searchElements.searchResultsContent.innerHTML = `
            <div class="d-flex justify-content-center align-items-center p-4">
                <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
                <span>Поиск сообщений...</span>
            </div>
        `;
    }
}

/**
 * Добавляем обработчики событий
 */
function setupEventListeners() {
    // Кнопка открытия/закрытия поиска
    if (searchElements.toggleSearch) {
        searchElements.toggleSearch.addEventListener('click', toggleSearch);
    }

    // Кнопка выполнения поиска
    if (searchElements.searchButton) {
        searchElements.searchButton.addEventListener('click', () => {
            const query = searchElements.searchInput.value;
            if (query.trim()) {
                searchMessages(query);
            }
        });
    }

    // Поле ввода поиска
    if (searchElements.searchInput) {
        // Обработка нажатия Enter
        searchElements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchElements.searchInput.value;
                if (query.trim()) {
                    searchMessages(query);
                }
                e.preventDefault();
            }
        });

        // Обработка ввода текста с задержкой
        searchElements.searchInput.addEventListener('input', debounce((e) => {
            const query = e.target.value.trim();
            searchState.currentQuery = query;

            // Показываем/скрываем кнопку очистки
            if (searchElements.clearSearchBtn) {
                searchElements.clearSearchBtn.classList.toggle('d-none', !query);
            }

            // Если запрос пустой, скрываем результаты
            if (!query) {
                hideSearchResults();
                if (searchElements.searchInfo) {
                    searchElements.searchInfo.classList.add('d-none');
                }
                return;
            }

            // Если запрос короткий, не выполняем поиск автоматически
            if (query.length < 3) return;

            // Выполняем поиск
            searchMessages(query, true);
        }, 300));

        // Обработка навигации по результатам с клавиатуры
        searchElements.searchInput.addEventListener('keydown', (e) => {
            if (!searchState.results.length) return;

            // Навигация вверх/вниз по результатам
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                navigateSearchResults(e.key === 'ArrowDown' ? 1 : -1);
            }

            // Переход к выбранному результату
            if (e.key === 'Tab') {
                if (searchState.selectedIndex >= 0) {
                    e.preventDefault();
                    const result = searchState.results[searchState.selectedIndex];
                    if (result) {
                        jumpToMessage(result.id);
                    }
                }
            }
        });
    }

    // Кнопка очистки поиска
    if (searchElements.clearSearchBtn) {
        searchElements.clearSearchBtn.addEventListener('click', clearSearch);
    }

    // Кнопка закрытия результатов
    if (searchElements.closeSearchResults) {
        searchElements.closeSearchResults.addEventListener('click', hideSearchResults);
    }

    // Обработка клика вне области поиска для его скрытия
    document.addEventListener('click', (e) => {
        if (!searchState.isSearchActive) return;

        const isClickInSearchArea = e.target.closest('.search-container') || 
                                    e.target.closest('#toggleSearch');

        if (!isClickInSearchArea) {
            toggleSearch();
        }
    });

    // Добавляем обработчик переключения комнат для скрытия поиска
    document.addEventListener('roomChanged', () => {
        if (searchState.isSearchActive) {
            clearSearch();
            hideSearchResults();
        }
    });
}

/**
 * Выполняет поиск сообщений по запросу
 * @param {string} query - поисковый запрос
 * @param {boolean} isAutoSearch - флаг автоматического поиска (при вводе)
 */
async function searchMessages(query, isAutoSearch = false) {
    // Проверяем наличие текущей комнаты и валидность запроса
    if (!query.trim() || !state.currentRoom?.id) {
        hideSearchResults();
        return;
    }

    // Обновляем состояние
    searchState.currentQuery = query;
    searchState.isLoading = true;

    // Показываем индикатор загрузки
    showSearchLoading();

    try {
        // Отправляем запрос на сервер
        const response = await fetch(`${config.apiBaseUrl}/messages/search?roomId=${state.currentRoom.id}&query=${encodeURIComponent(query)}`);

        if (!response.ok) {
            throw new Error(`Ошибка HTTP! Статус: ${response.status}`);
        }

        // Получаем результаты
        const results = await response.json();
        searchState.results = results || [];

        // Обновляем UI
        renderSearchResults(results, isAutoSearch);
        updateSearchCountInfo(results.length);
    } catch (error) {
        console.error('Ошибка при поиске сообщений:', error);
        // Показываем ошибку в результатах
        showSearchError(error.message);
    } finally {
        searchState.isLoading = false;
    }
}

/**
 * Отображает результаты поиска
 * @param {Array} results - массив результатов поиска
 * @param {boolean} isAutoSearch - флаг автоматического поиска
 */
function renderSearchResults(results, isAutoSearch) {
    // Убеждаемся, что контейнер результатов существует
    if (!searchElements.searchResultsContent) return;

    // Если результатов нет
    if (!results?.length) {
        searchElements.searchResultsContent.innerHTML = `
            <div class="p-4 text-center">
                <i class="bi bi-search text-muted" style="font-size: 1.5rem;"></i>
                <p class="mt-2 mb-0 text-muted">Сообщения не найдены</p>
            </div>
        `;
        return;
    }

    // Сбрасываем выделенный элемент
    searchState.selectedIndex = -1;

    // Форматируем результаты
    const html = results.map((result, index) => {
        // Выделяем запрос в тексте
        let highlightedContent = highlightSearchQuery(result.content, searchState.currentQuery);

        // Определяем, от кого сообщение
        const isUserMessage = result.role === 'user';
        const messageTypeIcon = isUserMessage ? 
            '<i class="bi bi-person-circle text-primary"></i>' : 
            '<i class="bi bi-robot text-success"></i>';

        // Создаем элемент результата
        return `
            <div class="search-result-item p-3 border-bottom" data-result-index="${index}" data-message-id="${result.id}">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div class="d-flex align-items-center">
                        ${messageTypeIcon}
                        <small class="ms-2 text-muted">${formatSearchResultTime(result.timestamp)}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-primary py-0 px-2" onclick="jumpToMessage('${result.id}')">
                        Перейти
                    </button>
                </div>
                <div class="search-result-content mt-1">${highlightedContent}</div>
            </div>
        `;
    }).join('');

    // Обновляем содержимое
    searchElements.searchResultsContent.innerHTML = html;

    // Добавляем обработчики для результатов
    setupSearchResultsHandlers();

    // Если это не автоматический поиск, показываем результаты
    if (!isAutoSearch) {
        searchElements.searchResults.classList.remove('d-none');
    }
}

/**
 * Обновляет информацию о количестве найденных результатов
 * @param {number} count - количество результатов
 */
function updateSearchCountInfo(count) {
    if (searchElements.searchInfo && searchElements.searchResultsCount) {
        searchElements.searchResultsCount.textContent = count;
        searchElements.searchInfo.classList.remove('d-none');

        // Обновляем текст в зависимости от количества
        const countLabel = document.createElement('span');
        countLabel.textContent = ` ${getResultsCountText(count)}`;

        // Очищаем содержимое после счетчика
        const countElement = searchElements.searchResultsCount.nextSibling;
        if (countElement) {
            countElement.remove();
        }

        // Вставляем новый текст
        searchElements.searchResultsCount.parentNode.appendChild(countLabel);
    }
}

/**
 * Возвращает текст в зависимости от количества результатов
 * @param {number} count - количество результатов
 * @returns {string} - текст для отображения
 */
function getResultsCountText(count) {
    if (count === 0) return 'результатов';

    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return 'результатов';
    }

    if (lastDigit === 1) {
        return 'результат';
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return 'результата';
    }

    return 'результатов';
}

/**
 * Выделяет поисковый запрос в тексте
 * @param {string} text - исходный текст
 * @param {string} query - поисковый запрос
 * @returns {string} - текст с выделенным запросом
 */
function highlightSearchQuery(text, query) {
    if (!query.trim() || !text) return text;

    // Экранируем специальные символы в запросе
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Создаем регулярное выражение для поиска запроса (без учета регистра)
    const regex = new RegExp(`(${escapedQuery})`, 'gi');

    // Заменяем найденные совпадения на выделенный текст
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

/**
 * Форматирует время для отображения в результатах поиска
 * @param {string|number} timestamp - метка времени
 * @returns {string} - отформатированное время
 */
function formatSearchResultTime(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const options = { hour: '2-digit', minute: '2-digit' };
    let formattedTime = date.toLocaleTimeString('ru-RU', options);

    if (!isToday) {
        const dateOptions = { day: 'numeric', month: 'short' };
        formattedTime = `${date.toLocaleDateString('ru-RU', dateOptions)}, ${formattedTime}`;
    }

    return formattedTime;
}

/**
 * Настраивает обработчики для элементов результатов поиска
 */
function setupSearchResultsHandlers() {
    const resultItems = document.querySelectorAll('.search-result-item');

    resultItems.forEach(item => {
        // Добавляем обработчик клика
        item.addEventListener('click', (e) => {
            // Игнорируем клик, если это была кнопка перехода
            if (e.target.closest('button')) return;

            const index = parseInt(item.getAttribute('data-result-index'));
            const messageId = item.getAttribute('data-message-id');

            // Обновляем выбранный индекс
            searchState.selectedIndex = index;

            // Обновляем стили
            updateSelectedResultItem();

            // Переходим к сообщению
            jumpToMessage(messageId);
        });

        // Добавляем обработчик наведения
        item.addEventListener('mouseenter', () => {
            const index = parseInt(item.getAttribute('data-result-index'));
            searchState.selectedIndex = index;
            updateSelectedResultItem();
        });
    });
}

/**
 * Обновляет стили выбранного элемента результатов
 */
function updateSelectedResultItem() {
    // Удаляем выделение со всех элементов
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.classList.remove('selected-result');
    });

    // Если есть выбранный элемент, добавляем ему класс
    if (searchState.selectedIndex >= 0) {
        const selectedItem = document.querySelector(`.search-result-item[data-result-index="${searchState.selectedIndex}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected-result');

            // Прокручиваем к выбранному элементу
            selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

/**
 * Навигация по результатам поиска с помощью клавиш
 * @param {number} direction - направление (1 - вниз, -1 - вверх)
 */
function navigateSearchResults(direction) {
    if (!searchState.results.length) return;

    // Вычисляем новый индекс
    let newIndex = searchState.selectedIndex + direction;

    // Обрабатываем граничные случаи
    if (newIndex < 0) {
        newIndex = searchState.results.length - 1;
    } else if (newIndex >= searchState.results.length) {
        newIndex = 0;
    }

    // Обновляем выбранный индекс
    searchState.selectedIndex = newIndex;

    // Обновляем стили
    updateSelectedResultItem();
}

/**
 * Переходит к сообщению по его ID
 * @param {string} messageId - ID сообщения
 */
function jumpToMessage(messageId) {
    // Находим элемент сообщения по ID
    const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);

    if (messageElement) {
        // Прокручиваем к сообщению
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Добавляем класс для подсветки сообщения
        messageElement.classList.add('highlight');

        // Удаляем класс через некоторое время
        setTimeout(() => messageElement.classList.remove('highlight'), 3000);
    }

    // Скрываем результаты, но оставляем поле поиска открытым
    hideSearchResults();
}

/**
 * Показывает сообщение об ошибке в результатах поиска
 * @param {string} errorMessage - сообщение об ошибке
 */
function showSearchError(errorMessage) {
    if (!searchElements.searchResultsContent) return;

    searchElements.searchResultsContent.innerHTML = `
        <div class="p-4 text-center">
            <i class="bi bi-exclamation-triangle text-warning" style="font-size: 1.5rem;"></i>
            <p class="mt-2 mb-0 text-muted">Ошибка при поиске: ${errorMessage || 'Не удалось выполнить поиск'}</p>
            <button class="btn btn-sm btn-outline-primary mt-3" onclick="searchMessages('${searchState.currentQuery}')">Повторить</button>
        </div>
    `;
}

// Добавляем стили для поиска
const searchStyles = document.createElement('style');
searchStyles.textContent = `
    .search-container {
        z-index: 1000;
    }
    .search-bar {
        transition: all 0.3s ease;
        position: relative;
        border-radius: 6px;
    }
    .search-results {
        position: absolute;
        top: calc(100% + 5px);
        right: 0;
        width: 400px;
        max-width: 100%;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-height: 400px;
        overflow-y: auto;
        z-index: 1001;
        transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .search-result-item {
        cursor: pointer;
        transition: background-color 0.2s;
        border-left: 3px solid transparent;
    }
    .search-result-item:hover, .search-result-item.selected-result {
        background-color: #f8f9fa;
        border-left-color: #0d6efd;
    }
    .search-result-content {
        font-size: 0.95rem;
        max-height: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .search-highlight {
        background-color: #fff59d;
        padding: 0 2px;
        border-radius: 2px;
        font-weight: 500;
    }
    .highlight {
        background-color: #fff59d;
        transition: background-color 0.5s;
        animation: pulse-highlight 1.5s ease-in-out;
    }
    @keyframes pulse-highlight {
        0%, 100% { background-color: #fff59d; }
        50% { background-color: #ffe838; }
    }
    .search-results-header {
        position: sticky;
        top: 0;
        z-index: 2;
    }
    /* Адаптивность для мобильных устройств */
    @media (max-width: 768px) {
        .search-results {
            width: 100%;
            left: 0;
            right: 0;
            max-height: 300px;
        }
    }
`;
document.head.appendChild(searchStyles);

// Настраиваем обработчики событий
setupEventListeners();