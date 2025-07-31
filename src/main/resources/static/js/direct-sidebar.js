// Простой скрипт для управления сайдбаром
document.addEventListener('DOMContentLoaded', function() {
    console.log('Direct sidebar script loaded');

    // Получаем элементы
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('mobileSidebar');

    // Добавляем обработчик для кнопки
    if (toggleBtn && sidebar) {
        console.log('Found sidebar elements');

        toggleBtn.onclick = function(e) {
            console.log('Toggle button clicked');
            e.preventDefault();

            // Переключаем класс для сайдбара
            if (sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
                console.log('Sidebar hidden');
            } else {
                sidebar.classList.add('show');
                console.log('Sidebar shown');
            }
        };

        // Закрываем сайдбар при клике вне его
        document.addEventListener('click', function(e) {
            if (sidebar.classList.contains('show') && 
                !sidebar.contains(e.target) && 
                e.target !== toggleBtn && 
                !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('show');
                console.log('Sidebar hidden by outside click');
            }
        });
    } else {
        console.error('Sidebar elements not found');
    }
});
