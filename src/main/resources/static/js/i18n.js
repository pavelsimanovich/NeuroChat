// Simple client-side i18n utility
(function () {
    const STORAGE_KEY = 'ui_lang';
    const DEFAULT_LANG = 'ru';

    const dictionaries = {
        ru: {
            'app.title': 'AI Чат',
            'brand.name': 'NeuroChat',

            'lang.ru': 'Русский',
            'lang.en': 'English',
            'lang.select': 'Язык',

            'sidebar.newChat': 'Новый чат',
            'sidebar.userSettings.title': 'Настройки пользователя',
            'sidebar.logout': 'Выход',
            'sidebar.logout.title': 'Выйти из аккаунта',
            'sidebar.resize.title': 'Изменить размер панели',

            'context.pin': 'Закрепить',
            'context.unpin': 'Открепить',
            'context.rename': 'Переименовать',
            'context.exportTxt': 'Экспортировать историю TXT',
            'context.delete': 'Удалить чат',

            // Rooms and groups
            'rooms.pinned': 'Закрепленные',
            'rooms.today': 'Сегодня',
            'rooms.yesterday': 'Вчера',
            'rooms.thisWeek': 'На этой неделе',
            'rooms.older': 'Ранее',
            'rooms.empty': 'История чатов пуста',
            'room.actions': 'Действия',

            'announcement.loading': 'Загрузка объявлений...',
            'announcement.loading.sr': 'Загрузка...',
            'announcement.more': 'Подробнее',
            'announcement.hide': 'Скрыть',
            'announcement.details.title': 'Подробнее об объявлении',

            'chat.header.selectOrCreate': 'выберите или создайте чат',
            'chat.model.admin': 'Админ',
            'chat.model.admin.title': 'Админ-панель',

            // Admin / Monitoring
            'admin.title': 'Админ-панель',
            'admin.nav.back': 'Назад',
            'admin.tabs.monitoring': 'Мониторинг',
            'admin.monitoring.title': 'Мониторинг',
            'admin.monitoring.period': 'Период:',
            'admin.monitoring.interval': 'Интервал:',
            'admin.monitoring.uptime': 'Время работы (ЧЧ:ММ:СС)',
            'admin.monitoring.httpRps': 'HTTP req/s (посл. замер)',
            'admin.monitoring.chart.rps': 'HTTP запросов в секунду',
            'admin.monitoring.chart.cpu': 'Нагрузка CPU (%)',
            'admin.monitoring.chart.heap': 'Куча памяти (MB)',
            'admin.monitoring.legend.rps': 'RPS',
            'admin.monitoring.legend.cpu': 'CPU %',
            'admin.monitoring.legend.heap': 'Heap MB',


            'admin.tabs.users': 'Пользователи',
            'admin.tabs.announcements': 'Объявления',

            // Users section
            'admin.users.stats.title': 'Статистика пользователей',
            'admin.users.stats.total': 'Всего',
            'admin.users.stats.new24h': 'Новые (24ч)',
            'admin.users.stats.new7d': 'Новые (7д)',
            'admin.users.title': 'Пользователи',
            'admin.users.search': 'Поиск по email/имени',
            'admin.users.table.email': 'Email',
            'admin.users.table.name': 'Имя',
            'admin.users.table.role': 'Роль',
            'admin.users.table.status': 'Статус',
            'admin.users.table.created': 'Создан',
            'admin.users.table.actions': 'Действия',
            'admin.users.badge.active': 'Активен',
            'admin.users.badge.disabled': 'Отключен',
            'admin.users.btn.disable': 'Отключить',
            'admin.users.btn.enable': 'Включить',
            'admin.users.btn.resetPass': 'Сброс пароля',

            // Announcements section
            'admin.ann.title': 'Управление объявлениями',
            'admin.ann.new': 'Новое объявление',
            'admin.ann.table.title': 'Заголовок',
            'admin.ann.table.start': 'Начало показа',
            'admin.ann.table.end': 'Окончание',
            'admin.ann.table.status': 'Статус',
            'admin.ann.table.actions': 'Действия',
            'admin.ann.modal.title': 'Новое объявление',
            'admin.ann.modal.field.title': 'Заголовок',
            'admin.ann.modal.validation.title': 'Пожалуйста, укажите заголовок',
            'admin.ann.modal.field.content': 'Содержание',
            'admin.ann.modal.validation.content': 'Пожалуйста, введите содержание',
            'admin.ann.modal.help.html': 'Поддерживается HTML-разметка',
            'admin.ann.modal.field.image': 'Изображение',
            'admin.ann.modal.help.image': 'PNG, JPG, WebP. Размер до 2 МБ рекомендуется.',
            'admin.ann.modal.image.alt': 'Превью изображения',
            'admin.ann.modal.field.isAd': 'Реклама',
            'admin.ann.modal.field.link': 'Ссылка для перехода',
            'admin.ann.modal.field.start': 'Дата начала',
            'admin.ann.modal.field.enableEnd': 'Установить дату окончания',
            'admin.ann.modal.field.active': 'Активно',
            'admin.ann.status.active': 'Активно',
            'admin.ann.status.inactive': 'Не активно',

            // Common
            'common.save': 'Сохранить',
            'common.cancel': 'Отмена',
            'common.close': 'Закрыть',

            // Time ranges
            'time.5m': '5 мин',
            'time.15m': '15 мин',
            'time.30m': '30 мин',
            'time.1h': '1 час',
            'time.3h': '3 часа',
            'time.6h': '6 часов',

            // Intervals
            'interval.3s': '3 сек',
            'interval.5s': '5 сек',
            'interval.10s': '10 сек',
            'interval.30s': '30 сек',

            'search.placeholder': 'Поиск по содержимому сообщений...',
            'search.find': 'Найти',
            'search.results': 'Результаты поиска',
            'search.results.count': 'результатов',
            'search.clear': 'Очистить поиск',
            'search.title': 'Поиск по сообщениям',
            'search.room': 'Поиск чатов...',

            'welcome.title': 'Добро пожаловать в AI Чат-ассистент',
            'welcome.subtitle': 'Ваш интеллектуальный помощник для решения любых задач. Задавайте вопросы, получайте консультации и находите решения прямо сейчас!',
            'welcome.start': 'Начать новый диалог',
            'welcome.section.title': 'Что я могу для вас сделать:',
            'welcome.cards.idea.title': 'Идеи для разработки',
            'welcome.cards.idea.text': 'Какие есть интересные идеи для веб-приложения на Spring Boot и Jakarta EE?',
            'welcome.cards.optimize.title': 'Оптимизация кода',
            'welcome.cards.optimize.text': 'Как оптимизировать SQL-запрос с множественными JOIN и подзапросами?',
            'welcome.cards.arch.title': 'Архитектура приложений',
            'welcome.cards.arch.text': 'Как создать RESTful API с Jakarta EE и документировать его с OpenAPI?',
            'welcome.cards.examples.title': 'Примеры кода',
            'welcome.cards.examples.text': 'Напиши пример использования Spring Data JPA с Lombok для создания сущности и репозитория',

            // Delete confirm dialog
            'delete.confirm.title': 'Подтверждение удаления',
            'delete.confirm.text': 'Вы уверены, что хотите удалить чат',
            'delete.confirm.warning': 'Это действие нельзя будет отменить',
            'delete.confirm.ok': 'Удалить',
            'delete.confirm.cancel': 'Отмена',

            'input.attach.title': 'Прикрепить файл',
            'input.voice.title': 'Голосовой ввод',
            'input.placeholder': 'Чем я могу помочь Вам сегодня?',
            'input.send.title': 'Отправить сообщение',
            'input.stop.title': 'Остановить генерацию',

            // Notifications / errors
            'notify.generationStopped': 'Генерация остановлена',
            'notify.unpinned': 'Чат откреплен',
            'notify.pinned': 'Чат закреплен',
            'notify.copyError': 'Ошибка копирования',

            'success.chatDeleted': 'Чат успешно удалён',

            'error.roomsLoad': 'Не удалось загрузить комнаты. Пожалуйста, обновите страницу.',
            'error.switchRoom': 'Ошибка загрузки',
            'error.messagesLoad': 'Ошибка загрузки сообщений. Обновите страницу.',
            'error.createRoom': 'Не удалось создать комнату',
            'error.fileUpload': 'Ошибка при загрузке файла',
            'error.deleteChat': 'Не удалось удалить чат',

            'limit.exceeded': 'Превышен лимит сообщений в комнате',

            // User settings notifications
            'settings.load.error.title': 'Ошибка',
            'settings.load.error.text': 'Не удалось загрузить настройки. Пожалуйста, попробуйте еще раз.',
            'settings.avatar.upload.success.title': 'Аватар загружен',
            'settings.avatar.upload.error.title': 'Ошибка загрузки',
            'settings.avatar.upload.error.text': 'Не удалось загрузить аватар',
            'settings.save.success.title': 'Сохранено!',
            'settings.save.success.text': 'Ваши настройки были успешно обновлены.',
            'settings.save.error.title': 'Ошибка',
            'settings.save.error.text': 'Не удалось сохранить настройки. Пожалуйста, попробуйте еще раз.',
            'settings.profile.password.fillAll': 'Заполните все поля',
            'settings.profile.password.changed': 'Пароль изменен',
            'settings.profile.password.error.title': 'Ошибка',
            'settings.profile.password.error.generic': 'Не удалось изменить пароль',

            'index.title': 'Вход в ИИ чат',
            'index.subtitle': 'Войдите в свой аккаунт, чтобы продолжить',
            'index.error': 'Неверный email или пароль. Пожалуйста, попробуйте снова.',
            'index.loggedOut': 'Вы успешно вышли из системы.',
            'index.email': 'Email',
            'index.email.placeholder': 'Введите ваш email',
            'index.password': 'Пароль',
            'index.forgot': 'Забыли пароль?',
            'index.remember': 'Запомнить меня на этом устройстве',
            'index.login': 'Войти',
            'index.or': 'или продолжить с помощью',
            'index.google': 'Google',
            'index.facebook': 'Facebook',
            'index.noAccount': 'Ещё нет аккаунта?',
            'index.register': 'Зарегистрируйтесь',
            'index.welcome': 'Добро пожаловать в NeuroChat',

            // Registration page
            'registration.pageTitle': 'Регистрация в ИИ чат',
            'registration.title': 'Регистрация',
            'registration.subtitle': 'Заполните форму для регистрации',
            'registration.email': 'Email',
            'registration.email.placeholder': 'Введите ваш email',
            'registration.password': 'Пароль',
            'registration.password.placeholder': 'Введите пароль',
            'registration.firstName': 'Имя',
            'registration.firstName.placeholder': 'Ваше имя',
            'registration.lastName': 'Фамилия',
            'registration.lastName.placeholder': 'Ваша фамилия',
            'registration.submit': 'Зарегистрироваться',
            'registration.haveAccount': 'Уже есть аккаунт?',
            'registration.login': 'Войти',

            // Forgot password page
            'forgot.pageTitle': 'Восстановление пароля',
            'forgot.heading': 'Восстановление пароля',
            'forgot.intro': 'Введите email, указанный при регистрации, и мы отправим вам ссылку для сброса пароля.',
            'forgot.email': 'Email',
            'forgot.email.placeholder': 'Введите ваш email',
            'forgot.submit': 'Отправить',
            'forgot.backToLogin': 'Вернуться к входу',
            'forgot.success': 'Email с инструкциями отправлен.',
            'forgot.error': 'Произошла ошибка.',

            // Reset password page
            'reset.pageTitle': 'Изменение пароля',
            'reset.heading': 'Создание нового пароля',
            'reset.intro': 'Введите новый пароль для вашей учетной записи. Пароль должен содержать не менее 8 символов.',
            'reset.newPassword': 'Новый пароль',
            'reset.newPassword.placeholder': 'Введите новый пароль',
            'reset.confirmPassword': 'Подтверждение пароля',
            'reset.confirmPassword.placeholder': 'Подтвердите новый пароль',
            'reset.submit': 'Изменить пароль',
            'reset.backToLogin': 'Вернуться к входу',

            // User Settings modal
            'modal.userSettings.title': 'Настройки пользователя',
            'modal.userSettings.tabs.general': 'Общие',
            'modal.userSettings.tabs.profile': 'Профиль',
            'modal.userSettings.tabs.about': 'О программе',
            'modal.userSettings.close': 'Закрыть',
            'modal.userSettings.save': 'Сохранить',

            // General tab
            'settings.general.note': 'Эти настройки будут применяться ко всем новым чатам.',
            'settings.theme.label': 'Тема интерфейса',
            'settings.theme.toggle': 'Тёмная тема',
            'settings.theme.toggle.title': 'Переключить тему',
            'settings.language.help': 'Выберите язык интерфейса приложения.',
            'settings.model.label': 'Модель ИИ',
            'settings.model.help': 'Выберите предпочитаемую модель для ваших чатов.',
            'settings.systemPrompt.label': 'Системный промпт',
            'settings.systemPrompt.placeholder': 'Пример: Ты — дружелюбный ассистент, который отвечает кратко и по делу.',
            'settings.systemPrompt.help': 'Укажите свой системный промпт, чтобы ИИ адаптировался к вашим предпочтениям. Не длиннее 1000 символов.',

            // TTS
            'settings.tts.label': 'Озвучивание ответов (TTS)',
            'settings.tts.autoplay': 'Автоматически озвучивать ответы',
            'settings.tts.voice.label': 'Голос',
            'settings.tts.voice.help': 'Список голосов зависит от браузера и ОС.',
            'settings.tts.voice.auto': 'Определяется браузером...',
            'settings.tts.voice.defaultSuffix': ' — по умолчанию',
            'settings.tts.rate': 'Скорость',
            'settings.tts.pitch': 'Высота',

            // Profile tab
            'settings.profile.avatar.alt': 'Аватар',
            'settings.profile.avatar.help': 'Загрузите изображение в формате JPG/PNG, до 10МБ.',
            'settings.profile.password.title': 'Смена пароля',
            'settings.profile.password.current': 'Текущий пароль',
            'settings.profile.password.new': 'Новый пароль',
            'settings.profile.password.confirm': 'Подтверждение пароля',
            'settings.profile.password.change': 'Изменить пароль',

            // About tab
            'settings.about.text': 'О программе.',

            // Rename room modal
            'rename.title': 'Переименовать чат',
            'rename.label': 'Новое название',
            'rename.placeholder': 'Введите новое название',
            'rename.charcount.suffix': 'символов',
            'rename.cancel': 'Отмена'
        },
        en: {
            'app.title': 'AI Chat',
            'brand.name': 'NeuroChat',

            'lang.ru': 'Русский',
            'lang.en': 'English',
            'lang.select': 'Language',

            'sidebar.newChat': 'New chat',
            'sidebar.userSettings.title': 'User settings',
            'sidebar.logout': 'Logout',
            'sidebar.logout.title': 'Sign out',
            'sidebar.resize.title': 'Resize panel',

            'context.pin': 'Pin',
            'context.unpin': 'Unpin',
            'context.rename': 'Rename',
            'context.exportTxt': 'Export history (TXT)',
            'context.delete': 'Delete chat',

            // Rooms and groups
            'rooms.pinned': 'Pinned',
            'rooms.today': 'Today',
            'rooms.yesterday': 'Yesterday',
            'rooms.thisWeek': 'This week',
            'rooms.older': 'Earlier',
            'rooms.empty': 'No chat history',
            'room.actions': 'Actions',

            'announcement.loading': 'Loading announcements...',
            'announcement.loading.sr': 'Loading...',
            'announcement.more': 'Details',
            'announcement.hide': 'Hide',
            'announcement.details.title': 'Announcement details',

            'chat.header.selectOrCreate': 'select or create a chat',
            'chat.model.admin': 'Admin',
            'chat.model.admin.title': 'Admin panel',

            // Admin / Monitoring
            'admin.title': 'Admin panel',
            'admin.nav.back': 'Back',
            'admin.tabs.monitoring': 'Monitoring',
            'admin.monitoring.title': 'Monitoring',
            'admin.monitoring.period': 'Period:',
            'admin.monitoring.interval': 'Interval:',
            'admin.monitoring.uptime': 'Uptime (HH:MM:SS)',
            'admin.monitoring.httpRps': 'HTTP req/s (last sample)',
            'admin.monitoring.chart.rps': 'HTTP requests per second',
            'admin.monitoring.chart.cpu': 'CPU usage (%)',
            'admin.monitoring.chart.heap': 'Heap memory (MB)',
            'admin.monitoring.legend.rps': 'RPS',
            'admin.monitoring.legend.cpu': 'CPU %',
            'admin.monitoring.legend.heap': 'Heap MB',

            // Admin tabs
            'admin.tabs.users': 'Users',
            'admin.tabs.announcements': 'Announcements',

            // Users section
            'admin.users.stats.title': 'User statistics',
            'admin.users.stats.total': 'Total',
            'admin.users.stats.new24h': 'New (24h)',
            'admin.users.stats.new7d': 'New (7d)',
            'admin.users.title': 'Users',
            'admin.users.search': 'Search by email/name',
            'admin.users.table.email': 'Email',
            'admin.users.table.name': 'Name',
            'admin.users.table.role': 'Role',
            'admin.users.table.status': 'Status',
            'admin.users.table.created': 'Created',
            'admin.users.table.actions': 'Actions',
            'admin.users.badge.active': 'Active',
            'admin.users.badge.disabled': 'Disabled',
            'admin.users.btn.disable': 'Disable',
            'admin.users.btn.enable': 'Enable',
            'admin.users.btn.resetPass': 'Reset password',

            // Announcements section
            'admin.ann.title': 'Announcements management',
            'admin.ann.new': 'New announcement',
            'admin.ann.table.title': 'Title',
            'admin.ann.table.start': 'Start date',
            'admin.ann.table.end': 'End date',
            'admin.ann.table.status': 'Status',
            'admin.ann.table.actions': 'Actions',
            'admin.ann.modal.title': 'New announcement',
            'admin.ann.modal.field.title': 'Title',
            'admin.ann.modal.validation.title': 'Please enter title',
            'admin.ann.modal.field.content': 'Content',
            'admin.ann.modal.validation.content': 'Please enter content',
            'admin.ann.modal.help.html': 'HTML is supported',
            'admin.ann.modal.field.image': 'Image',
            'admin.ann.modal.help.image': 'PNG, JPG, WebP. Recommended size up to 2 MB.',
            'admin.ann.modal.image.alt': 'Image preview',
            'admin.ann.modal.field.isAd': 'Advertisement',
            'admin.ann.modal.field.link': 'Target URL',
            'admin.ann.modal.field.start': 'Start date',
            'admin.ann.modal.field.enableEnd': 'Set end date',
            'admin.ann.modal.field.active': 'Active',
            'admin.ann.status.active': 'Active',
            'admin.ann.status.inactive': 'Inactive',

            // Time ranges
            'time.5m': '5 min',
            'time.15m': '15 min',
            'time.30m': '30 min',
            'time.1h': '1 hour',
            'time.3h': '3 hours',
            'time.6h': '6 hours',

            // Intervals
            'interval.3s': '3 sec',
            'interval.5s': '5 sec',
            'interval.10s': '10 sec',
            'interval.30s': '30 sec',

            'search.placeholder': 'Search messages...',
            'search.find': 'Find',
            'search.results': 'Search results',
            'search.results.count': 'results',
            'search.clear': 'Clear search',
            'search.title': 'Search messages',
            'search.room': 'Search room...',

            'welcome.title': 'Welcome to the AI Chat Assistant',
            'welcome.subtitle': 'Your intelligent assistant for any task. Ask questions, get advice, and find solutions now!',
            'welcome.start': 'Start a new conversation',
            'welcome.section.title': 'What I can do for you:',
            'welcome.cards.idea.title': 'Development ideas',
            'welcome.cards.idea.text': 'What are some interesting ideas for a Spring Boot and Jakarta EE web app?',
            'welcome.cards.optimize.title': 'Code optimization',
            'welcome.cards.optimize.text': 'How to optimize an SQL query with multiple JOINs and subqueries?',
            'welcome.cards.arch.title': 'Application architecture',
            'welcome.cards.arch.text': 'How to build a RESTful API with Jakarta EE and document it with OpenAPI?',
            'welcome.cards.examples.title': 'Code examples',
            'welcome.cards.examples.text': 'Write an example using Spring Data JPA with Lombok to create an entity and repository',

            // Delete confirm dialog
            'delete.confirm.title': 'Delete confirmation',
            'delete.confirm.text': 'Are you sure you want to delete the chat',
            'delete.confirm.warning': 'This action cannot be undone',
            'delete.confirm.ok': 'Delete',
            'delete.confirm.cancel': 'Cancel',

            'input.attach.title': 'Attach file',
            'input.voice.title': 'Voice input',
            'input.placeholder': 'How can I help you today?',
            'input.send.title': 'Send message',
            'input.stop.title': 'Stop generation',

            // Notifications / errors
            'notify.generationStopped': 'Generation stopped',
            'notify.unpinned': 'Chat unpinned',
            'notify.pinned': 'Chat pinned',
            'notify.copyError': 'Copy failed',

            'success.chatDeleted': 'Chat deleted successfully',

            'error.roomsLoad': 'Failed to load rooms. Please refresh the page.',
            'error.switchRoom': 'Failed to load',
            'error.messagesLoad': 'Failed to load messages. Please refresh the page.',
            'error.createRoom': 'Failed to create room',
            'error.fileUpload': 'File upload failed',
            'error.deleteChat': 'Failed to delete chat',

            'limit.exceeded': 'Room message limit exceeded',

            // User settings notifications
            'settings.load.error.title': 'Error',
            'settings.load.error.text': 'Failed to load settings. Please try again.',
            'settings.avatar.upload.success.title': 'Avatar uploaded',
            'settings.avatar.upload.error.title': 'Upload error',
            'settings.avatar.upload.error.text': 'Failed to upload avatar',
            'settings.save.success.title': 'Saved!',
            'settings.save.success.text': 'Your settings have been updated successfully.',
            'settings.save.error.title': 'Error',
            'settings.save.error.text': 'Failed to save settings. Please try again.',
            'settings.profile.password.fillAll': 'Fill in all fields',
            'settings.profile.password.changed': 'Password changed',
            'settings.profile.password.error.title': 'Error',
            'settings.profile.password.error.generic': 'Failed to change password',

            'index.title': 'Sign in to AI Chat',
            'index.subtitle': 'Sign in to your account to continue',
            'index.error': 'Invalid email or password. Please try again.',
            'index.loggedOut': 'You have been signed out.',
            'index.email': 'Email',
            'index.email.placeholder': 'Enter your email',
            'index.password': 'Password',
            'index.forgot': 'Forgot password?',
            'index.remember': 'Remember me on this device',
            'index.login': 'Sign in',
            'index.or': 'or continue with',
            'index.google': 'Google',
            'index.facebook': 'Facebook',
            'index.noAccount': "Don't have an account?",
            'index.register': 'Register',
            'index.welcome': 'Welcome to the NeuroChat',

            // Registration page
            'registration.pageTitle': 'Sign up to AI Chat',
            'registration.title': 'Sign up',
            'registration.subtitle': 'Fill in the form to create your account',
            'registration.email': 'Email',
            'registration.email.placeholder': 'Enter your email',
            'registration.password': 'Password',
            'registration.password.placeholder': 'Enter password',
            'registration.firstName': 'First name',
            'registration.firstName.placeholder': 'Your first name',
            'registration.lastName': 'Last name',
            'registration.lastName.placeholder': 'Your last name',
            'registration.submit': 'Register',
            'registration.haveAccount': 'Already have an account?',
            'registration.login': 'Sign in',

            // Forgot password page
            'forgot.pageTitle': 'Password recovery',
            'forgot.heading': 'Password recovery',
            'forgot.intro': 'Enter the email you used to register and we will send you a password reset link.',
            'forgot.email': 'Email',
            'forgot.email.placeholder': 'Enter your email',
            'forgot.submit': 'Send',
            'forgot.backToLogin': 'Back to login',
            'forgot.success': 'An email with instructions has been sent.',
            'forgot.error': 'An error occurred.',

            // Reset password page
            'reset.pageTitle': 'Reset password',
            'reset.heading': 'Create a new password',
            'reset.intro': 'Enter a new password for your account. It must be at least 8 characters long.',
            'reset.newPassword': 'New password',
            'reset.newPassword.placeholder': 'Enter new password',
            'reset.confirmPassword': 'Confirm password',
            'reset.confirmPassword.placeholder': 'Confirm new password',
            'reset.submit': 'Change password',
            'reset.backToLogin': 'Back to login',

            // User Settings modal
            'modal.userSettings.title': 'User settings',
            'modal.userSettings.tabs.general': 'General',
            'modal.userSettings.tabs.profile': 'Profile',
            'modal.userSettings.tabs.about': 'About',
            'modal.userSettings.close': 'Close',
            'modal.userSettings.save': 'Save',

            // General tab
            'settings.general.note': 'These settings will apply to all new chats.',
            'settings.theme.label': 'Interface theme',
            'settings.theme.toggle': 'Dark theme',
            'settings.theme.toggle.title': 'Toggle theme',
            'settings.language.help': 'Select the application interface language.',
            'settings.model.label': 'AI model',
            'settings.model.help': 'Choose your preferred model for chats.',
            'settings.systemPrompt.label': 'System prompt',
            'settings.systemPrompt.placeholder': 'Example: You are a friendly assistant that answers briefly and to the point.',
            'settings.systemPrompt.help': 'Specify your system prompt so the AI adapts to your preferences. No longer than 1000 characters.',

            // TTS
            'settings.tts.label': 'Text-to-Speech (TTS)',
            'settings.tts.autoplay': 'Autoplay responses',
            'settings.tts.voice.label': 'Voice',
            'settings.tts.voice.help': 'The list of voices depends on the browser and OS.',
            'settings.tts.voice.auto': 'Determined by browser...',
            'settings.tts.voice.defaultSuffix': ' — default',
            'settings.tts.rate': 'Rate',
            'settings.tts.pitch': 'Pitch',

            // Profile tab
            'settings.profile.avatar.alt': 'Avatar',
            'settings.profile.avatar.help': 'Upload a JPG/PNG image up to 10MB.',
            'settings.profile.password.title': 'Change password',
            'settings.profile.password.current': 'Current password',
            'settings.profile.password.new': 'New password',
            'settings.profile.password.confirm': 'Confirm password',
            'settings.profile.password.change': 'Change password',

            // About tab
            'settings.about.text': 'About the application.',

            // Rename room modal
            'rename.title': 'Rename chat',
            'rename.label': 'New name',
            'rename.placeholder': 'Enter a new name',
            'rename.charcount.suffix': 'characters',
            'rename.cancel': 'Cancel'
        }
    };

    const i18n = {
        lang: null,
        setLanguage(lang) {
            this.lang = dictionaries[lang] ? lang : DEFAULT_LANG;
            try {
                localStorage.setItem(STORAGE_KEY, this.lang);
            } catch (ex) {
                console.error(ex);
            }
            this.apply();
            document.documentElement.lang = this.lang;
            const event = new CustomEvent('i18n:changed', { detail: { lang: this.lang }});
            window.dispatchEvent(event);
        },
        getLanguage() {
            if (this.lang) return this.lang;
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved && dictionaries[saved]) {
                    this.lang = saved;
                    return this.lang;
                }
            } catch (ex) {
                console.error(ex);
            }
            this.lang = DEFAULT_LANG;
            return this.lang;
        },
        t(key, fallback) {
            const lang = this.getLanguage();
            return (dictionaries[lang] && dictionaries[lang][key]) || fallback || key;
        },
        // Apply translations to [data-i18n] elements
        apply(root = document) {
            const lang = this.getLanguage();
            const dict = dictionaries[lang] || {};
            const nodes = root.querySelectorAll('[data-i18n]');
            nodes.forEach(node => {
                const key = node.getAttribute('data-i18n');
                const attr = node.getAttribute('data-i18n-attr');
                const text = dict[key];
                if (text == null) return;
                if (attr) {
                    if (attr === 'placeholder') {
                        node.setAttribute('placeholder', text);
                    } else if (attr === 'title' || attr === 'aria-label') {
                        node.setAttribute(attr, text);
                    } else {
                        node.setAttribute(attr, text);
                    }
                } else {
                    node.textContent = text;
                }
            });
            // Handle elements that need both text and title
            const titleNodes = root.querySelectorAll('[data-i18n-title]');
            titleNodes.forEach(node => {
                const key = node.getAttribute('data-i18n-title');
                const text = dict[key];
                if (text != null) node.setAttribute('title', text);
            });
        }
    };

    // Expose globally
    window.i18n = i18n;

    // Initialize on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function () {
        i18n.getLanguage();
        i18n.apply();
        // Wire up language selectors
        document.querySelectorAll('[data-i18n-switch]').forEach(sel => {
            sel.value = i18n.getLanguage();
            sel.addEventListener('change', () => i18n.setLanguage(sel.value));
        });
    });
})();
