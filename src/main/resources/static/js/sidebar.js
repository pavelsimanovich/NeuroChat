document.addEventListener('DOMContentLoaded', function() {
    console.log('Sidebar manager loaded');

    // Получаем основные элементы
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const elements = {
        roomsList: document.getElementById('roomsList')
    };

    if (!sidebarToggleBtn || !mobileSidebar) {
        console.error('Sidebar elements not found');
        return;
    }

    // Создаем элемент оверлея для затемнения фона
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1029'; // Понижаем z-index, чтобы оверлей был ниже сайдбара
    overlay.style.display = 'none';
    document.body.appendChild(overlay);

    // Функция открытия сайдбара
    function openSidebar() {
        mobileSidebar.classList.add('show');
        // Небольшая задержка перед показом оверлея для плавности
        setTimeout(() => {
            overlay.style.display = 'block';
        }, 10);
    }

    // Функция закрытия сайдбара
    function closeSidebar() {
        mobileSidebar.classList.remove('show');
        overlay.style.display = 'none';

        // Сбрасываем стили ширины на мобильных устройствах
        if (window.innerWidth < 768) {
            mobileSidebar.style.width = '';
            // Безопасное обращение к элементам перед установкой свойств
            const chatArea = document.querySelector('.chat-area');
            if (chatArea) {
                chatArea.style.marginLeft = '';
                chatArea.style.width = '';
            }
        }
    }

    // Функция переключения сайдбара
    function toggleSidebar(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (mobileSidebar.classList.contains('show')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    // Обработчик для кнопки переключения
    sidebarToggleBtn.addEventListener('click', toggleSidebar);

    // Скрытие сайдбара при клике на оверлей
    overlay.addEventListener('click', function(e) {
        e.stopPropagation(); // Предотвращаем всплытие события
        closeSidebar();
    });

    // Закрывать сайдбар при клике за его пределами
    document.addEventListener('click', function(event) {
        if (window.innerWidth < 768 && 
            mobileSidebar.classList.contains('show') && 
            !mobileSidebar.contains(event.target) && 
            !sidebarToggleBtn.contains(event.target)) {
            closeSidebar();
        }
    });

    // Закрывать сайдбар при клике на элемент внутри него (например, выбор чата)
    function setupRoomItemsListeners() {
        const roomItems = mobileSidebar.querySelectorAll('.room-item');
        roomItems.forEach(item => {
            // Удаляем существующие обработчики, чтобы избежать дублирования
            const existingHandler = item._clickHandler;
            if (existingHandler) {
                item.removeEventListener('click', existingHandler);
            }

            // Создаем новый обработчик
            const clickHandler = function(event) {
                // Проверяем, не является ли клик на кнопке меню
                if (event.target.closest('.btn-menu') || event.target.closest('.room-context-menu-button')) {
                    return; // Не закрываем сайдбар, если кликнули на кнопку меню
                }

                if (window.innerWidth < 768) {
                    setTimeout(() => closeSidebar(), 150);
                }
            };

            // Сохраняем ссылку на обработчик, чтобы потом его можно было удалить
            item._clickHandler = clickHandler;
            item.addEventListener('click', clickHandler);
        });
        console.log(`Added click handlers to ${roomItems.length} room items`);
    }

    // Делегирование событий для списка комнат
    elements.roomsList?.addEventListener('click', function(event) {
        // Проверяем, был ли клик на элементе комнаты, но не на кнопке меню
        const roomItem = event.target.closest('.room-item');
        const isMenuButton = event.target.closest('.btn-menu') || event.target.closest('.room-context-menu-button');

        if (roomItem && !isMenuButton && window.innerWidth < 768) {
            setTimeout(() => closeSidebar(), 150);
        }
    });

    // Первоначальная настройка обработчиков для комнат
    setupRoomItemsListeners();

    // Обновление обработчиков при обновлении списка комнат
    document.addEventListener('roomsUpdated', function() {
        setupRoomItemsListeners();
    });

    // Закрывать сайдбар при изменении размера окна
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768 && mobileSidebar.classList.contains('show')) {
            closeSidebar();
        }
    });

    // Обработка кнопок создания нового чата
    const createRoomBtns = document.querySelectorAll('#createRoomBtn, #createRoomBtn1');
    createRoomBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (window.innerWidth < 768) {
                setTimeout(() => closeSidebar(), 300);
            }
        });
    });

    // Добавляем обработчики для модальных окон и диалогов
    document.addEventListener('click', function(e) {
        if (window.innerWidth < 768) {
            // Обработка клика на кнопки в модальных окнах и диалогах
            const confirmButton = e.target.closest('.swal2-confirm') || 
                                e.target.closest('.modal-confirm-btn') ||
                                e.target.closest('.btn-primary[data-dismiss="modal"]');

            const cancelButton = e.target.closest('.swal2-cancel') ||
                                e.target.closest('.modal-cancel-btn') ||
                                e.target.closest('.btn-secondary[data-dismiss="modal"]');

            if (confirmButton || cancelButton) {
                setTimeout(() => closeSidebar(), 300);
            }
        }
    });

    // Экспортируем функции для использования в других модулях
    window.sidebarManager = {
        open: openSidebar,
        close: closeSidebar,
        toggle: toggleSidebar,
        setupRoomItemsListeners: setupRoomItemsListeners,
        // Интеграция с менеджером изменения размера
        resetSize: function() {
            if (window.sidebarResizeManager) {
                window.sidebarResizeManager.resetToDefault();
            }
        }
    };

    // Настраиваем наблюдатель за изменениями в DOM для автоматического добавления обработчиков
    // к новым элементам комнат
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Проверяем, были ли добавлены новые элементы комнат
                const hasRoomItems = Array.from(mutation.addedNodes).some(node => {
                    if (node.nodeType === 1) { // Это элемент
                        return node.classList?.contains('room-item') || 
                               node.querySelectorAll?.('.room-item').length > 0;
                    }
                    return false;
                });

                if (hasRoomItems) {
                    setupRoomItemsListeners();
                }
            }
        });
    });

    // Наблюдаем за списком комнат
    if (elements.roomsList) {
        observer.observe(elements.roomsList, { childList: true, subtree: true });
    }
});
