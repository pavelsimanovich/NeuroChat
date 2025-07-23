// Theme toggle functionality
const themeToggle = {
    init() {
        // Find all theme toggle buttons
        this.themeToggleBtns = [
            document.getElementById('themeToggleBtn'),
            document.getElementById('themeToggleBtnModal')
        ].filter(Boolean); // Remove null/undefined
        
        if (this.themeToggleBtns.length === 0) return;
        
        // Load saved theme or use system preference
        this.currentTheme = localStorage.getItem('chat_theme') || 
                           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        // Apply the theme
        this.applyTheme(this.currentTheme);
        
        // Add event listeners to all theme toggle buttons
        this.themeToggleBtns.forEach(btn => {
            // Remove any existing listeners to prevent duplicates
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Add click event
            newBtn.addEventListener('click', () => this.toggleTheme());
            
            // Update references if this is the active button
            if (document.activeElement === btn) {
                this.themeToggleBtn = newBtn;
                this.themeIcon = newBtn.querySelector('i');
                this.themeText = newBtn.querySelector('span');
            }
        });
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('chat_theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    },
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        localStorage.setItem('chat_theme', this.currentTheme);
    },
    
    applyTheme(theme) {
        const isDark = theme === 'dark';
        document.documentElement.setAttribute('data-bs-theme', theme);
        
        // Update all theme toggle buttons
        document.querySelectorAll('#themeToggleBtn, #themeToggleBtnModal').forEach(btn => {
            const icon = btn.querySelector('i');
            const text = btn.querySelector('span');
            
            if (icon) {
                icon.classList.toggle('bi-sun', isDark);
                icon.classList.toggle('bi-moon-stars', !isDark);
            }
            
            const newTitle = isDark ? 'Переключить на светлую тему' : 'Переключить на темную тему';
            btn.setAttribute('title', newTitle);
            
            if (text) {
                text.textContent = isDark ? 'Светлая тема' : 'Темная тема';
            }
        });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    themeToggle.init();
    
    // Re-initialize when settings modal is shown to ensure theme toggle works
    const userSettingsModal = document.getElementById('userSettingsModal');
    if (userSettingsModal) {
        userSettingsModal.addEventListener('shown.bs.modal', () => {
            // Small delay to ensure modal is fully rendered
            setTimeout(() => themeToggle.init(), 50);
        });
    }
});
