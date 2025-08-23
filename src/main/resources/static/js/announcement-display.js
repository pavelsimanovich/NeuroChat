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
            this.rotateInterval = null;
            this.isModalOpen = false;
            this.progressBarEl = null;
            this._bindedScrollHandler = null;
            this._touchStartX = null;
            this._touchStartY = null;
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

        // Add click handler for announcement details button if it exists
        const announcementDetailsBtn = document.getElementById('announcementDetailsBtn');
        if (announcementDetailsBtn) {
            announcementDetailsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.announcements && this.announcements.length > 0) {
                    this.showModal(this.announcements[this.currentAnnouncementIndex]);
                }
            });
        }

        // Keyboard access on announcement content
        if (this.announcementContent) {
            this.announcementContent.classList.add('clickable');
            this.announcementContent.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (this.announcements && this.announcements.length > 0) {
                        this.showModal(this.announcements[this.currentAnnouncementIndex]);
                    }
                }
            });
        }

        // Pause/resume rotation on hover
        if (this.announcementContainer) {
            this.announcementContainer.addEventListener('mouseenter', () => this.pauseRotation());
            this.announcementContainer.addEventListener('mouseleave', () => this.resumeRotation());
        }
    }

    async loadAnnouncements() {
        try {
            const response = await fetch('/api/announcements');
            const all = await response.json();
            // Filter hidden announcements based on localStorage flags
            this.announcements = (all || []).filter(a => !this.isAnnouncementHidden(a));
            this.currentAnnouncementIndex = 0;
            
            if (this.announcements && this.announcements.length > 0) {
                this.displayCurrentAnnouncement();
                this.startAutoRotation();
            } else {
                this.hideAnnouncement();
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
        
        try {
            // Update announcement bar content
            const adBadge = announcement.isAd ? '<span class="badge bg-warning text-dark ms-2">Реклама</span>' : '';
            const announcementBarContent = `
                <i class="bi bi-megaphone me-2"></i>
                <span>${this.escapeHtml(announcement.title || 'Новое объявление')}</span>
                ${adBadge}
                ${hasMultiple ? 
                    `<span class="badge bg-primary ms-2">${this.currentAnnouncementIndex + 1}/${this.announcements.length}</span>` : ''
                }
            `;
            
            // Update announcement bar
            if (this.announcementContent) {
                this.announcementContent.innerHTML = announcementBarContent;
                this.announcementContainer.classList.add('show');
                this.announcementContent.title = 'Открыть объявление';
                this.announcementContent.setAttribute('aria-label', 'Открыть объявление');
                this.announcementContent.classList.add('clickable');
                this.announcementContent.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.showModal(announcement);
                    }
                });
                
                // Add click handler to the close button
                const closeBtn = this.announcementContent.querySelector('.close-announcement');
                if (closeBtn) {
                    closeBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.hideAnnouncement();
                    };
                }
                
                // Add click handler to the content
                this.announcementContent.onclick = (e) => {
                    if (!e.target.closest('.close-announcement')) {
                        this.showModal(announcement);
                    }
                };
            }
            
            // Update modal content
            this.updateModalContent(announcement, hasMultiple);
            
        } catch (error) {
            console.error('Error displaying announcement:', error);
        }
    }
    
    formatDate(dateString) {
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
    }
    
    updateModalContent(announcement, hasMultiple) {
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
        modalTitle.innerHTML = `${this.escapeHtml(announcement.title || 'Объявление')}` + (announcement.isAd ? ' <span class="badge bg-warning text-dark ms-2">Реклама</span>' : '');
        
        // Format and set the date
        const startDate = this.formatDate(announcement.startDate);
        const endDate = announcement.endDate ? this.formatDate(announcement.endDate) : null;
        
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

        const imageBlock = announcement.imageUrl ? `
            <div class="mb-3 text-center">
                <img src="${announcement.imageUrl}" alt="${this.escapeHtml(announcement.title || 'Изображение')}" 
                     class="img-fluid rounded announcement-image" style="max-height: 360px; object-fit: contain; cursor: zoom-in;">
            </div>` : '';

        const contentBlock = `
            <div class="announcement-content">
                ${isHtml ? announcement.content : this.escapeHtml(announcement.content || '').replace(/\n/g, '<br>')}
            </div>`;

        const ctaBlock = (announcement.isAd && announcement.adTargetUrl) ? `
            <div class="mt-3 d-flex flex-wrap gap-2 justify-content-between align-items-center">
                <div class="small text-muted">
                    Реклама · Переход по внешней ссылке
                </div>
                <div class="d-flex gap-2">
                    <a href="${announcement.adTargetUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                        Перейти <i class="bi bi-box-arrow-up-right ms-1"></i>
                    </a>
                </div>
            </div>` : '';

        // Action buttons: dismiss today/forever and copy
        const actionsBlock = `
            <div class="mt-4 d-flex flex-wrap gap-2 justify-content-between align-items-center">
                <div class="small text-muted d-none d-md-block">Подсказка: ← → для навигации, Esc — закрыть</div>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-outline-warning btn-sm" id="annDismissTodayBtn" title="Скрыть до завтра">
                        <i class="bi bi-eye-slash"></i> До завтра
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm" id="annDismissForeverBtn" title="Больше не показывать">
                        <i class="bi bi-x-octagon"></i> Не показывать
                    </button>
                </div>
            </div>`;

        modalContent.innerHTML = `${imageBlock}${contentBlock}${ctaBlock}${actionsBlock}`;

        // Bind image zoom
        const img = modalContent.querySelector('.announcement-image');
        if (img) {
            img.addEventListener('click', () => {
                const zoomed = img.classList.toggle('zoomed');
                img.style.cursor = zoomed ? 'zoom-out' : 'zoom-in';
            });
        }
        const dismissTodayBtn = document.getElementById('annDismissTodayBtn');
        if (dismissTodayBtn) {
            dismissTodayBtn.onclick = () => this.dismissToday(announcement);
        }
        const dismissForeverBtn = document.getElementById('annDismissForeverBtn');
        if (dismissForeverBtn) {
            dismissForeverBtn.onclick = () => this.dismissForever(announcement);
        }
        
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
        
        const modalElement = document.getElementById('announcementModal');
        if (!modalElement) {
            console.error('Announcement modal element not found');
            return;
        }
        
        try {
            // Ensure the modal is properly initialized
            if (!this.announcementModal) {
                this.announcementModal = new bootstrap.Modal(modalElement);
            }
            
            // Update modal content
            const hasMultiple = this.announcements && this.announcements.length > 1;
            this.updateModalContent(announcement, this.announcements.length > 1);
            
            // Hide loading state if it exists
            const loadingElement = modalElement.querySelector('.announcement-loading');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            // Show the modal
            this.announcementModal.show();
            this.isModalOpen = true;
            
            // Ensure modal is visible
            modalElement.style.display = 'block';
            modalElement.classList.add('show');
            document.body.classList.add('modal-open');
            
            // Add backdrop if it doesn't exist
            if (!document.querySelector('.modal-backdrop')) {
                const backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop fade show';
                document.body.appendChild(backdrop);
            }
            
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
            
            // Add reading progress bar and scroll listener
            const modalBody = modalElement.querySelector('.modal-body');
            if (modalBody) {
                if (!this.progressBarEl) {
                    this.progressBarEl = document.createElement('div');
                    this.progressBarEl.id = 'announcementReadingProgress';
                    modalBody.prepend(this.progressBarEl);
                }
                const updateProgress = () => {
                    const content = document.getElementById('announcementModalContent');
                    if (!content) return;
                    const scrollTop = modalBody.scrollTop;
                    const scrollHeight = content.scrollHeight - modalBody.clientHeight;
                    const pct = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 0;
                    this.progressBarEl.style.setProperty('--progress', pct + '%');
                };
                this._bindedScrollHandler = updateProgress;
                modalBody.addEventListener('scroll', updateProgress);
                // Initialize once opened
                setTimeout(updateProgress, 0);
            }

            // Add swipe navigation for touch devices
            const onTouchStart = (e) => {
                if (!e.touches || e.touches.length !== 1) return;
                this._touchStartX = e.touches[0].clientX;
                this._touchStartY = e.touches[0].clientY;
            };
            const onTouchEnd = (e) => {
                if (this._touchStartX === null || !e.changedTouches || e.changedTouches.length !== 1) return;
                const dx = e.changedTouches[0].clientX - this._touchStartX;
                const dy = e.changedTouches[0].clientY - this._touchStartY;
                // Horizontal swipe with minimal vertical movement
                if (Math.abs(dx) > 50 && Math.abs(dy) < 40) {
                    if (dx < 0) this.showNextAnnouncement(); else this.showPreviousAnnouncement();
                }
                this._touchStartX = this._touchStartY = null;
            };
            modalElement.addEventListener('touchstart', onTouchStart, { passive: true });
            modalElement.addEventListener('touchend', onTouchEnd, { passive: true });
            
            const onModalHidden = () => {
                document.removeEventListener('keydown', handleKeyDown);
                modalElement.removeEventListener('hidden.bs.modal', onModalHidden);
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
                this.isModalOpen = false;
                // Cleanup listeners
                const modalBody = modalElement.querySelector('.modal-body');
                if (modalBody && this._bindedScrollHandler) {
                    modalBody.removeEventListener('scroll', this._bindedScrollHandler);
                }
                this._bindedScrollHandler = null;
                modalElement.removeEventListener('touchstart', onTouchStart);
                modalElement.removeEventListener('touchend', onTouchEnd);
            };
            
            modalElement.addEventListener('hidden.bs.modal', onModalHidden, { once: true });
            
        } catch (error) {
            console.error('Error showing modal:', error);
        }
    }
    
    showPreviousAnnouncement() {
        if (this.currentAnnouncementIndex > 0) {
            this.currentAnnouncementIndex--;
            const announcement = this.announcements[this.currentAnnouncementIndex];
            this.updateModalContent(announcement, this.announcements.length > 1);
        }
    }
    
    showNextAnnouncement() {
        if (this.currentAnnouncementIndex < this.announcements.length - 1) {
            this.currentAnnouncementIndex++;
            const announcement = this.announcements[this.currentAnnouncementIndex];
            this.updateModalContent(announcement, this.announcements.length > 1);
        }
    }
    
    hideAnnouncement() {
        if (this.announcementContainer) {
            this.announcementContainer.classList.remove('show');
            document.body.style.paddingTop = '0';
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

    // === Moved helper methods into class ===
    isAnnouncementHidden(a) {
        if (!a) return false;
        try {
            const forever = localStorage.getItem(`ann_hide_forever_${a.id}`);
            if (forever === '1') return true;
            const untilStr = localStorage.getItem(`ann_hide_until_${a.id}`);
            if (untilStr) {
                const until = parseInt(untilStr, 10);
                if (!isNaN(until) && Date.now() < until) return true;
            }
        } catch (e) {
            console.error('Error checking announcement hide status:', e);
        }
        return false;
    }

    dismissToday(a) {
        try {
            const until = Date.now() + 24 * 60 * 60 * 1000;
            localStorage.setItem(`ann_hide_until_${a.id}`, String(until));
        } catch (e) {
            console.error('Error setting announcement hide status:', e);
        }
        this.reloadAfterDismiss();
    }

    dismissForever(a) {
        try {
            localStorage.setItem(`ann_hide_forever_${a.id}`, '1');
        } catch (e) {
            console.error('Error setting announcement hide status:', e);
        }
        this.reloadAfterDismiss();
    }

    reloadAfterDismiss() {
        this.announcements = this.announcements.filter(x => !this.isAnnouncementHidden(x));
        if (this.announcements.length === 0) {
            this.hideAnnouncement();
            this.stopAutoRotation();
            return;
        }
        if (this.currentAnnouncementIndex >= this.announcements.length) {
            this.currentAnnouncementIndex = this.announcements.length - 1;
        }
        this.displayCurrentAnnouncement();
    }

    injectActions(announcement) {
        try {
            const actions = document.querySelector('#announcementContainer .announcement-actions');
            if (!actions) return;

            // Remove previously injected buttons to avoid duplicates
            actions.querySelectorAll('.ann-action').forEach(el => el.remove());

            const createBtn = (cls, text, title) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `btn btn-sm ${cls} me-2 ann-action`;
                btn.textContent = text;
                if (title) btn.title = title;
                return btn;
            };

            const btnHideToday = createBtn('btn-outline-secondary', 'Не показывать сегодня', 'Скрыть это объявление на сутки');
            btnHideToday.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dismissToday(announcement);
            });
            actions.insertBefore(btnHideToday, actions.firstChild);

            const btnHideForever = createBtn('btn-outline-danger', 'Больше не показывать', 'Скрыть это объявление навсегда');
            btnHideForever.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dismissForever(announcement);
            });
            actions.insertBefore(btnHideForever, actions.firstChild);

            if (announcement && announcement.url) {
                const linkBtn = document.createElement('a');
                linkBtn.href = announcement.url;
                linkBtn.target = '_blank';
                linkBtn.rel = 'noopener noreferrer';
                linkBtn.className = 'btn btn-sm btn-outline-primary ann-action me-2';
                linkBtn.textContent = 'Открыть ссылку';
                actions.insertBefore(linkBtn, actions.firstChild);
            }
        } catch (e) {
            console.error('Error injecting actions:', e);
        }
    }

    startAutoRotation() {
        this.stopAutoRotation();
        if (!this.announcements || this.announcements.length <= 1) return;
        this.rotateInterval = setInterval(() => {
            if (!this.isModalOpen) {
                this.showNextAnnouncement();
            }
        }, 8000);
    }

    stopAutoRotation() {
        if (this.rotateInterval) {
            clearInterval(this.rotateInterval);
            this.rotateInterval = null;
        }
    }

    pauseRotation() {
        this.stopAutoRotation();
    }

    resumeRotation() {
        this.startAutoRotation();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('announcementContainer')) {
        window.announcementDisplay = new AnnouncementDisplay();
    }
});
