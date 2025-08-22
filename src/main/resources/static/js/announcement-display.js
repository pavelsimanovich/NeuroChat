class AnnouncementDisplay {
    constructor() {
        try {
            // Check if Bootstrap is available
            if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
                console.error('Bootstrap Modal is not loaded');
                return;
            }

            // Initialize modal element
            const modalElement = document.getElementById('announcementModal');
            if (!modalElement) {
                console.error('Announcement modal element not found');
                return;
            }

            // Initialize properties
            this.announcementContainer = document.getElementById('announcementContainer');
            this.announcementContent = document.getElementById('announcementContent');
            this.closeAnnouncementBtn = document.getElementById('closeAnnouncement');
            
            // Initialize Bootstrap modal
            this.announcementModal = new bootstrap.Modal(modalElement);
            
            // Initialize event listeners and load announcements
            this.initializeEventListeners();
            this.loadAnnouncements();
        } catch (error) {
            console.error('Error initializing AnnouncementDisplay:', error);
        }
    }

    initializeEventListeners() {
        // Close button in the announcement bar
        if (this.closeAnnouncementBtn) {
            this.closeAnnouncementBtn.addEventListener('click', () => this.hideAnnouncement());
        }
    }

    async loadAnnouncements() {
        try {
            const response = await fetch('/api/announcements');
            this.announcements = await response.json();
            this.currentAnnouncementIndex = 0;
            
            if (this.announcements && this.announcements.length > 0) {
                this.displayCurrentAnnouncement();
            }
        } catch (error) {
            console.error('Error loading announcements:', error);
        }
    }
    
    displayCurrentAnnouncement() {
        if (!this.announcements || this.announcements.length === 0) {
            this.hideAnnouncement();
            return;
        }
        
        const announcement = this.announcements[this.currentAnnouncementIndex];
        this.displayAnnouncement(announcement);
    }

    displayAnnouncement(announcement) {
        console.log('Displaying announcement:', announcement);
        
        if (!this.announcementContainer || !this.announcementModal) {
            console.error('Announcement container or modal not found');
            return;
        }
        
        // Show the announcement container
        this.announcementContainer.classList.remove('d-none');
        
        const hasMultiple = this.announcements.length > 1;
        const isHtml = announcement.content && 
                      (announcement.content.includes('<') || announcement.content.includes('&'));
        
        // Format dates
        const formatDate = (dateString) => {
            if (!dateString) return '';
            try {
                const date = new Date(dateString);
                return date.toLocaleString('ru-RU', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                console.error('Error formatting date:', e);
                return dateString;
            }
        };
        
        try {
            // Update announcement bar content
            const announcementBarContent = `
                <i class="bi bi-megaphone me-2"></i>
                <span>${this.escapeHtml(announcement.title || 'Новое объявление')}</span>
                ${hasMultiple ? 
                    `<span class="badge bg-primary ms-2">${this.currentAnnouncementIndex + 1}/${this.announcements.length}</span>` : ''
                }
            `;
            
            // Update announcement bar
            if (this.announcementContent) {
                this.announcementContent.innerHTML = announcementBarContent;
                
                // Make the bar clickable to show full announcement
                this.announcementContainer.style.cursor = 'pointer';
                this.announcementContainer.onclick = () => this.showModal(announcement);
            }
            
            // Update modal content
            this.updateModalContent(announcement, hasMultiple, formatDate);
            
        } catch (error) {
            console.error('Error displaying announcement:', error);
        }
    }
    
    updateModalContent(announcement, hasMultiple, formatDate) {
        const modalTitle = document.getElementById('announcementTitle');
        const modalContent = document.getElementById('announcementModalContent');
        const counter = document.getElementById('announcementCounter');
        const prevBtn = document.getElementById('prevAnnouncement');
        const nextBtn = document.getElementById('nextAnnouncement');
        const dateElement = document.getElementById('announcementDate');
        
        if (!modalTitle || !modalContent) {
            console.error('Modal elements not found');
            return;
        }
        
        // Update modal title and content
        modalTitle.textContent = announcement.title || 'Объявление';
        
        // Format and set the date
        const startDate = formatDate(announcement.startDate);
        const endDate = announcement.endDate ? formatDate(announcement.endDate) : null;
        
        if (dateElement) {
            if (startDate && endDate) {
                dateElement.textContent = `Действует с ${startDate} до ${endDate}`;
            } else if (startDate) {
                dateElement.textContent = `Опубликовано: ${startDate}`;
            } else {
                dateElement.textContent = '';
            }
        }
        
        // Set the content
        const isHtml = announcement.content && 
                      (announcement.content.includes('<') || announcement.content.includes('&'));
        
        modalContent.innerHTML = `
            <div class="announcement-content">
                ${isHtml ? announcement.content : this.escapeHtml(announcement.content || '').replace(/\n/g, '<br>')}
            </div>
        `;
        
        // Update counter
        if (counter) {
            counter.textContent = `${this.currentAnnouncementIndex + 1}/${this.announcements.length}`;
        }
        
        // Update navigation buttons
        if (prevBtn) {
            prevBtn.disabled = this.currentAnnouncementIndex === 0;
            prevBtn.onclick = (e) => {
                e.stopPropagation();
                this.showPreviousAnnouncement();
            };
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentAnnouncementIndex === this.announcements.length - 1;
            nextBtn.onclick = (e) => {
                e.stopPropagation();
                this.showNextAnnouncement();
            };
        }
    }
    
    showModal(announcement) {
        console.log('Showing modal for announcement:', announcement);
        
        if (!this.announcementModal) {
            console.error('Announcement modal not found');
            return;
        }
        
        try {
            // Hide loading state if it exists
            const loadingElement = document.querySelector('#announcementModal .announcement-loading');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            // Show the modal
            this.announcementModal.show();
            
            // Add keyboard navigation
            const handleKeyDown = (e) => {
                if (e.key === 'ArrowLeft') {
                    this.showPreviousAnnouncement();
                } else if (e.key === 'ArrowRight') {
                    this.showNextAnnouncement();
                } else if (e.key === 'Escape') {
                    this.announcementModal.hide();
                }
            };
            
            document.addEventListener('keydown', handleKeyDown);
            
            // Clean up event listener when modal is hidden
            const modalElement = document.getElementById('announcementModal');
            if (modalElement) {
                const onModalHidden = () => {
                    document.removeEventListener('keydown', handleKeyDown);
                    modalElement.removeEventListener('hidden.bs.modal', onModalHidden);
                };
                
                modalElement.addEventListener('hidden.bs.modal', onModalHidden, { once: true });
            }
            
        } catch (error) {
            console.error('Error showing modal:', error);
        }
    }
    
    showPreviousAnnouncement() {
        if (this.currentAnnouncementIndex > 0) {
            this.currentAnnouncementIndex--;
            this.displayCurrentAnnouncement();
        }
    }
    
    showNextAnnouncement() {
        if (this.currentAnnouncementIndex < this.announcements.length - 1) {
            this.currentAnnouncementIndex++;
            this.displayCurrentAnnouncement();
        }
    }
    
    hideAnnouncement() {
        if (this.announcementContainer) {
            this.announcementContainer.style.display = 'none';
        }
    }
    
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('announcementContainer')) {
        window.announcementDisplay = new AnnouncementDisplay();
    }
});
