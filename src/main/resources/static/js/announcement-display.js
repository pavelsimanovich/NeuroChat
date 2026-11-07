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
            this.copyBtn = document.getElementById('announcementCopyBtn');
            this.setupPublicationList(modalElement);
            this.initializeEventListeners();
            this.rotateInterval = null;
            this.isModalOpen = false;
            this.progressBarEl = document.getElementById('announcementReadingProgress');
            this.copyBtn = document.getElementById('announcementCopyBtn');
            this._bindedScrollHandler = null;
            this._touchStartX = null;
            this._touchStartY = null;
            this._clipboardTooltip = null;
            this.loadAnnouncements();
        } catch (error) {
            console.error('Error initializing AnnouncementDisplay:', error);
        }
    }

    initializeEventListeners() {
        // Close button in the announcement bar
        if (this.closeAnnouncementBtn) {
            this.closeAnnouncementBtn.addEventListener('click', () => {
                const current = this.announcements?.[this.currentAnnouncementIndex];
                if (current) this.dismissToday(current);
            });
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

        // Copy to clipboard button inside modal footer
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', async () => {
                const content = document.getElementById('announcementModalContent');
                if (!content) return;
                try {
                    const text = content.querySelector('.announcement-modal__richtext')?.innerText.trim();
                    if (!text) return;
                    await navigator.clipboard.writeText(text);
                    this.showCopyFeedback();
                } catch (error) {
                    console.error('Failed to copy announcement:', error);
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
            this.announcementContainer.addEventListener('focusin', () => this.pauseRotation());
            this.announcementContainer.addEventListener('focusout', () => this.resumeRotation());
        }
    }

    async loadAnnouncements() {
        try {
            const response = await fetch('/api/announcements');
            if (!response.ok) throw new Error(`Announcements: ${response.status}`);
            const all = await response.json();
            if (!Array.isArray(all)) throw new Error('Invalid announcements response');
            // Filter hidden announcements based on localStorage flags
            this.announcements = all;
            this.currentAnnouncementIndex = Math.max(0, all.findIndex(item => !this.isAnnouncementHidden(item) && !this.dismissedAnnouncementIds?.has(item.id)));
            this.renderUpdatesLauncher();
            
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
            const adBadge = announcement.isAd ? `<span class="badge bg-warning text-dark ms-2">${this.label('Реклама', 'Ad')}</span>` : '';
            const announcementBarContent = `
                <i class="bi bi-megaphone" aria-hidden="true"></i>
                <span class="ann-teaser-text">
                    <span class="ann-eyebrow">${this.label('Обновления NeuroChat', 'NeuroChat updates')}</span>
                    <strong>${this.escapeHtml(announcement.title || this.label('Новое объявление', 'New announcement'))}</strong>
                    <span class="ann-excerpt">${this.escapeHtml(this.plainText(announcement.content).slice(0, 120))}</span>
                </span>
                ${adBadge}
            `;
            
            // Update announcement bar
            if (this.announcementContent) {
                this.announcementContent.innerHTML = announcementBarContent;
                this.announcementContainer.classList.add('show');
                this.announcementContent.title = 'Открыть объявление';
                this.announcementContent.setAttribute('aria-label', 'Открыть объявление');
                this.announcementContent.classList.add('clickable');

                
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
            // Inject quick actions into the announcement bar
            this.announcementContainer.dataset.kind = announcement.isAd ? 'ad' : 'news';
            this.renderPublicationList();
            this.renderTeaserNavigation();
            if (this.isAnnouncementHidden(announcement) || this.dismissedAnnouncementIds?.has(announcement.id)) this.hideAnnouncement();
            
        } catch (error) {
            console.error('Error displaying announcement:', error);
        }
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleString(this.label('ru-RU', 'en-US'), {
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
        modalTitle.innerHTML = `${this.escapeHtml(announcement.title || 'Объявление')}` + (announcement.isAd ? ` <span class="badge bg-warning text-dark ms-2">${this.label('Реклама', 'Ad')}</span>` : '');
        
        // Format and set the date
        const startDate = this.formatDate(announcement.startDate);
        const endDate = announcement.endDate ? this.formatDate(announcement.endDate) : null;
        
        if (dateElement) {
            if (startDate && endDate) {
                dateElement.textContent = `${this.label('Действует с', 'Available from')} ${startDate} ${this.label('до', 'to')} ${endDate}`;
            } else if (startDate) {
                dateElement.textContent = `${this.label('Опубликовано:', 'Published:')} ${startDate}`;
            } else {
                dateElement.textContent = '';
            }
        }
        
        // Set the content
        const isHtml = announcement.content && 
                      (announcement.content.includes('<') || announcement.content.includes('&'));

        const imageBlock = announcement.imageUrl ? `
            <figure class="announcement-modal__media mb-0">
                <div class="announcement-modal__media-inner text-center">
                    <img src="${this.escapeHtml(this.safeUrl(announcement.imageUrl))}" alt="${this.escapeHtml(announcement.title || 'Изображение')}"
                         class="img-fluid announcement-image" style="max-height: 360px; object-fit: contain;">
                </div>
            </figure>` : '';

        const contentBlock = `
            <div class="announcement-modal__richtext">
                ${isHtml ? this.sanitizeContent(announcement.content) : this.escapeHtml(announcement.content || '').replace(/\n/g, '<br>')}
            </div>`;

        const ctaBlock = (announcement.isAd && this.safeUrl(announcement.adTargetUrl)) ? `
            <div class="announcement-modal__cta">
                <div class="announcement-modal__cta-label small text-muted">
                    ${this.label('Реклама · Переход по внешней ссылке', 'Ad · External link')}
                </div>
                <a href="${this.escapeHtml(this.safeUrl(announcement.adTargetUrl))}" target="_blank" rel="noopener noreferrer" class="btn btn-primary announcement-modal__cta-button">
                    ${this.label('Перейти', 'Visit website')} <i class="bi bi-box-arrow-up-right ms-1"></i>
                </a>
            </div>` : '';

        // Action buttons: dismiss today/forever and copy
        const actionsBlock = `
            <div class="announcement-modal__secondary-actions">
                <div class="announcement-modal__tips small text-muted d-none d-md-inline-flex align-items-center gap-1">
                    <i class="bi bi-keyboard"></i>
                    <span>${this.label('← → для навигации, Esc — закрыть', '← → to navigate, Esc to close')}</span>
                </div>
                <button type="button" class="btn btn-outline-warning btn-sm rounded-pill" id="annDismissTodayBtn" title="Скрыть до завтра">
                    <i class="bi bi-eye-slash"></i>
                    <span class="ms-1">${this.label('До завтра', 'Until tomorrow')}</span>
                </button>
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
        if (!announcement || this.isModalOpen) return;
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
            this.pauseRotation();
            
            // Add backdrop if it doesn't exist
            if (!document.querySelector('.modal-backdrop')) {
                this.announcementModal.handleUpdate();
            }
            
            // Add keyboard navigation
            const handleKeyDown = (e) => {
                if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
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
                const updateProgress = () => {
                    const content = document.getElementById('announcementModalContent');
                    if (!content) return;
                    const scrollTop = modalBody.scrollTop;
                    const scrollHeight = modalBody.scrollHeight - modalBody.clientHeight;
                    const pct = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 100;
                    if (this.progressBarEl) {
                        this.progressBarEl.style.setProperty('--progress', pct + '%');
                    }
                };
                this.resetReadingPosition();
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

                this.isModalOpen = false;
                this.resumeRotation();
                // Cleanup listeners
                const modalBody = modalElement.querySelector('.modal-body');
                if (modalBody && this._bindedScrollHandler) {
                    modalBody.removeEventListener('scroll', this._bindedScrollHandler);
                }
                this._bindedScrollHandler = null;
                modalElement.removeEventListener('touchstart', onTouchStart);
                modalElement.removeEventListener('touchend', onTouchEnd);
                if (this.progressBarEl) {
                    this.progressBarEl.style.setProperty('--progress', '0%');
                }
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
            this.displayCurrentAnnouncement();
            this.resetReadingPosition();
        }
    }
    
    showNextAnnouncement() {
        if (this.currentAnnouncementIndex < this.announcements.length - 1) {
            this.currentAnnouncementIndex++;
            const announcement = this.announcements[this.currentAnnouncementIndex];
            this.displayCurrentAnnouncement();
            this.resetReadingPosition();
        }
    }
    
    hideAnnouncement() {
        if (this.announcementContainer) {
            this.announcementContainer.classList.remove('show');
            this.announcementContainer.classList.add('d-none');
            this.stopAutoRotation();
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
            const until = new Date();
            until.setHours(24, 0, 0, 0);
            localStorage.setItem(`ann_hide_until_${a.id}`, String(until.getTime()));
        } catch (e) {
            console.error('Error setting announcement hide status:', e);
        }
        this.reloadAfterDismiss(a.id);
    }

    dismissForever(a) {
        try {
            localStorage.setItem(`ann_hide_forever_${a.id}`, '1');
        } catch (e) {
            console.error('Error setting announcement hide status:', e);
        }
        this.reloadAfterDismiss(a.id);
    }

    reloadAfterDismiss(id) {
        this.dismissedAnnouncementIds ??= new Set();
        this.dismissedAnnouncementIds.add(id);
        if (!this.isModalOpen) {
            const nextIndex = this.announcements.findIndex(item => !this.dismissedAnnouncementIds.has(item.id) && !this.isAnnouncementHidden(item));
            if (nextIndex >= 0) {
                this.currentAnnouncementIndex = nextIndex;
                this.displayCurrentAnnouncement();
            } else {
                this.hideAnnouncement();
            }
        } else {
            this.hideAnnouncement();
        }
    }

    renderUpdatesLauncher() {
        let button = document.getElementById('announcementUpdatesBtn');
        if (!button) {
            button = document.createElement('button');
            button.id = 'announcementUpdatesBtn';
            button.type = 'button';
            button.className = 'btn btn-sm btn-outline-secondary ms-2 ann-updates-launcher';
            button.setAttribute('aria-controls', 'announcementModal');
            const themeButton = document.getElementById('themeToggleBtn');
            const header = document.querySelector('.chat-header');
            if (themeButton) themeButton.before(button);
            else if (header) header.append(button);
            else this.announcementContainer.before(button);
            button.addEventListener('click', () => {
                const current = this.announcements?.[this.currentAnnouncementIndex];
                if (current) this.showModal(current);
            });
        }
        button.hidden = !this.announcements.length;
        button.textContent = `${this.label('Обновления', 'Updates')} · ${this.announcements.length}`;
    }

    startAutoRotation() {
        this.stopAutoRotation();
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
        if (this.announcementContainer.matches(':hover') || this.announcementContainer.contains(document.activeElement)) return;
        this.startAutoRotation();
    }
    label(ru, en) {
        return window.i18n?.getLanguage?.() === 'en' ? en : ru;
    }

    plainText(value) {
        const template = document.createElement('template');
        template.innerHTML = this.sanitizeContent(value || '');
        return (template.content.textContent || '').replace(/\s+/g, ' ').trim();
    }

    setupPublicationList(modalElement) {
        const body = modalElement.querySelector('.modal-body');
        const layout = document.createElement('div');
        layout.className = 'ann-reader-layout';
        const sidebar = document.createElement('aside');
        sidebar.className = 'ann-reader-sidebar';
        sidebar.innerHTML = `<div class="ann-section-label">${this.label('Все публикации', 'All updates')}</div><nav id="announcementPublicationList" aria-label="${this.label('Объявления', 'Announcements')}"></nav>`;
        body.parentNode.insertBefore(layout, body);
        layout.append(sidebar, body);
        sidebar.querySelector('nav').addEventListener('click', event => {
            const button = event.target.closest('[data-ann-index]');
            if (!button) return;
            this.currentAnnouncementIndex = Number(button.dataset.annIndex);
            this.displayCurrentAnnouncement();
            this.resetReadingPosition();
        });
        window.addEventListener('i18n:changed', () => {
            sidebar.querySelector('.ann-section-label').textContent = this.label('Все публикации', 'All updates');
            this.renderUpdatesLauncher();
            if (this.announcements?.length) this.displayCurrentAnnouncement();
        });
    }

    renderPublicationList() {
        const list = document.getElementById('announcementPublicationList');
        if (!list) return;
        const hadFocus = list.contains(document.activeElement);
        list.innerHTML = this.announcements.map((item, index) => `
            <button type="button" class="ann-publication ${index === this.currentAnnouncementIndex ? 'is-selected' : ''}" data-ann-index="${index}" aria-current="${index === this.currentAnnouncementIndex ? 'true' : 'false'}">
                <span class="ann-publication-meta">${this.label(item.isAd ? 'Партнёры' : 'Новости продукта', item.isAd ? 'Partners' : 'Product news')}</span>
                <strong>${this.escapeHtml(item.title || this.label('Объявление', 'Announcement'))}</strong>
                <span class="ann-publication-date">${this.escapeHtml(this.formatDate(item.startDate))}</span>
            </button>`).join('');
        if (hadFocus) list.querySelector(`[data-ann-index="${this.currentAnnouncementIndex}"]`)?.focus({preventScroll: true});
    }

    renderTeaserNavigation() {
        let navigation = document.getElementById('announcementTeaserNav');
        if (!navigation) {
            navigation = document.createElement('div');
            navigation.id = 'announcementTeaserNav';
            navigation.className = 'ann-teaser-nav';
            this.announcementContainer.querySelector('.announcement-actions').prepend(navigation);
        }
        const focusedIndex = Array.from(navigation.querySelectorAll('button')).indexOf(document.activeElement);
        navigation.innerHTML = `<span>${this.currentAnnouncementIndex + 1} / ${this.announcements.length}</span>
            <button type="button" aria-label="${this.label('Предыдущее объявление', 'Previous announcement')}" ${this.currentAnnouncementIndex === 0 ? 'disabled' : ''}><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
            <button type="button" aria-label="${this.label('Следующее объявление', 'Next announcement')}" ${this.currentAnnouncementIndex === this.announcements.length - 1 ? 'disabled' : ''}><i class="bi bi-chevron-right" aria-hidden="true"></i></button>`;
        const buttons = navigation.querySelectorAll('button');
        buttons[0].onclick = () => this.showPreviousAnnouncement();
        buttons[1].onclick = () => this.showNextAnnouncement();
        navigation.hidden = this.announcements.length < 2;
        if (focusedIndex >= 0 && !navigation.hidden) {
            const target = buttons[focusedIndex].disabled ? buttons[1 - focusedIndex] : buttons[focusedIndex];
            target.focus({preventScroll: true});
        }
    }

    safeUrl(value) {
        if (!value) return '';
        try {
            const url = new URL(value, window.location.origin);
            return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
        } catch {
            return '';
        }
    }

    sanitizeContent(value) {
        const template = document.createElement('template');
        template.innerHTML = value;
        const allowed = new Set('P BR STRONG B EM I U S UL OL LI H1 H2 H3 H4 H5 H6 BLOCKQUOTE PRE CODE A IMG HR DIV SPAN TABLE THEAD TBODY TR TH TD'.split(' '));
        for (const node of Array.from(template.content.querySelectorAll('*'))) {
            if (!allowed.has(node.tagName)) {
                node.remove();
                continue;
            }
            for (const attr of Array.from(node.attributes)) {
                if (!['href', 'src', 'alt', 'title'].includes(attr.name)) node.removeAttribute(attr.name);
            }
            for (const attr of ['href', 'src']) {
                if (!node.hasAttribute(attr)) continue;
                const safe = this.safeUrl(node.getAttribute(attr));
                if (safe) node.setAttribute(attr, safe);
                else node.removeAttribute(attr);
            }
            if (node.tagName === 'A') {
                node.setAttribute('target', '_blank');
                node.setAttribute('rel', 'noopener noreferrer');
            }
        }
        return template.innerHTML;
    }

    resetReadingPosition() {
        const body = document.querySelector('#announcementModal .modal-body');
        if (body) body.scrollTop = 0;
        if (this._bindedScrollHandler) this._bindedScrollHandler();
        else if (this.progressBarEl) this.progressBarEl.style.setProperty('--progress', '0%');
    }

    showCopyFeedback() {
        if (!this.copyBtn) return;
        const label = this.copyBtn.querySelector('.announcement-modal__copy-label');
        if (!label) return;

        const originalText = label.textContent;
        label.textContent = this.label('Скопировано!', 'Copied!');
        this.copyBtn.classList.add('btn-success', 'text-white');
        this.copyBtn.classList.remove('btn-outline-secondary');

        clearTimeout(this._clipboardTooltip);
        this._clipboardTooltip = setTimeout(() => {
            label.textContent = originalText;
            this.copyBtn.classList.remove('btn-success', 'text-white');
            this.copyBtn.classList.add('btn-outline-secondary');
        }, 2000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('announcementContainer')) {
        window.announcementDisplay = new AnnouncementDisplay();
    }
});
