import request from '@/utils/request'
import {useUserStore} from '@/stores/user'

export interface AgentChatRequest {
    message: string
    session_id?: string
    route?: string
    history?: Array<Record<string, string>>
    context?: Record<string, any>
    options?: Record<string, any>
    client_request_id?: string
}

export interface AgentChatResponse {
    route: string
    title: string
    answer: string
    structured_content: Record<string, any>
    run_id?: string
    trace_id?: string
    session_id?: string
    status?: string
    steps?: Array<Record<string, any>>
    tool_calls?: Array<Record<string, any>>
    citations?: string[]
    metrics?: Record<string, any>
}

export interface AgentChatStreamEvent {
    event: string
    data: Record<string, any>
}

export function sendAgentChat(data: AgentChatRequest) {
    return request.post<AgentChatResponse>('/api/v1/agent/chat', data)
}

export async function streamAgentChat(
    data: AgentChatRequest,
    onEvent: (event: AgentChatStreamEvent) => void
) {
    const userStore = useUserStore()
    const headers: Record<string, string> = {
        'Content-Type': 'application/json;charset=utf-8'
    }
    if (userStore.token) {
        headers.Authorization = `Bearer ${userStore.token}`
    }

    const response = await fetch(buildAgentStreamUrl(), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(data)
    })

    if (!response.ok || !response.body) {
        throw new Error(`Agent stream failed: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
        const {done, value} = await reader.read()
        if (done) break
        buffer += decoder.decode(value, {stream: true})
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() || ''
        for (const chunk of chunks) {
            const parsed = parseSseChunk(chunk)
            if (parsed) onEvent(parsed)
        }
    }

    if (buffer.trim()) {
        const parsed = parseSseChunk(buffer)
        if (parsed) onEvent(parsed)
    }
}

function buildAgentStreamUrl(): string {
    const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
    if (!baseUrl) return '/api/v1/agent/chat/stream'
    if (baseUrl.endsWith('/api/v1')) return `${baseUrl}/agent/chat/stream`
    return `${baseUrl}/api/v1/agent/chat/stream`
}

function parseSseChunk(chunk: string): AgentChatStreamEvent | null {
    const lines = chunk.split(/\r?\n/)
    const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() || 'message'
    const dataText = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n')
    if (!dataText) return null
    return {
        event,
        data: JSON.parse(dataText)
    }
}
