/**
 * Модуль для управления изменением размера сайдбара.
 * Обеспечивает интерактивное изменение ширины боковой панели путем перетаскивания разделителя.
 * Поддерживает как mouse, так и touch события для работы на планшетах.
 */
document.addEventListener('DOMContentLoaded', function() {
    // Основные элементы
    const sidebar = document.getElementById('mobileSidebar');
    const resizer = document.getElementById('sidebarResizer');
    const chatArea = document.querySelector('.chat-area');
    const container = document.querySelector('.container-fluid .row');

    // Минимальная и максимальная ширина сайдбара в пикселях
    const MIN_SIDEBAR_WIDTH = 250;
    const MAX_SIDEBAR_WIDTH = 600;

    // Значение по умолчанию (25% от ширины контейнера)
    const DEFAULT_WIDTH_PERCENT = 25;

    // Ключ для сохранения ширины в localStorage
    const STORAGE_KEY = 'sidebarWidth';

    // Установка начальных значений
    function initializeResizable() {
        // Проверяем, есть ли сохраненное значение
        let savedWidth = localStorage.getItem(STORAGE_KEY);

        if (!sidebar || !resizer || !chatArea || !container) {
            console.error('Необходимые элементы не найдены для инициализации изменения размера сайдбара');
            return;
        }

        // Удаляем классы Bootstrap, которые могут конфликтовать с нашим позиционированием
        sidebar.classList.remove('col-md-3');
        chatArea.classList.remove('col-md-9');

        // Если есть сохраненное значение, применяем его
        if (savedWidth) {
            // Проверка на допустимое значение
            savedWidth = parseInt(savedWidth);
            if (isNaN(savedWidth) || savedWidth < MIN_SIDEBAR_WIDTH || savedWidth > MAX_SIDEBAR_WIDTH) {
                savedWidth = Math.floor(container.offsetWidth * DEFAULT_WIDTH_PERCENT / 100);
            }
        } else {
            // Используем значение по умолчанию
            savedWidth = Math.floor(container.offsetWidth * DEFAULT_WIDTH_PERCENT / 100);
        }

        // Применяем ширину
        applyWidths(savedWidth);

        // Показываем ресайзер только на устройствах с достаточной шириной экрана (включая планшеты)
        if (window.innerWidth >= 768) {
            resizer.classList.add('visible');
        } else {
            resizer.classList.remove('visible');
        }
    }

    // Функция для применения ширины к элементам
    function applyWidths(sidebarWidth) {
        if (!sidebar || !resizer || !chatArea || !container) return;

        // Устанавливаем ширину сайдбара
        sidebar.style.width = `${sidebarWidth}px`;

        // Позиционируем ресайзер
        resizer.style.left = `${sidebarWidth}px`;

        // Устанавливаем отступ для основной области
        chatArea.style.marginLeft = `${sidebarWidth}px`;
        chatArea.style.width = `calc(100% - ${sidebarWidth}px)`;

        // Сохраняем значение
        localStorage.setItem(STORAGE_KEY, sidebarWidth);
    }

    // Получение координат из события (поддерживает как mouse, так и touch)
    function getEventCoordinates(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        } else {
            return { x: e.clientX, y: e.clientY };
        }
    }

    // Обработчики для изменения размера
    function initializeResizeEvents() {
        if (!resizer) return;

        let isResizing = false;
        let startX;
        let startWidth;

        // Функция начала изменения размера
        function startResize(e) {
            // Для mouse событий проверяем, что это левая кнопка
            if (e.type === 'mousedown' && e.button !== 0) return;

            isResizing = true;
            const coords = getEventCoordinates(e);
            startX = coords.x;
            startWidth = parseInt(sidebar.offsetWidth);

            // Добавляем класс, который показывает, что идет изменение размера
            document.body.classList.add('sidebar-resizing');

            // Предотвращаем выделение текста при перетаскивании
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
            document.body.style.mozUserSelect = 'none';

            e.preventDefault();
            e.stopPropagation();
        }

        // Функция изменения размера
        function doResize(e) {
            if (!isResizing) return;

            const coords = getEventCoordinates(e);
            // Вычисляем новую ширину
            const newWidth = startWidth + (coords.x - startX);

            // Проверяем ограничения
            if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
                applyWidths(newWidth);
            }

            e.preventDefault();
        }

        // Функция окончания изменения размера
        function endResize(e) {
            if (isResizing) {
                isResizing = false;
                document.body.classList.remove('sidebar-resizing');

                // Восстанавливаем возможность выделения текста
                document.body.style.userSelect = '';
                document.body.style.webkitUserSelect = '';
                document.body.style.mozUserSelect = '';

                // Сохраняем финальную ширину
                localStorage.setItem(STORAGE_KEY, sidebar.offsetWidth);
            }
        }

        // Mouse события
        resizer.addEventListener('mousedown', startResize);
        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', endResize);

        // Touch события для планшетов и мобильных устройств
        resizer.addEventListener('touchstart', startResize, { passive: false });
        document.addEventListener('touchmove', doResize, { passive: false });
        document.addEventListener('touchend', endResize);
        document.addEventListener('touchcancel', endResize);

        // Двойной клик для сброса к значению по умолчанию
        resizer.addEventListener('dblclick', function() {
            const defaultWidth = Math.floor(container.offsetWidth * DEFAULT_WIDTH_PERCENT / 100);
            applyWidths(defaultWidth);
        });

        // Двойное касание для планшетов
        let lastTouchTime = 0;
        resizer.addEventListener('touchend', function(e) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTouchTime;
            if (tapLength < 500 && tapLength > 0) {
                const defaultWidth = Math.floor(container.offsetWidth * DEFAULT_WIDTH_PERCENT / 100);
                applyWidths(defaultWidth);
                e.preventDefault();
            }
            lastTouchTime = currentTime;
        });
    }

    // Обработчик изменения размера окна
    function handleWindowResize() {
        if (!sidebar || !resizer || !chatArea) return;

        if (window.innerWidth >= 768) {
            initializeResizable();
            resizer.classList.add('visible');
        } else {
            // На мобильных устройствах скрываем ресайзер и сбрасываем стили
            resizer.classList.remove('visible');
            sidebar.style.width = '';
            chatArea.style.marginLeft = '';
            chatArea.style.width = '';
        }
    }

    // Определение типа устройства
    function isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    }

    // Инициализация
    if (sidebar && resizer && chatArea && container) {
        // Начальная настройка
        initializeResizable();

        // Установка обработчиков событий
        initializeResizeEvents();

        // Обработка изменения размера окна
        window.addEventListener('resize', handleWindowResize);

        // Дополнительные стили для touch устройств
        if (isTouchDevice()) {
            resizer.style.touchAction = 'none';
            resizer.style.cursor = 'col-resize';
        }

        // Экспортируем функции для использования в других модулях
        window.sidebarResizeManager = {
            initialize: initializeResizable,
            applyWidths: applyWidths,
            resetToDefault: function() {
                const defaultWidth = Math.floor(container.offsetWidth * DEFAULT_WIDTH_PERCENT / 100);
                applyWidths(defaultWidth);
            },
            isTouchDevice: isTouchDevice
        };
    }
});