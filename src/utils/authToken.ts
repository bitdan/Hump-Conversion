const EXPIRY_GRACE_MS = 30 * 1000

function decodeBase64Url(input: string) {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=')
    return window.atob(padded)
}

export function getJwtExpiryMs(token: string | null): number | null {
    if (!token) return null

    const parts = token.split('.')
    if (parts.length !== 3 || !parts[1]) return null

    try {
        const payload = JSON.parse(decodeBase64Url(parts[1])) as { exp?: unknown }
        return typeof payload.exp === 'number' ? payload.exp * 1000 : null
    } catch {
        return null
    }
}

export function isTokenExpired(token: string | null, now = Date.now()) {
    if (!token) return true

    const expiryMs = getJwtExpiryMs(token)
    if (expiryMs === null) return false

    return expiryMs <= now + EXPIRY_GRACE_MS
}
