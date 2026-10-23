/* ============================================================
   NeuroChat — Modern features layer
   Additive functionality on top of chat.js (no edits needed there
   except the optional `export-md` context-menu hook).
   ============================================================ */
(function () {
    'use strict';

    const t = (key, fallback) => (window.i18n && typeof window.i18n.t === 'function')
        ? window.i18n.t(key, fallback)
        : fallback;

    const LS_ACCENT = 'nc_accent';
    const LS_DENSITY = 'nc_density';

    /* ---------------------------------------------------------
       Appearance: accent color + density
       --------------------------------------------------------- */
    const appearance = {
        apply() {
            const accent = localStorage.getItem(LS_ACCENT);
            const root = document.documentElement;
            if (accent && accent !== 'indigo') {
                root.setAttribute('data-accent', accent);
            } else {
                root.removeAttribute('data-accent');
            }
            const density = localStorage.getItem(LS_DENSITY);
            if (density === 'compact') {
                root.setAttribute('data-density', 'compact');
            } else {
                root.removeAttribute('data-density');
            }
            document.querySelectorAll('.accent-swatch').forEach(sw => {
                sw.classList.toggle('active', sw.dataset.accentSwatch === (accent || 'indigo'));
            });
            const compact = document.getElementById('compactModeSwitch');
            if (compact) compact.checked = density === 'compact';
        },
        setAccent(accent) {
            if (accent === 'indigo') localStorage.removeItem(LS_ACCENT);
            else localStorage.setItem(LS_ACCENT, accent);
            this.apply();
        },
        toggleDensity() {
            const isCompact = document.documentElement.getAttribute('data-density') === 'compact';
            localStorage.setItem(LS_DENSITY, isCompact ? '' : 'compact');
            this.apply();
        },
        bindUI() {
            document.querySelectorAll('.accent-swatch').forEach(sw => {
                sw.addEventListener('click', () => this.setAccent(sw.dataset.accentSwatch));
            });
            const compact = document.getElementById('compactModeSwitch');
            if (compact) {
                compact.addEventListener('change', () => {
                    localStorage.setItem(LS_DENSITY, compact.checked ? 'compact' : '');
                    this.apply();
                });
            }
            this.apply();
        }
    };

    /* ---------------------------------------------------------
       Command palette (Ctrl/Cmd+K)
       --------------------------------------------------------- */
    const palette = {
        overlay: null,
        input: null,
        list: null,
        items: [],
        selected: 0,
        isOpen: false,

        actions() {
            const actions = [
                {
                    id: 'new-chat', icon: 'bi-plus-lg',
                    title: t('palette.newChat', 'Новый чат'),
                    run: () => document.getElementById('createRoomBtn')?.click()
                },
                {
                    id: 'toggle-theme', icon: 'bi-moon-stars',
                    title: t('palette.toggleTheme', 'Переключить тему'),
                    run: () => {
                        const tt = window.themeToggle || (typeof themeToggle !== 'undefined' ? themeToggle : null);
                        if (tt) tt.toggleTheme();
                    }
                },
                {
                    id: 'toggle-density', icon: 'bi-arrows-collapse',
                    title: t('palette.toggleDensity', 'Компактный режим'),
                    hint: t('palette.densityHint', 'Уменьшить отступы'),
                    run: () => appearance.toggleDensity()
                },
                {
                    id: 'search-messages', icon: 'bi-search',
                    title: t('palette.searchMessages', 'Поиск по сообщениям'),
                    run: () => document.getElementById('toggleSearch')?.click()
                },
                {
                    id: 'export-md', icon: 'bi-filetype-md',
                    title: t('palette.exportMd', 'Экспорт чата в Markdown'),
                    run: () => {
                        const room = window.chatState?.currentRoom;
                        if (room && room.id) window.exportChatMarkdown(room.id);
                    }
                },
                {
                    id: 'stop-tts', icon: 'bi-volume-mute',
                    title: t('palette.stopSpeaking', 'Остановить озвучку'),
                    run: () => window.tts && window.tts.stop()
                },
                {
                    id: 'settings', icon: 'bi-gear',
                    title: t('palette.settings', 'Настройки пользователя'),
                    run: () => document.getElementById('userSettingsBtn')?.click()
                }
            ];
            return actions;
        },

        build() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'cmdk-overlay';
            this.overlay.innerHTML = `
                <div class="cmdk" role="dialog" aria-modal="true">
                    <div class="cmdk-input-wrap">
                        <i class="bi bi-command"></i>
                        <input type="text" class="cmdk-input" autocomplete="off" spellcheck="false"
                               placeholder="${t('palette.placeholder', 'Команда или чат...')}">
                        <span class="cmdk-kbd">ESC</span>
                    </div>
                    <div class="cmdk-list" role="listbox"></div>
                </div>`;
            document.body.appendChild(this.overlay);
            this.input = this.overlay.querySelector('.cmdk-input');
            this.list = this.overlay.querySelector('.cmdk-list');

            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.close();
            });
            this.input.addEventListener('input', () => this.render());
            this.input.addEventListener('keydown', (e) => this.onKey(e));
        },

        collect() {
            const q = (this.input.value || '').toLowerCase().trim();
            const acts = this.actions().filter(a => a.title.toLowerCase().includes(q));
            const rooms = (window.chatState?.rooms || [])
                .filter(r => (r.title || '').toLowerCase().includes(q))
                .slice(0, 8)
                .map(r => ({
                    id: 'room-' + r.id,
                    icon: 'bi-chat-left-text',
                    title: r.title || t('rooms.untitled', 'Без названия'),
                    hint: t('palette.openChat', 'Открыть чат'),
                    run: () => {
                        const el = document.querySelector(`.room-item[data-room-id="${CSS.escape(String(r.id))}"]`);
                        if (el) el.click();
                    }
                }));
            this.items = rooms.length
                ? [{ section: t('palette.chats', 'Чаты') }, ...rooms, { section: t('palette.actions', 'Действия') }, ...acts]
                : acts;
            this.selected = 0;
        },

        render() {
            this.collect();
            this.list.innerHTML = '';
            let idx = 0;
            if (!this.items.length) {
                this.list.innerHTML = `<div class="cmdk-empty">${t('palette.empty', 'Ничего не найдено')}</div>`;
                return;
            }
            this.items.forEach(item => {
                if (item.section) {
                    const s = document.createElement('div');
                    s.className = 'cmdk-section';
                    s.textContent = item.section;
                    this.list.appendChild(s);
                    return;
                }
                const el = document.createElement('div');
                el.className = 'cmdk-item' + (idx === this.selected ? ' selected' : '');
                el.setAttribute('role', 'option');
                el.dataset.idx = idx;
                el.innerHTML = `<i class="bi ${item.icon}"></i>
                    <span class="cmdk-item-title"></span>
                    ${item.hint ? `<span class="cmdk-item-hint">${item.hint}</span>` : ''}`;
                el.querySelector('.cmdk-item-title').textContent = item.title;
                el.addEventListener('click', () => this.execute(item));
                el.addEventListener('mousemove', () => {
                    if (this.selected !== idx) { this.selected = idx; this.highlight(); }
                });
                this.list.appendChild(el);
                idx++;
            });
        },

        selectable() { return this.items.filter(i => !i.section); },

        highlight() {
            let idx = 0;
            this.list.querySelectorAll('.cmdk-item').forEach(el => {
                el.classList.toggle('selected', idx === this.selected);
                idx++;
            });
            const sel = this.list.querySelector('.cmdk-item.selected');
            if (sel) sel.scrollIntoView({ block: 'nearest' });
        },

        onKey(e) {
            const count = this.selectable().length;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selected = (this.selected + 1) % Math.max(count, 1);
                this.highlight();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selected = (this.selected - 1 + count) % Math.max(count, 1);
                this.highlight();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const item = this.selectable()[this.selected];
                if (item) this.execute(item);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }
        },

        execute(item) {
            this.close();
            try { item.run(); } catch (err) { console.error('Palette action failed', err); }
        },

        open() {
            if (!this.overlay) this.build();
            this.isOpen = true;
            this.input.value = '';
            this.render();
            this.overlay.classList.add('open');
            setTimeout(() => this.input.focus(), 10);
        },

        close() {
            this.isOpen = false;
            if (this.overlay) this.overlay.classList.remove('open');
        },

        toggle() { this.isOpen ? this.close() : this.open(); }
    };

    /* ---------------------------------------------------------
       Export chat to Markdown (client-side)
       --------------------------------------------------------- */
    window.exportChatMarkdown = async function (roomId) {
        if (!roomId) return;
        try {
            const resp = await fetch(`/api/chat/rooms/${encodeURIComponent(roomId)}/messages`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const messages = await resp.json();

            const room = (window.chatState?.rooms || []).find(r => String(r.id) === String(roomId));
            const title = room?.title
                || document.querySelector(`.room-item[data-room-id="${CSS.escape(String(roomId))}"]`)?.dataset.roomTitle
                || 'chat';
            const uid = document.getElementById('userId')?.value;
            const userName = document.getElementById('userName')?.value || 'User';

            let md = `# ${title}\n\n`;
            md += `> ${t('export.md.exported', 'Экспортировано')}: ${new Date().toLocaleString()}\n\n---\n\n`;
            (messages || []).forEach(m => {
                const isUser = uid && String(m.userId) === String(uid);
                const who = isUser ? userName : 'AI';
                const when = m.timestamp ? new Date(m.timestamp).toLocaleString() : '';
                md += `**${who}** · _${when}_\n\n${m.content || ''}\n\n`;
            });

            const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${title.replace(/[^\w\dа-яёА-ЯЁ -]/gi, '_')}.md`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        } catch (err) {
            console.error('Markdown export failed', err);
        }
    };

    /* ---------------------------------------------------------
       Welcome screen: delegated "create room" fallback
       (chat.js is a module, so inline onclick="createRoom()" fails)
       --------------------------------------------------------- */
    function fixWelcomeButtons() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('#createRoomBtn1');
            if (!target) return;
            if (typeof window.createRoom === 'function') {
                window.createRoom();
            } else {
                document.getElementById('createRoomBtn')?.click();
            }
        });
    }

    /* ---------------------------------------------------------
       Init
       --------------------------------------------------------- */
    function init() {
        // Ctrl/Cmd+K — capture phase so it wins over chat.js handler
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                e.stopPropagation();
                palette.toggle();
            } else if (e.key === 'Escape' && palette.isOpen) {
                palette.close();
            }
        }, true);

        document.getElementById('paletteBtn')?.addEventListener('click', () => palette.open());

        appearance.bindUI();
        fixWelcomeButtons();
        fixContextMenu();
    }

    // #roomContextMenu lives inside .sidebar whose backdrop-filter creates a
    // containing block for position:fixed — the menu got clipped and stretched
    // the column. Moving it to <body> restores true viewport positioning.
    function fixContextMenu() {
        const menu = document.getElementById('roomContextMenu');
        if (menu && menu.parentElement !== document.body) {
            document.body.appendChild(menu);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
