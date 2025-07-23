document.addEventListener('DOMContentLoaded', function () {
    const userSettingsBtn = document.getElementById('userSettingsBtn');
    const userSettingsModal = new bootstrap.Modal(document.getElementById('userSettingsModal'));
    const saveUserSettingsBtn = document.getElementById('saveUserSettings');
    const systemPromptTextarea = document.getElementById('systemPrompt');

    // Show the modal
    if (userSettingsBtn) {
        userSettingsBtn.addEventListener('click', () => {
            // Fetch current settings and populate the modal before showing
            fetch('/api/user/preferences')
                .then(response => response.json())
                .then(data => {
                    if (data && data.userSystemPrompt) {
                        systemPromptTextarea.value = data.userSystemPrompt;
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

    // Save the settings
    if (saveUserSettingsBtn) {
        saveUserSettingsBtn.addEventListener('click', () => {
            const systemPrompt = systemPromptTextarea.value;

            fetch('/api/user/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ systemPrompt: systemPrompt })
            })
            .then(response => response.json())
            .then(data => {
                userSettingsModal.hide();
                Swal.fire({
                    icon: 'success',
                    title: 'Сохранено!',
                    text: 'Ваши настройки были успешно обновлены.',
                    timer: 1500,
                    showConfirmButton: false
                });
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
});
