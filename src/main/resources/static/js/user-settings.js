document.addEventListener('DOMContentLoaded', function () {
    const userSettingsBtn = document.getElementById('userSettingsBtn');
    const userSettingsModal = new bootstrap.Modal(document.getElementById('userSettingsModal'));
    const saveUserSettingsBtn = document.getElementById('saveUserSettings');
    const systemPromptTextarea = document.getElementById('systemPrompt');
    const modelSelectElement = document.getElementById('modelSelect');
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
                        // No voice list to populate
                    } catch (ex) {
                        console.error(ex);
                    }

                    userSettingsModal.show();
                })
                .catch(error => {
                    console.error('Error fetching user preferences:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Ошибка',
                        text: 'Не удалось загрузить настройки. Пожалуйста, попробуйте еще раз.'
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
                    Swal.fire({ icon: 'success', title: 'Аватар загружен', timer: 1200, showConfirmButton: false });
                }
            } catch (err) {
                console.error('Avatar upload error', err);
                Swal.fire({ icon: 'error', title: 'Ошибка загрузки', text: 'Не удалось загрузить аватар' });
            }
        });
    }

    // Save the settings (including avatar file id and TTS)
    if (saveUserSettingsBtn) {
        saveUserSettingsBtn.addEventListener('click', () => {
            const systemPrompt = systemPromptTextarea.value;
            const preferredModel = modelSelectElement.value;
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
                    avatarFileId: avatarFileId
                })
            })
            .then(response => response.json())
            .then(data => {
                userSettingsModal.hide();
                Swal.fire({
                    icon: 'success',
                    title: 'Сохранено!',
                    text: 'Ваши настройки были успешно обновлены.' + (ttsSettingsPayload ? ' (Настройки TTS применены)' : ''),
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
            })
            .catch(error => {
                console.error('Error saving user preferences:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Ошибка',
                    text: 'Не удалось сохранить настройки. Пожалуйста, попробуйте еще раз.'
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
                Swal.fire({ icon: 'warning', title: 'Заполните все поля' });
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
                    throw new Error(data?.message || 'Не удалось изменить пароль');
                }
                Swal.fire({ icon: 'success', title: 'Пароль изменен' });
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            } catch (e) {
                Swal.fire({ icon: 'error', title: 'Ошибка', text: e.message });
            }
        });
    }
});
