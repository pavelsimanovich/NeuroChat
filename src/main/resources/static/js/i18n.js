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

      'announcement.loading': 'Загрузка объявлений...',
      'announcement.loading.sr': 'Загрузка...',
      'announcement.more': 'Подробнее',
      'announcement.hide': 'Скрыть',

      'chat.header.selectOrCreate': 'выберите или создайте чат',
      'chat.model.admin': 'Админ',
      'chat.model.admin.title': 'Админ-панель',

      'search.placeholder': 'Поиск по содержимому сообщений...',
      'search.find': 'Найти',
      'search.results': 'Результаты поиска',
      'search.results.count': 'результатов',
      'search.clear': 'Очистить поиск',
      'search.title': 'Поиск по сообщениям',

      'welcome.title': 'Добро пожаловать в AI Чат-ассистент',
      'welcome.subtitle': 'Ваш интеллектуальный помощник для решения любых задач. Задавайте вопросы, получайте консультации и находите решения прямо сейчас!',
      'welcome.start': 'Начать новый диалог',

      'input.attach.title': 'Прикрепить файл',
      'input.voice.title': 'Голосовой ввод',
      'input.placeholder': 'Чем я могу помочь Вам сегодня?',
      'input.send.title': 'Отправить сообщение',
      'input.stop.title': 'Остановить генерацию',

      // Notifications / errors
      'notify.generationStopped': 'Генерация остановлена',
      'error.roomsLoad': 'Не удалось загрузить комнаты. Пожалуйста, обновите страницу.',

      'modal.userSettings.title': 'Настройки пользователя',
      'modal.userSettings.tabs.general': 'Общие',
      'modal.userSettings.tabs.profile': 'Профиль',
      'modal.userSettings.tabs.about': 'О программе',
      'modal.userSettings.close': 'Закрыть',
      'modal.userSettings.save': 'Сохранить',

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
      'index.register': 'Зарегистрируйтесь'
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

      'announcement.loading': 'Loading announcements...',
      'announcement.loading.sr': 'Loading...',
      'announcement.more': 'Details',
      'announcement.hide': 'Hide',

      'chat.header.selectOrCreate': 'select or create a chat',
      'chat.model.admin': 'Admin',
      'chat.model.admin.title': 'Admin panel',

      'search.placeholder': 'Search messages...',
      'search.find': 'Find',
      'search.results': 'Search results',
      'search.results.count': 'results',
      'search.clear': 'Clear search',
      'search.title': 'Search messages',

      'welcome.title': 'Welcome to the AI Chat Assistant',
      'welcome.subtitle': 'Your intelligent assistant for any task. Ask questions, get advice, and find solutions now!',
      'welcome.start': 'Start a new conversation',

      'input.attach.title': 'Attach file',
      'input.voice.title': 'Voice input',
      'input.placeholder': 'How can I help you today?',
      'input.send.title': 'Send message',
      'input.stop.title': 'Stop generation',

      // Notifications / errors
      'notify.generationStopped': 'Generation stopped',
      'error.roomsLoad': 'Failed to load rooms. Please refresh the page.',

      'modal.userSettings.title': 'User settings',
      'modal.userSettings.tabs.general': 'General',
      'modal.userSettings.tabs.profile': 'Profile',
      'modal.userSettings.tabs.about': 'About',
      'modal.userSettings.close': 'Close',
      'modal.userSettings.save': 'Save',

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
      'index.register': 'Register'
    }
  };

  const i18n = {
    lang: null,
    setLanguage(lang) {
      this.lang = dictionaries[lang] ? lang : DEFAULT_LANG;
      try { localStorage.setItem(STORAGE_KEY, this.lang); } catch (_) {}
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
      } catch (_) {}
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
