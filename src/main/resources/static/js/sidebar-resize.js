/**
 * Модуль для управления изменением размера сайдбара.
 * Обеспечивает интерактивное изменение ширины боковой панели путем перетаскивания разделителя.
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

        // Показываем ресайзер только на десктопах
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

    // Обработчики для изменения размера
    function initializeResizeEvents() {
        if (!resizer) return;

        let isResizing = false;
        let startX;
        let startWidth;

        // Начало перетаскивания
        resizer.addEventListener('mousedown', function(e) {
            // Только основная кнопка мыши (левая)
            if (e.button !== 0) return;

            isResizing = true;
            startX = e.clientX;
            startWidth = parseInt(sidebar.offsetWidth);

            // Добавляем класс, который показывает, что идет изменение размера
            document.body.classList.add('sidebar-resizing');

            // Предотвращаем выделение текста при перетаскивании
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
            document.body.style.mozUserSelect = 'none';

            e.preventDefault();
            e.stopPropagation();
        });

        // Перемещение мыши
        document.addEventListener('mousemove', function(e) {
            if (!isResizing) return;

            // Вычисляем новую ширину
            const newWidth = startWidth + (e.clientX - startX);

            // Проверяем ограничения
            if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
                applyWidths(newWidth);
            }
        });

        // Окончание перетаскивания
        document.addEventListener('mouseup', function() {
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
        });

        // Двойной клик для сброса к значению по умолчанию
        resizer.addEventListener('dblclick', function() {
            const defaultWidth = Math.floor(container.offsetWidth * DEFAULT_WIDTH_PERCENT / 100);
            applyWidths(defaultWidth);
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

    // Инициализация
    if (sidebar && resizer && chatArea && container) {
        // Начальная настройка
        initializeResizable();

        // Установка обработчиков событий
        initializeResizeEvents();

        // Обработка изменения размера окна
        window.addEventListener('resize', handleWindowResize);

        // Экспортируем функции для использования в других модулях
        window.sidebarResizeManager = {
            initialize: initializeResizable,
            applyWidths: applyWidths,
            resetToDefault: function() {
                const defaultWidth = Math.floor(container.offsetWidth * DEFAULT_WIDTH_PERCENT / 100);
                applyWidths(defaultWidth);
            }
        };
    }
});
