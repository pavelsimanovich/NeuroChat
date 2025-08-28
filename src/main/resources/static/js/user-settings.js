document.addEventListener('DOMContentLoaded', function () {
    const userSettingsBtn = document.getElementById('userSettingsBtn');
    const userSettingsModal = new bootstrap.Modal(document.getElementById('userSettingsModal'));
    const saveUserSettingsBtn = document.getElementById('saveUserSettings');
    const systemPromptTextarea = document.getElementById('systemPrompt');
    const modelSelectElement = document.getElementById('modelSelect');
    const languageSelectElement = document.getElementById('languageSelect');
    // TTS controls
    const ttsAutoplayEl = document.getElementById('ttsAutoplay');
    const ttsRateEl = document.getElementById('ttsRate');
    const ttsPitchEl = document.getElementById('ttsPitch');

    // Profile tab elements
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarFileIdHidden = document.getElementById('avatarFileId');
    const changePasswordBtn = document.getElementById('changePasswordBtn');

    function setAvatarPreview(fileId) {
        if (fileId) {
            avatarPreview.src = `/api/files/${fileId}/preview`;
        } else {
            avatarPreview.src = 'https://via.placeholder.com/160?text=Avatar';
        }
    }

    // Load language preference early on page load and apply UI language
    try {
        fetch('/api/user/preferences')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data && typeof data.language === 'string' && data.language) {
                    if (window.i18n) window.i18n.setLanguage(data.language);
                    if (languageSelectElement) languageSelectElement.value = data.language;
                }
            })
            .catch(() => {});
    } catch (_) {}


    // Show the modal
    if (userSettingsBtn) {
        userSettingsBtn.addEventListener('click', () => {
            // Fetch current settings and populate the modal before showing
            fetch('/api/user/preferences')
                .then(response => response.json())
                .then(data => {
                    if (data && typeof data.systemPrompt === 'string') {
                        systemPromptTextarea.value = data.systemPrompt;
                    }
                    if (data && typeof data.preferredModel === 'string' && data.preferredModel) {
                        modelSelectElement.value = data.preferredModel;
                    }
                    if (data && typeof data.avatarFileId === 'string') {
                        avatarFileIdHidden.value = data.avatarFileId || '';
                        setAvatarPreview(data.avatarFileId);
                    } else {
                        avatarFileIdHidden.value = '';
                        setAvatarPreview(null);
                    }
                    // Language
                    if (languageSelectElement) {
                        const currentLang = (data && typeof data.language === 'string' && data.language) || (window.i18n && window.i18n.getLanguage()) || 'ru';
                        languageSelectElement.value = currentLang;
                        // Optional: change UI immediately when select changes (persist on save)
                        languageSelectElement.addEventListener('change', () => {
                            try { if (window.i18n) window.i18n.setLanguage(languageSelectElement.value); } catch (e) {}
                        }, { once: true });
                    }
                    // Load TTS settings from tts module/localStorage
                    try {
                        const ttsModule = window.tts;
                        if (ttsAutoplayEl && ttsModule) {
                            ttsAutoplayEl.checked = !!ttsModule.settings.autoplay;
                        }
                        if (ttsRateEl && ttsModule) {
                            ttsRateEl.value = ttsModule.settings.rate || 1.0;
                        }
                        if (ttsPitchEl && ttsModule) {
                            ttsPitchEl.value = ttsModule.settings.pitch || 1.0;
                        }
                    } catch (ex) {
                        console.error(ex);
                    }

                    userSettingsModal.show();
                })
                .catch(error => {
                    console.error('Error fetching user preferences:', error);
                    Swal.fire({
                        icon: 'error',
                        title: (window.i18n && window.i18n.t('settings.load.error.title')) || 'Ошибка',
                        text: (window.i18n && window.i18n.t('settings.load.error.text')) || 'Не удалось загрузить настройки. Пожалуйста, попробуйте еще раз.'
                    });
                });
        });
    }

    // Avatar upload
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            try {
                const resp = await fetch('/api/files/upload', {
                    method: 'POST',
                    body: formData
                });
                if (!resp.ok) throw new Error('Upload failed');
                const data = await resp.json();
                if (data && data.id) {
                    avatarFileIdHidden.value = data.id;
                    setAvatarPreview(data.id);
                    Swal.fire({ icon: 'success', title: (window.i18n && window.i18n.t('settings.avatar.upload.success.title')) || 'Аватар загружен', timer: 1200, showConfirmButton: false });
                }
            } catch (err) {
                console.error('Avatar upload error', err);
                Swal.fire({
                    icon: 'error',
                    title: (window.i18n && window.i18n.t('settings.avatar.upload.error.title')) || 'Ошибка загрузки',
                    text: (window.i18n && window.i18n.t('settings.avatar.upload.error.text')) || 'Не удалось загрузить аватар'
                });
            }
        });
    }

    // Save the settings (including avatar file id and TTS)
    if (saveUserSettingsBtn) {
        saveUserSettingsBtn.addEventListener('click', () => {
            const systemPrompt = systemPromptTextarea.value;
            const preferredModel = modelSelectElement.value;
            const language = languageSelectElement ? languageSelectElement.value : (window.i18n && window.i18n.getLanguage());
            const avatarFileId = avatarFileIdHidden ? avatarFileIdHidden.value : '';
            // Collect TTS settings
            let ttsSettingsPayload = null;
            try {
                if (window.tts) {
                    ttsSettingsPayload = {
                        autoplay: !!(ttsAutoplayEl && ttsAutoplayEl.checked),
                        rate: ttsRateEl ? Number(ttsRateEl.value) : 1.0,
                        pitch: ttsPitchEl ? Number(ttsPitchEl.value) : 1.0
                    };
                    window.tts.applySettings(ttsSettingsPayload);
                }
            } catch (e) {
                console.warn('Unable to apply TTS settings:', e);
            }

            fetch('/api/user/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    systemPrompt: systemPrompt,
                    preferredModel: preferredModel,
                    avatarFileId: avatarFileId,
                    language: language
                })
            })
            .then(response => response.json())
            .then(data => {
                userSettingsModal.hide();
                Swal.fire({
                    icon: 'success',
                    title: (window.i18n && window.i18n.t('settings.save.success.title')) || 'Сохранено!',
                    text: (window.i18n && window.i18n.t('settings.save.success.text')) || 'Ваши настройки были успешно обновлены.',
                    timer: 1500,
                    showConfirmButton: false
                });

                // Обновляем отображение модели в интерфейсе, если она изменилась
                const currentModelBadge = document.querySelector('.model-name');
                if (currentModelBadge) {
                    const newModel = data?.preferredModel || preferredModel;
                    if (newModel) {
                        currentModelBadge.textContent = newModel;
                    }
                }
                // Apply language from server response if returned
                try {
                    const newLang = (data && data.language) || language;
                    if (newLang && window.i18n) window.i18n.setLanguage(newLang);
                } catch (_) {}
            })
            .catch(error => {
                console.error('Error saving user preferences:', error);
                Swal.fire({
                    icon: 'error',
                    title: (window.i18n && window.i18n.t('settings.save.error.title')) || 'Ошибка',
                    text: (window.i18n && window.i18n.t('settings.save.error.text')) || 'Не удалось сохранить настройки. Пожалуйста, попробуйте еще раз.'
                });
            });
        });
    }

    // Change password
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', async () => {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            if (!currentPassword || !newPassword || !confirmPassword) {
                Swal.fire({ icon: 'warning', title: (window.i18n && window.i18n.t('settings.profile.password.fillAll')) || 'Заполните все поля' });
                return;
            }
            try {
                const resp = await fetch('/api/user/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
                });
                const data = await resp.json().catch(() => ({}));
                if (!resp.ok) {
                    throw new Error(data?.message || (window.i18n && window.i18n.t('settings.profile.password.error.generic')) || 'Не удалось изменить пароль');
                }
                Swal.fire({ icon: 'success', title: (window.i18n && window.i18n.t('settings.profile.password.changed')) || 'Пароль изменен' });
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            } catch (e) {
                Swal.fire({ icon: 'error', title: (window.i18n && window.i18n.t('settings.profile.password.error.title')) || 'Ошибка', text: e.message });
            }
        });
    }
});
