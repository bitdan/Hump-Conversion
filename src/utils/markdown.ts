import DOMPurify from 'dompurify'
import {marked} from 'marked'
import {replaceStickerTokens} from '@/utils/stickers'

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function renderInline(value: string) {
    const rendered = escapeHtml(value)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    return replaceStickerTokens(rendered, (sticker) =>
        `<img class="inline-sticker" src="${sticker.url}" alt="${sticker.name}" title="${sticker.name}" data-sticker="${sticker.id}">`
    )
}

export function renderMarkdown(markdown: string) {
    const html = marked.parse(String(markdown || ''), {
        async: false,
        breaks: false,
        gfm: true
    }) as string
    const withStickers = replaceStickerTokens(html, (sticker) =>
        `<img class="inline-sticker" src="${sticker.url}" alt="${sticker.name}" title="${sticker.name}" data-sticker="${sticker.id}">`
    )
    return DOMPurify.sanitize(withStickers, {
        ADD_TAGS: ['img'],
        ADD_ATTR: ['src', 'alt', 'title', 'class', 'data-sticker']
    })
}

export function renderRichText(text: string) {
    const withBreaks = renderInline(String(text || ''))
        .replace(/\r\n/g, '\n')
        .replace(/\n/g, '<br>')
    return DOMPurify.sanitize(withBreaks, {
        ADD_TAGS: ['img', 'br'],
        ADD_ATTR: ['src', 'alt', 'title', 'class', 'data-sticker']
    })
}
