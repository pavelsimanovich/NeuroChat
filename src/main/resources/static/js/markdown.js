(function () {
    'use strict';

    const DROP_WITH_CONTENT = new Set([
        'SCRIPT', 'STYLE', 'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'SVG', 'MATH',
        'FORM', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA', 'SELECT', 'BUTTON', 'LINK', 'META', 'BASE'
    ]);

    const ALLOWED_TAGS = new Set([
        'A', 'BLOCKQUOTE', 'BR', 'CODE', 'DEL', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR',
        'IMG', 'INPUT', 'KBD', 'LI', 'MARK', 'OL', 'P', 'PRE', 'SPAN', 'STRONG', 'SUB', 'SUP',
        'TABLE', 'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'UL'
    ]);

    const ALLOWED_ATTRS = {
        CODE: ['class'],
        A: ['href', 'title'],
        IMG: ['src', 'alt', 'title'],
        INPUT: ['type', 'checked', 'disabled'],
        OL: ['start'],
        TD: ['align', 'colspan', 'rowspan'],
        TH: ['align', 'colspan', 'rowspan']
    };

    const URL_SCHEMES = {
        href: ['http', 'https', 'mailto'],
        src: ['http', 'https']
    };

    function isSafeUrl(value, schemes) {
        const normalized = String(value).replace(/[\u0000-\u0020\u007f-\u009f]/g, '');
        const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized);
        return !scheme || schemes.includes(scheme[1].toLowerCase());
    }

    function sanitizeChildren(parent) {
        for (const node of Array.from(parent.childNodes)) {
            if (node.nodeType !== Node.ELEMENT_NODE) {
                if (node.nodeType !== Node.TEXT_NODE) node.remove();
                continue;
            }

            const tag = node.tagName.toUpperCase();
            if (DROP_WITH_CONTENT.has(tag)) {
                node.remove();
                continue;
            }

            if (!ALLOWED_TAGS.has(tag) || (tag === 'INPUT' && node.getAttribute('type') !== 'checkbox')) {
                sanitizeChildren(node);
                node.replaceWith(...node.childNodes);
                continue;
            }

            const allowed = ALLOWED_ATTRS[tag] || [];
            for (const attr of Array.from(node.attributes)) {
                const name = attr.name.toLowerCase();
                if (!allowed.includes(name) || name.startsWith('on')) {
                    node.removeAttribute(attr.name);
                } else if (URL_SCHEMES[name] && !isSafeUrl(attr.value, URL_SCHEMES[name])) {
                    node.removeAttribute(attr.name);
                }
            }

            if (tag === 'A') {
                node.setAttribute('target', '_blank');
                node.setAttribute('rel', 'noopener noreferrer');
            }

            sanitizeChildren(node);
        }
    }

    window.renderMarkdown = function (text) {
        const doc = new DOMParser().parseFromString(marked.parse(String(text ?? '')), 'text/html');
        sanitizeChildren(doc.body);
        return doc.body.innerHTML;
    };
})();
