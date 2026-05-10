export interface StickerDefinition {
    id: string
    name: string
    shortcodes: string[]
    url: string
    category: string
}

export const STICKERS: StickerDefinition[] = [
    {
        id: 'doge',
        name: 'Doge',
        shortcodes: ['doge'],
        url: '/stickers/doge.svg',
        category: 'Tool Hub'
    },
    {
        id: 'wow',
        name: 'Wow',
        shortcodes: ['wow'],
        url: '/stickers/wow.svg',
        category: 'Tool Hub'
    },
    {
        id: 'code-on',
        name: 'Code On',
        shortcodes: ['code-on'],
        url: '/stickers/code-on.svg',
        category: 'Tool Hub'
    },
    {
        id: 'bug-alert',
        name: 'Bug Alert',
        shortcodes: ['bug-alert'],
        url: '/stickers/bug-alert.svg',
        category: 'Tool Hub'
    }
]

export const STICKER_MAP = Object.fromEntries(STICKERS.map(sticker => [sticker.id, sticker]))
export const STICKER_NAME_MAP = Object.fromEntries(STICKERS.map(sticker => [sticker.name.toLowerCase(), sticker]))

export const STICKER_TOKEN_RE = /\[sticker:([a-zA-Z0-9_-]+)]/g

export function createStickerToken(id: string) {
    return `[sticker:${id}]`
}

export function isStickerId(value: string) {
    return Boolean(STICKER_MAP[String(value || '').trim()])
}

export function findStickerByName(value: string) {
    return STICKER_NAME_MAP[String(value || '').trim().toLowerCase()] || null
}

export function findStickerByShortcode(value: string) {
    const shortcode = String(value || '').trim().toLowerCase()
    return STICKERS.find(sticker => sticker.shortcodes.some(item => item.toLowerCase() === shortcode)) || null
}

export function replaceStickerTokens(value: string, replacer: (sticker: StickerDefinition, raw: string) => string) {
    return String(value || '').replace(STICKER_TOKEN_RE, (raw, id) => {
        const sticker = STICKER_MAP[String(id || '').trim()]
        return sticker ? replacer(sticker, raw) : raw
    })
}
