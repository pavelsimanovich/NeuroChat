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
            const date = new Date(dateString);
            return date.toLocaleString('ru-RU', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        
        try {
            // Set the announcement content
            this.announcementContent.innerHTML = `
                <div class="d-flex align-items-center w-100">
                    ${hasMultiple ? `
                        <button type="button" class="btn btn-sm btn-outline-secondary me-2" id="prevAnnouncement" 
                                ${this.currentAnnouncementIndex === 0 ? 'disabled' : ''}>
                            <i class="bi bi-chevron-left"></i>
                        </button>
                    ` : ''}
                    
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center flex-wrap">
                            <strong class="me-2">${this.escapeHtml(announcement.title)}</strong>
                            ${announcement.startDate ? `
                                <span class="badge bg-light text-dark small fw-normal me-2" title="Действует с ${formatDate(announcement.startDate)}">
                                    <i class="bi bi-calendar3"></i> с ${formatDate(announcement.startDate)}
                                </span>
                        ` : ''}
                        ${announcement.endDate ? `
                            <span class="badge bg-light text-dark small fw-normal" title="Действует до ${formatDate(announcement.endDate)}">
                                <i class="bi bi-clock"></i> до ${formatDate(announcement.endDate)}
                            </span>
                        ` : ''}
                        ${hasMultiple ? `
                            <span class="badge bg-secondary ms-auto">
                                ${this.currentAnnouncementIndex + 1} / ${this.announcements.length}
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                <div class="mt-2">
                    ${isHtml ? announcement.content : this.escapeHtml(announcement.content).replace(/\n/g, '<br>')}
                </div>
            `;
            
            // Show the modal
            if (this.announcementModal) {
                // Hide any existing modal first to ensure clean state
                this.announcementModal.hide();
                
                // Use setTimeout to ensure the DOM is updated before showing
                setTimeout(() => {
                    try {
                        this.announcementModal.show();
                        console.log('Announcement modal shown');
                    } catch (e) {
                        console.error('Error showing announcement modal:', e);
                    }
                }, 100);
            }
            
            // Add event listeners for navigation
            const prevBtn = document.getElementById('prevAnnouncement');
            const nextBtn = document.getElementById('nextAnnouncement');
            
            if (prevBtn) {
                prevBtn.onclick = () => this.showPreviousAnnouncement();
            }
            if (nextBtn) {
                nextBtn.onclick = () => this.showNextAnnouncement();
            }
            
        } catch (error) {
            console.error('Error displaying announcement:', error);
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
