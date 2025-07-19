// Theme toggle functionality
const themeToggle = {
    init() {
        this.themeToggleBtn = document.getElementById('themeToggleBtn');
        this.themeIcon = this.themeToggleBtn?.querySelector('i');
        
        if (!this.themeToggleBtn || !this.themeIcon) return;
        
        // Load saved theme or use system preference
        this.currentTheme = localStorage.getItem('chat_theme') || 
                           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        // Apply the theme
        this.applyTheme(this.currentTheme);
        
        // Add event listeners
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        
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
        
        // Update icon
        if (this.themeIcon) {
            this.themeIcon.classList.toggle('bi-sun', isDark);
            this.themeIcon.classList.toggle('bi-moon-stars', !isDark);
        }
        
        // Update button title
        if (this.themeToggleBtn) {
            this.themeToggleBtn.setAttribute('title', 
                isDark ? 'Переключить на светлую тему' : 'Переключить на темную тему');
        }
    }
};

// Initialize theme toggle when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    themeToggle.init();
});
