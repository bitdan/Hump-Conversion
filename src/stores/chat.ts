import {defineStore} from 'pinia'
import {computed, ref} from 'vue'
import {type ChatMessage, getChatHistory} from '@/api/chat'
import {useUserStore} from '@/stores/user'

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected'

interface ChatSocketEvent {
    type: 'connected' | 'message' | 'error'
    channel?: string
    message?: ChatMessage
}

export const useChatStore = defineStore('chat', () => {
    const isOpen = ref(false)
    const channel = ref('general')
    const messages = ref<ChatMessage[]>([])
    const unreadCount = ref(0)
    const status = ref<ConnectionStatus>('idle')
    const error = ref<string | null>(null)
    const socket = ref<WebSocket | null>(null)
    const reconnectTimer = ref<number | null>(null)
    const shouldReconnect = ref(false)
    const historyLoaded = ref(false)

    const isConnected = computed(() => status.value === 'connected')

    function buildWebSocketUrl(): string {
        const configuredWsUrl = import.meta.env.VITE_WS_URL
        const configuredApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL
        const fallbackBase = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
        const baseUrl = configuredWsUrl || (configuredApiUrl ? configuredApiUrl.replace(/^http/, 'ws') : fallbackBase)
        const url = new URL('/api/v1/chat/ws', baseUrl)
        url.searchParams.set('channel', channel.value)

        const token = localStorage.getItem('token')
        if (import.meta.env.VITE_WS_TOKEN_IN_QUERY === 'true' && token) {
            url.searchParams.set('access_token', token)
        }

        return url.toString()
    }

    function mergeMessage(message: ChatMessage) {
        if (messages.value.some(item => item.id === message.id)) return
        messages.value.push(message)
        if (messages.value.length > 100) {
            messages.value = messages.value.slice(-100)
        }
        if (!isOpen.value) {
            unreadCount.value += 1
        }
    }

    async function loadHistory(force = false) {
        if (historyLoaded.value && !force) return
        const userStore = useUserStore()
        if (!userStore.token) return

        try {
            const response = await getChatHistory(channel.value)
            if (response.code === 200 && response.data) {
                const knownIds = new Set(messages.value.map(item => item.id))
                const merged = [...response.data.filter(item => !knownIds.has(item.id)), ...messages.value]
                messages.value = merged
                    .sort((left, right) => left.created_at - right.created_at)
                    .slice(-100)
                historyLoaded.value = true
            }
        } catch (loadError: any) {
            error.value = loadError?.message || '聊天记录加载失败'
        }
    }

    function clearReconnectTimer() {
        if (reconnectTimer.value !== null) {
            window.clearTimeout(reconnectTimer.value)
            reconnectTimer.value = null
        }
    }

    function scheduleReconnect() {
        clearReconnectTimer()
        if (!shouldReconnect.value) return
        reconnectTimer.value = window.setTimeout(() => {
            connect()
        }, 3000)
    }

    function connect() {
        const userStore = useUserStore()
        if (!userStore.token || status.value === 'connecting' || status.value === 'connected') return

        shouldReconnect.value = true
        status.value = 'connecting'
        error.value = null

        const ws = new WebSocket(buildWebSocketUrl())
        socket.value = ws

        ws.onopen = () => {
            status.value = 'connected'
            error.value = null
            void loadHistory()
        }

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data) as ChatSocketEvent
                if (payload.type === 'connected') {
                    status.value = 'connected'
                    return
                }
                if (payload.type === 'message' && payload.message) {
                    mergeMessage(payload.message)
                    return
                }
                if (payload.type === 'error') {
                    error.value = String((payload as any).message || '聊天连接错误')
                }
            } catch (parseError) {
                error.value = '聊天消息解析失败'
            }
        }

        ws.onerror = () => {
            error.value = '聊天连接异常'
        }

        ws.onclose = () => {
            if (socket.value === ws) {
                socket.value = null
            }
            status.value = 'disconnected'
            scheduleReconnect()
        }
    }

    function disconnect() {
        shouldReconnect.value = false
        clearReconnectTimer()
        if (socket.value) {
            socket.value.close()
            socket.value = null
        }
        status.value = 'disconnected'
    }

    function setOpen(value: boolean) {
        isOpen.value = value
        if (value) {
            unreadCount.value = 0
            void loadHistory()
            connect()
        }
    }

    function toggleOpen() {
        setOpen(!isOpen.value)
    }

    function sendMessage(content: string) {
        const text = content.trim()
        if (!text || text.length > 500) return false

        if (!socket.value || socket.value.readyState !== WebSocket.OPEN) {
            connect()
            error.value = '聊天连接中，请稍后发送'
            return false
        }

        socket.value.send(JSON.stringify({
            type: 'message',
            content: text
        }))
        return true
    }

    function reset() {
        disconnect()
        messages.value = []
        unreadCount.value = 0
        historyLoaded.value = false
        error.value = null
        isOpen.value = false
    }

    return {
        isOpen,
        channel,
        messages,
        unreadCount,
        status,
        error,
        isConnected,
        connect,
        disconnect,
        setOpen,
        toggleOpen,
        sendMessage,
        loadHistory,
        reset
    }
})

