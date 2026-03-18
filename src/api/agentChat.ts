import request from '@/utils/request'

export interface AgentChatRequest {
    message: string
    history?: Array<Record<string, string>>
}

export interface AgentChatResponse {
    route: string
    title: string
    answer: string
    structured_content: Record<string, any>
}

export function sendAgentChat(data: AgentChatRequest) {
    return request.post<AgentChatResponse>('/api/v1/agent/chat', data)
}
