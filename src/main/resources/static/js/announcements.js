class AnnouncementManager {
    constructor() {
        this.announcementModal = new bootstrap.Modal(document.getElementById('announcementModal'));
        this.form = document.getElementById('announcementForm');
        this.announcementId = null;
        this.initForm();
        this.initializeEventListeners();
        this.loadAnnouncements();
        window.addEventListener('i18n:changed', () => this.loadAnnouncements());
    }

    initForm() {
        this.titleInput = document.getElementById('announcementTitle');
        this.contentInput = document.getElementById('announcementContent');
        this.activeCheckbox = document.getElementById('announcementActive');
        this.startDateInput = document.getElementById('announcementStartDate');
        this.endDateInput = document.getElementById('announcementEndDate');
        this.enableEndDateCheckbox = document.getElementById('enableEndDate');
        this.endDateGroup = document.getElementById('endDateGroup');
        this.imageInput = document.getElementById('announcementImage');
        this.imagePreviewContainer = document.getElementById('imagePreviewContainer');
        this.imagePreview = document.getElementById('imagePreview');
        this.isAdCheckbox = document.getElementById('announcementIsAd');
        this.adTargetUrlInput = document.getElementById('announcementAdTargetUrl');
        this.currentImageUrl = null;

        // Set default start date to now
        const now = new Date();
        // Round to nearest 5 minutes
        const roundedMinutes = Math.ceil(now.getMinutes() / 5) * 5;
        now.setMinutes(roundedMinutes, 0, 0);

        this.startDateInput.value = this.formatDateTimeForInput(now);

        // Set up end date toggle
        this.enableEndDateCheckbox.addEventListener('change', () => {
            this.endDateInput.disabled = !this.enableEndDateCheckbox.checked;
            this.endDateGroup.style.display = this.enableEndDateCheckbox.checked ? 'block' : 'none';

            if (this.enableEndDateCheckbox.checked && !this.endDateInput.value) {
                const oneWeekLater = new Date(now);
                oneWeekLater.setDate(now.getDate() + 7);
                this.endDateInput.value = this.formatDateTimeForInput(oneWeekLater);
            }
        });

        // Initialize end date state
        this.endDateInput.disabled = !this.enableEndDateCheckbox.checked;
        this.endDateGroup.style.display = this.enableEndDateCheckbox.checked ? 'block' : 'none';

        // Image preview
        if (this.imageInput) {
            this.imageInput.addEventListener('change', () => {
                const file = this.imageInput.files && this.imageInput.files[0];
                if (file) {
                    const url = URL.createObjectURL(file);
                    this.imagePreview.src = url;
                    this.imagePreviewContainer.style.display = 'block';
                }
            });
        }

        // Set up form validation
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Add input validation
        this.titleInput.addEventListener('input', () => {
            this.titleInput.classList.remove('is-invalid');
        });

        this.contentInput.addEventListener('input', () => {
            this.contentInput.classList.remove('is-invalid');
        });
    }

    formatDateTimeForInput(date) {
        // Format date as YYYY-MM-DDTHH:MM for datetime-local input
        const pad = num => num.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    initializeEventListeners() {
        // Save announcement
        this.form.addEventListener('submit', (e) => this.saveAnnouncement(e));

        // New announcement button
        document.getElementById('newAnnouncementBtn').addEventListener('click', () => this.newAnnouncement());

        // Delete button (delegated)
        document.getElementById('announcementsTable').addEventListener('click', (e) => {
            if (e.target.closest('.delete-announcement')) {
                e.preventDefault();
                const id = e.target.closest('.delete-announcement').dataset.id;
                this.deleteAnnouncement(id);
            }
        });

        // Edit button (delegated)
        document.getElementById('announcementsTable').addEventListener('click', (e) => {
            if (e.target.closest('.edit-announcement')) {
                e.preventDefault();
                const id = e.target.closest('.edit-announcement').dataset.id;
                this.editAnnouncement(id);
            }
        });
    }

    async loadAnnouncements() {
        try {
            fetch('/api/announcements')
                .then(response => response.json())
                .then(announcements => {
                    // Sort by start date (newest first)
                    announcements.sort((a, b) => {
                        return new Date(b.startDate) - new Date(a.startDate);
                    });
                    this.renderAnnouncements(announcements);
                })
                .catch(error => {
                    console.error('Error loading announcements:', error);
                    this.showAlert('Ошибка при загрузке уведомлений', 'danger');
                });
        } catch (error) {
            console.error('Error loading announcements:', error);
            this.showAlert('Ошибка при загрузке уведомлений', 'danger');
        }
    }

    renderAnnouncements(announcements) {
        const tbody = document.querySelector('#announcementsTable tbody');
        tbody.innerHTML = '';

        if (announcements.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="6" class="text-center py-4 text-muted">
                    Нет объявлений
                </td>
            `;
            tbody.appendChild(tr);
            return;
        }

        announcements.forEach(announcement => {
            const statusText = (window.i18n && i18n.t)
                ? (announcement.active ? i18n.t('admin.ann.status.active', 'Active') : i18n.t('admin.ann.status.inactive', 'Inactive'))
                : (announcement.active ? 'Active' : 'Inactive');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    ${announcement.isAd ? `<span class="badge bg-warning text-dark me-1">${(window.i18n&&i18n.t)?i18n.t('admin.ann.modal.field.isAd','Ad'):'Ad'}</span>` : ''}
                    ${announcement.imageUrl ? `<i class="bi bi-image me-1" title="${(window.i18n&&i18n.t)?i18n.t('admin.ann.modal.field.image','Image'):'Image'}"></i>` : ''}
                    ${this.escapeHtml(announcement.title)}
                </td>
                <td>${this.formatDate(announcement.startDate)}</td>
                <td>${announcement.endDate ? this.formatDate(announcement.endDate) : '—'}</td>
                <td>
                    <span class="badge ${announcement.active ? 'bg-success' : 'bg-secondary'}">${statusText}</span>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary edit-announcement" data-id="${announcement.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-announcement ms-1" data-id="${announcement.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    newAnnouncement() {
        this.resetForm();
        document.getElementById('announcementModalLabel').textContent = 'Новое объявление';
        this.announcementModal.show();
    }

    async editAnnouncement(id) {
        try {
            const response = await fetch(`/api/announcements/${id}`);
            if (!response.ok) throw new Error('Ошибка при загрузке объявления');

            const announcement = await response.json();
            this.announcementId = announcement.id;

            // Set form values
            this.titleInput.value = announcement.title || '';
            this.contentInput.value = announcement.content || '';
            this.activeCheckbox.checked = announcement.active !== false; // Default to true if undefined
            this.isAdCheckbox.checked = announcement.isAd === true;
            this.adTargetUrlInput.value = announcement.adTargetUrl || '';
            this.currentImageUrl = announcement.imageUrl || null;
        this.isAdCheckbox.checked = announcement.isAd === true;
        this.adTargetUrlInput.value = announcement.adTargetUrl || '';
        this.currentImageUrl = announcement.imageUrl || null;

        if (this.currentImageUrl) {
            this.imagePreview.src = this.currentImageUrl;
            this.imagePreviewContainer.style.display = 'block';
        } else {
            this.imagePreviewContainer.style.display = 'none';
        }

            // Set start date
            if (announcement.startDate) {
                const startDate = new Date(announcement.startDate);
                this.startDateInput.value = this.formatDateTimeForInput(startDate);
            }

            // Set end date
            if (announcement.endDate) {
                const endDate = new Date(announcement.endDate);
                this.endDateInput.value = this.formatDateTimeForInput(endDate);
                this.enableEndDateCheckbox.checked = true;
                this.endDateGroup.style.display = 'block';
                this.endDateInput.disabled = false;
            } else {
                this.enableEndDateCheckbox.checked = false;
                this.endDateGroup.style.display = 'none';
                this.endDateInput.disabled = true;
            }

            // Update modal title
            document.getElementById('announcementModalLabel').textContent = 'Редактировать объявление';
            this.announcementModal.show();

        } catch (error) {
            console.error('Error loading announcement:', error);
            this.showAlert(error.message || 'Ошибка при загрузке объявления', 'danger');
        }
    }

    async saveAnnouncement(e) {
        e.preventDefault();

        // Validate form
        if (!this.titleInput.value.trim()) {
            this.titleInput.classList.add('is-invalid');
            return;
        }

        if (!this.contentInput.value.trim()) {
            this.contentInput.classList.add('is-invalid');
            return;
        }

        try {
            // Upload image via FileController if a new file is selected
            let imageUrl = this.currentImageUrl;
            const file = this.imageInput && this.imageInput.files && this.imageInput.files[0];
            if (file) {
                const fd = new FormData();
                fd.append('file', file);
                const uploadResp = await fetch('/api/files/upload', {
                    method: 'POST',
                    body: fd
                });
                if (!uploadResp.ok) throw new Error('Ошибка загрузки изображения');
                const uploadData = await uploadResp.json();
                if (!uploadData || !uploadData.id) throw new Error('Некорректный ответ загрузки');
                imageUrl = `/api/files/${uploadData.id}/preview`;
            }

            const formData = {
                title: this.titleInput.value.trim(),
                content: this.contentInput.value.trim(),
                active: this.activeCheckbox.checked,
                startDate: this.startDateInput.value ? new Date(this.startDateInput.value).toISOString() : null,
                endDate: this.enableEndDateCheckbox.checked && this.endDateInput.value
                    ? new Date(this.endDateInput.value).toISOString()
                    : null,
                imageUrl: imageUrl || null,
                isAd: this.isAdCheckbox.checked,
                adTargetUrl: this.adTargetUrlInput.value.trim() || null
            };

            const url = this.announcementId
                ? `/api/announcements/${this.announcementId}`
                : '/api/announcements';

            const method = this.announcementId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Ошибка при сохранении');
            }

            this.announcementModal.hide();
            this.showAlert('Объявление успешно сохранено', 'success');
            this.loadAnnouncements();
            this.resetForm();
        } catch (error) {
            console.error('Error saving announcement:', error);
            this.showAlert(error.message || 'Ошибка при сохранении объявления', 'danger');
        }
    }

    resetForm() {
        this.form.reset();
        this.announcementId = null;
        this.enableEndDateCheckbox.checked = false;
        this.endDateGroup.style.display = 'none';
        this.endDateInput.disabled = true;
        this.titleInput.classList.remove('is-invalid');
        this.contentInput.classList.remove('is-invalid');
        this.imageInput.value = '';
        this.imagePreview.src = '';
        this.imagePreviewContainer.style.display = 'none';
        this.currentImageUrl = null;

        // Reset to default start date (now)
        const now = new Date();
        const roundedMinutes = Math.ceil(now.getMinutes() / 5) * 5;
        now.setMinutes(roundedMinutes, 0, 0);
        this.startDateInput.value = this.formatDateTimeForInput(now);
    }

    async deleteAnnouncement(id) {
        if (!confirm('Вы уверены, что хотите удалить это объявление?')) return;

        try {
            const response = await fetch(`/api/announcements/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Ошибка при удалении');

            this.showAlert('Объявление успешно удалено', 'success');
            this.loadAnnouncements();

        } catch (error) {
            console.error('Error deleting announcement:', error);
            this.showAlert('Ошибка при удалении объявления', 'danger');
        }
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        alertDiv.role = 'alert';
        alertDiv.style.zIndex = '1060';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        document.body.appendChild(alertDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }, 5000);
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const lang = (window.i18n && typeof i18n.getLanguage === 'function') ? i18n.getLanguage() : 'ru';
        const locale = lang === 'en' ? 'en-US' : 'ru-RU';
        return date.toLocaleString(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(unsafe) {
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
    if (document.getElementById('announcementsTable')) {
        window.announcementManager = new AnnouncementManager();
    }
});
