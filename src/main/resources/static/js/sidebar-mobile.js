document.addEventListener('DOMContentLoaded', function() {
    console.log('Sidebar mobile script loaded');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const mobileSidebar = document.getElementById('mobileSidebar');

    console.log('Sidebar toggle button:', sidebarToggleBtn);
    console.log('Mobile sidebar element:', mobileSidebar);

    if (sidebarToggleBtn && mobileSidebar) {
        sidebarToggleBtn.addEventListener('click', function() {
            mobileSidebar.classList.toggle('show');
        });

        // Закрывать сайдбар при клике за его пределами
        document.addEventListener('click', function(event) {
            if (window.innerWidth < 768 && 
                !mobileSidebar.contains(event.target) && 
                !sidebarToggleBtn.contains(event.target) &&
                mobileSidebar.classList.contains('show')) {
                mobileSidebar.classList.remove('show');
            }
        });

        // Закрывать сайдбар при клике на элемент внутри него (например, выбор чата)
        const roomItems = mobileSidebar.querySelectorAll('.room-item');
        roomItems.forEach(item => {
            item.addEventListener('click', function() {
                if (window.innerWidth < 768) {
                    setTimeout(() => {
                        mobileSidebar.classList.remove('show');
                    }, 150);
                }
            });
        });

        // Закрывать сайдбар при изменении размера окна
        window.addEventListener('resize', function() {
            if (window.innerWidth >= 768 && mobileSidebar.classList.contains('show')) {
                mobileSidebar.classList.remove('show');
            }
        });
    }
});
