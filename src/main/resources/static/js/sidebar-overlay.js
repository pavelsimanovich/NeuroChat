document.addEventListener('DOMContentLoaded', function() {
    console.log('Overlay script loaded');

    // Создаем элемент оверлея для затемнения фона
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1030';
    overlay.style.display = 'none';
    document.body.appendChild(overlay);

    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const mobileSidebar = document.getElementById('mobileSidebar');

    console.log('Toggle button:', sidebarToggleBtn);
    console.log('Mobile sidebar:', mobileSidebar);

    if (sidebarToggleBtn && mobileSidebar) {

        // Обработчик для кнопки переключения
        sidebarToggleBtn.addEventListener('click', function(e) {
            console.log('Toggle button clicked');
            e.preventDefault();
            e.stopPropagation();
            mobileSidebar.classList.toggle('show');

            if (mobileSidebar.classList.contains('show')) {
                overlay.style.display = 'block';
            } else {
                overlay.style.display = 'none';
            }
        });

        // Скрытие сайдбара при клике на оверлей
        overlay.addEventListener('click', function() {
            mobileSidebar.classList.remove('show');
            overlay.style.display = 'none';
        });
    }
});
