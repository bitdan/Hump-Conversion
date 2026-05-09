import request from '@/utils/request'

export interface ChatMessage {
    id: string
    channel: string
    type: 'message' | 'system'
    user_id: string | null
    username: string | null
    content: string
    created_at: number
}

interface ApiResponse<T> {
    code: number
    msg: string
    data: T
}

export function getChatHistory(channel = 'general', limit = 50) {
    return request.get<ApiResponse<ChatMessage[]>>(`/api/v1/chat/history?channel=${encodeURIComponent(channel)}&limit=${limit}`)
}

