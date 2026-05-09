import DOMPurify from 'dompurify'

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function renderInline(value: string) {
    return escapeHtml(value)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
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

    return DOMPurify.sanitize(html.join('\n'))
}
