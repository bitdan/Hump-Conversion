import DOMPurify from 'dompurify'
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
    const lines = markdown.replace(/\r\n/g, '\n').split('\n')
    const html: string[] = []
    let inCode = false
    let inList = false
    let codeLines: string[] = []

    function closeList() {
        if (inList) {
            html.push('</ul>')
            inList = false
        }
    }

    for (const line of lines) {
        if (line.trim().startsWith('```')) {
            if (inCode) {
                html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
                codeLines = []
                inCode = false
            } else {
                closeList()
                inCode = true
            }
            continue
        }

        if (inCode) {
            codeLines.push(line)
            continue
        }

        if (!line.trim()) {
            closeList()
            continue
        }

        const heading = /^(#{1,3})\s+(.+)$/.exec(line)
        if (heading) {
            closeList()
            const level = heading[1].length
            html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
            continue
        }

        const listItem = /^[-*]\s+(.+)$/.exec(line)
        if (listItem) {
            if (!inList) {
                html.push('<ul>')
                inList = true
            }
            html.push(`<li>${renderInline(listItem[1])}</li>`)
            continue
        }

        const quote = /^>\s?(.+)$/.exec(line)
        if (quote) {
            closeList()
            html.push(`<blockquote>${renderInline(quote[1])}</blockquote>`)
            continue
        }

        closeList()
        html.push(`<p>${renderInline(line)}</p>`)
    }

    closeList()
    if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
    }

    return DOMPurify.sanitize(html.join('\n'), {
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
