/**
 * Workspace panel — opens code / tables / large documents next to the chat.
 * Content can be edited and downloaded independently of the answer.
 * Exposed as window.workspace.
 */
(function () {
    'use strict';

    const LARGE_DOC_CHARS = 1500;
    const t = (key, fallback) => (window.i18n && window.i18n.t) ? window.i18n.t(key, fallback) : fallback;

    const EXT_BY_LANG = {
        javascript: 'js', js: 'js', typescript: 'ts', ts: 'ts',
        python: 'py', py: 'py', java: 'java', kotlin: 'kt',
        c: 'c', cpp: 'cpp', 'c++': 'cpp', csharp: 'cs', 'c#': 'cs',
        go: 'go', rust: 'rs', ruby: 'rb', php: 'php', swift: 'swift',
        html: 'html', xml: 'xml', css: 'css', scss: 'scss', less: 'less',
        json: 'json', yaml: 'yml', yml: 'yml', toml: 'toml',
        sql: 'sql', bash: 'sh', sh: 'sh', shell: 'sh', zsh: 'sh',
        markdown: 'md', md: 'md', plaintext: 'txt', text: 'txt', '': 'txt'
    };

    const state = {
        open: false,
        editing: false,
        type: 'code',        // 'code' | 'table' | 'doc'
        lang: '',
        title: '',
        content: ''          // raw text (code / markdown / html for tables)
    };

    let els = {};

    function init() {
        els.panel = document.getElementById('workspacePanel');
        if (!els.panel) {
            console.warn('[workspace] #workspacePanel not found');
            return;
        }
        ['title', 'badge', 'preview', 'editor', 'editBtn', 'copyBtn',
            'downloadBtn', 'closeBtn', 'toggleBtn'].forEach(key => {
            const id = 'workspace' + key.charAt(0).toUpperCase() + key.slice(1);
            els[key] = document.getElementById(id);
            if (!els[key]) console.warn('[workspace] missing #' + id);
        });

        if (els.closeBtn) els.closeBtn.addEventListener('click', close);
        if (els.editBtn) els.editBtn.addEventListener('click', toggleEdit);
        if (els.copyBtn) els.copyBtn.addEventListener('click', copyContent);
        if (els.downloadBtn) els.downloadBtn.addEventListener('click', download);
        if (els.toggleBtn) {
            els.toggleBtn.addEventListener('click', () => {
                if (state.open) {
                    close();
                } else if (state.content) {
                    openPanel();
                } else {
                    open({
                        type: 'doc',
                        title: t('workspace.toggle.title', 'Панель результата'),
                        content: t('workspace.empty',
                            'Нажмите «Открыть в панели» на блоке кода, таблице или длинном ответе — и содержимое появится здесь.')
                    });
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.open) close();
        });

        observeMessages();
    }

    /* ---------------- public API ---------------- */

    function open(opts) {
        state.type = opts.type || 'code';
        state.lang = opts.lang || '';
        state.title = opts.title || defaultTitle(state.type, state.lang);
        state.content = opts.content || '';
        state.editing = false;
        openPanel();
    }

    function openPanel() {
        state.open = true;
        els.panel.classList.add('open');
        els.panel.setAttribute('aria-hidden', 'false');
        document.body.classList.add('workspace-open');
        if (els.toggleBtn) els.toggleBtn.classList.add('active');
        render();
    }

    function isEmptyDoc() {
        return state.type === 'doc' && !state.lang;
    }

    function close() {
        state.open = false;
        state.editing = false;
        els.panel.classList.remove('open');
        els.panel.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('workspace-open');
        if (els.toggleBtn) els.toggleBtn.classList.remove('active');
    }

    function defaultTitle(type, lang) {
        if (type === 'table') return t('workspace.table', 'Таблица');
        if (type === 'doc') return t('workspace.doc', 'Документ');
        return (lang ? lang.toUpperCase() + ' ' : '') + t('workspace.code', 'код');
    }

    /* ---------------- rendering ---------------- */

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function render() {
        const empty = state.type === 'doc' && !state.lang
            && state.content === t('workspace.empty',
                'Нажмите «Открыть в панели» на блоке кода, таблице или длинном ответе — и содержимое появится здесь.');
        if (els.title) els.title.textContent = state.title;
        if (els.badge) els.badge.textContent = state.type === 'code'
            ? (state.lang || 'text')
            : state.type;

        const icon = els.editBtn && els.editBtn.querySelector('i');
        if (icon) icon.className = state.editing ? 'bi bi-eye' : 'bi bi-pencil';
        if (els.editBtn) els.editBtn.title = state.editing
            ? t('workspace.preview', 'Предпросмотр')
            : t('workspace.edit', 'Редактировать');
        if (els.editBtn) els.editBtn.disabled = empty;
        if (els.copyBtn) els.copyBtn.disabled = empty;
        if (els.downloadBtn) els.downloadBtn.disabled = empty;

        if (state.editing) {
            els.editor.value = state.content;
            els.editor.classList.remove('d-none');
            els.preview.classList.add('d-none');
            els.editor.focus();
            return;
        }

        els.editor.classList.add('d-none');
        els.preview.classList.remove('d-none');
        els.preview.classList.toggle('ws-doc', state.type !== 'code');

        if (state.type === 'code') {
            els.preview.innerHTML =
                `<pre class="ws-pre"><code class="language-${escapeHtml(state.lang)}">${escapeHtml(state.content)}</code></pre>`;
        } else if (state.type === 'table') {
            // content is sanitized HTML of the table
            els.preview.innerHTML = `<div class="ws-table-wrap">${state.content}</div>`;
        } else {
            els.preview.innerHTML = window.renderMarkdown
                ? window.renderMarkdown(state.content)
                : `<pre class="ws-pre">${escapeHtml(state.content)}</pre>`;
        }
    }

    function toggleEdit() {
        if (state.editing) {
            state.content = els.editor.value;
            state.editing = false;
        } else {
            state.editing = true;
        }
        render();
    }

    async function copyContent() {
        const text = state.editing ? els.editor.value : state.content;
        try {
            await navigator.clipboard.writeText(text);
            notify(t('code.copied', 'Скопировано'), 'success');
        } catch (e) {
            notify(t('notify.copyError', 'Ошибка копирования'), 'error');
        }
    }

    function fileExtension() {
        if (state.type === 'table') return 'html';
        if (state.type === 'doc') return 'md';
        return EXT_BY_LANG[state.lang.toLowerCase()] || 'txt';
    }

    function download() {
        const text = state.editing ? els.editor.value : state.content;
        let data = text;
        if (state.type === 'table') {
            data = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>` +
                `table{border-collapse:collapse}td,th{border:1px solid #888;padding:6px 10px}</style>` +
                `</head><body>${text}</body></html>`;
        }
        const name = (state.title || 'workspace').replace(/[^\w\-]+/g, '_').toLowerCase();
        const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${name}.${fileExtension()}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        notify(t('export.md.exported', 'Экспортировано'), 'success');
    }

    function notify(msg, type) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(msg, type);
            return;
        }
        // Fallback: transient badge inside the panel header
        if (!els.badge) return;
        const prev = els.badge.textContent;
        els.badge.textContent = msg;
        setTimeout(() => { els.badge.textContent = prev; }, 2000);
    }

    /* ---------------- injection into the chat ---------------- */

    function makeOpenBtn(getPayload) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ws-open-btn';
        btn.title = t('workspace.open', 'Открыть в панели');
        btn.innerHTML = `<i class="bi bi-window-sidebar"></i><span>${t('workspace.open', 'Открыть в панели')}</span>`;
        btn.dataset.wsBound = '1';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
                open(getPayload());
            } catch (err) {
                console.error('[workspace] open failed:', err);
            }
        });
        return btn;
    }

    function enhanceCodeBlock(wrapper) {
        const header = wrapper.querySelector('.code-block-header');
        if (!header || header.querySelector('.ws-open-btn')) return;
        const pre = wrapper.querySelector('pre');
        const code = pre && pre.querySelector('code');
        const langClass = code
            ? Array.from(code.classList).find(c => c.startsWith('language-'))
            : null;
        const lang = langClass ? langClass.replace('language-', '') : '';
        const btn = makeOpenBtn(() => ({
            type: 'code',
            lang,
            title: (lang ? lang.toUpperCase() + ' ' : '') + t('workspace.code', 'код'),
            content: code ? code.innerText : (pre ? pre.innerText : '')
        }));
        const langEl = header.querySelector('.code-lang');
        if (langEl && langEl.nextSibling) {
            header.insertBefore(btn, langEl.nextSibling);
        } else {
            header.appendChild(btn);
        }
    }

    function enhanceTable(table) {
        if (table.closest('.ws-table-source') || table.dataset.wsEnhanced) return;
        table.dataset.wsEnhanced = '1';
        const btn = makeOpenBtn(() => ({
            type: 'table',
            title: t('workspace.table', 'Таблица'),
            content: table.outerHTML
        }));
        btn.classList.add('ws-table-btn');
        const holder = document.createElement('div');
        holder.className = 'ws-table-toolbar';
        holder.appendChild(btn);
        table.parentNode.insertBefore(holder, table);
    }

    function enhanceMessage(msg) {
        // large markdown documents without code blocks / tables get a doc button
        const content = msg.querySelector('.message-content');
        if (!content || msg.dataset.wsDocEnhanced) return;
        if (content.querySelector('pre') || content.querySelector('table')) return;
        const text = content.innerText || '';
        if (text.length < LARGE_DOC_CHARS) return;
        msg.dataset.wsDocEnhanced = '1';
        const btn = makeOpenBtn(() => ({
            type: 'doc',
            title: t('workspace.doc', 'Документ'),
            content: text
        }));
        btn.classList.add('ws-doc-btn');
        msg.appendChild(btn);
    }

    function scan(root) {
        root.querySelectorAll('.code-block').forEach(enhanceCodeBlock);
        root.querySelectorAll('.ai-message .message-content table').forEach(enhanceTable);
        root.querySelectorAll('.ai-message').forEach(enhanceMessage);
    }

    function observeMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        scan(container);
        new MutationObserver((mutations) => {
            for (const m of mutations) {
                m.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.matches && node.matches('.code-block')) enhanceCodeBlock(node);
                    if (node.matches && node.matches('.ai-message')) enhanceMessage(node);
                    if (node.querySelectorAll) {
                        node.querySelectorAll('.code-block').forEach(enhanceCodeBlock);
                        if (node.matches && node.matches('.message-content')) {
                            node.querySelectorAll('table').forEach(enhanceTable);
                        }
                    }
                });
            }
        }).observe(container, { childList: true, subtree: true });

        // Delegated fallback: works even if a button was injected without a listener
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.ws-open-btn');
            if (btn && !btn.dataset.wsBound) btn.click();
        });
    }

    window.workspace = { open, close };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
