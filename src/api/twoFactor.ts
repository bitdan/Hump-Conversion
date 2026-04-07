import request from '@/utils/request'

interface ApiResponse<T> {
    code: number
    msg: string
    data: T
}

export interface TwoFactorAccountPayload {
    label?: string
    issuer?: string
    accountName?: string
    secret?: string
    digits?: number
    period?: number
    algorithm?: string
    otpauthUri?: string
}

export interface TwoFactorAccount extends Required<Omit<TwoFactorAccountPayload, 'otpauthUri'>> {
    id: string
    createdAt: string
    updatedAt: string
    code: string
    secondsRemaining: number
    otpauthUri?: string
    secretMasked: string
    secret?: string
}

export interface TwoFactorImportPayload {
    text?: string
    items?: TwoFactorAccountPayload[]
    mergeMode?: 'append' | 'replace'
}

export interface TwoFactorExportData {
    format: 'json' | 'otpauth'
    content: string | TwoFactorAccount[]
}

export function listTwoFactorAccounts() {
    return request.get<ApiResponse<TwoFactorAccount[]>>('/api/v1/2fa/accounts')
}

export function getTwoFactorAccount(accountId: string) {
    return request.get<ApiResponse<TwoFactorAccount>>(`/api/v1/2fa/accounts/${accountId}`)
}

export function createTwoFactorAccount(payload: TwoFactorAccountPayload) {
    return request.post<ApiResponse<TwoFactorAccount>>('/api/v1/2fa/accounts', payload)
}

export function updateTwoFactorAccount(accountId: string, payload: TwoFactorAccountPayload) {
    return request.put<ApiResponse<TwoFactorAccount>>(`/api/v1/2fa/accounts/${accountId}`, payload)
}

export function deleteTwoFactorAccount(accountId: string) {
    return request.delete<ApiResponse<void>>(`/api/v1/2fa/accounts/${accountId}`)
}

export function importTwoFactorAccounts(payload: TwoFactorImportPayload) {
    return request.post<ApiResponse<{ imported: number; total: number; items: TwoFactorAccount[] }>>(
        '/api/v1/2fa/accounts/import',
        payload
    )
}

export function exportTwoFactorAccounts(format: 'json' | 'otpauth') {
    return request.get<ApiResponse<TwoFactorExportData>>('/api/v1/2fa/accounts/export', {
        params: {exportFormat: format}
    })
}
