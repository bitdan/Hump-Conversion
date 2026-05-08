import request from '@/utils/request'

interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

interface GameEvent {
    type: string
    room_id: string
    data: any
    timestamp: number
}

interface RoomInfo {
    room_id: string
    host: {
        user_id: string
        username: string
        color: string | null
        is_ready: boolean
        is_online: boolean
    }
    guest: {
        user_id: string
        username: string
        color: string | null
        is_ready: boolean
        is_online: boolean
    } | null
    game_state: {
        status: string
        board: number[][]
        current_player: string
        winner: string | null
        last_move: {
            x: number
            y: number
            color: string
        } | null
        moves_count: number
        created_at: number
        updated_at: number
    }
    spectator_count: number
}

// 创建五子棋房间
export function createGomokuRoom() {
    return request.post<ApiResponse<string>>('/api/v1/game/create-room', {})
}

// 加入五子棋房间
export function joinGomokuRoom(roomId: string) {
    return request.post<ApiResponse<void>>('/api/v1/game/join-room', {room_id: roomId})
}

// 离开五子棋房间
export function leaveGomokuRoom() {
    return request.post<ApiResponse<void>>('/api/v1/game/leave-room')
}

// 下棋
export function makeMove(roomId: string, x: number, y: number) {
    return request.post<ApiResponse<void>>('/api/v1/game/make-move', {
        room_id: roomId,
        x,
        y
    })
}

// 开始游戏
export function startGame(roomId: string) {
    return request.post<ApiResponse<void>>(`/api/v1/game/start-game?room_id=${roomId}`)
}

// 重新开始游戏
export function restartGame(roomId: string) {
    return request.post<ApiResponse<void>>(`/api/v1/game/restart-game?room_id=${roomId}`)
}

// 获取房间信息
export function getRoomInfo(roomId: string) {
    return request.get<ApiResponse<RoomInfo>>(`/api/v1/game/room/${roomId}`)
}

// 创建SSE事件流
export function createEventStream(roomId: string, onMessage: (event: GameEvent) => void, onError?: (error: Event) => void, onClose?: () => void): EventSource {
    const token = localStorage.getItem('token')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
    const shouldUseLegacyQueryToken = import.meta.env.VITE_SSE_TOKEN_IN_QUERY === 'true'
    const url = new URL(`${apiBaseUrl}/api/v1/game/events/${roomId}`, window.location.origin)
    if (shouldUseLegacyQueryToken && token) {
        url.searchParams.set('access_token', token)
    }

    const eventSource = new EventSource(url.toString(), {
        withCredentials: true
    })

    eventSource.addEventListener('open', () => {
        if (onMessage) {
            onMessage({
                type: 'connected',
                room_id: roomId,
                data: {},
                timestamp: Date.now()
            })
        }
    })

    eventSource.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data)
            onMessage(data)
        } catch (error) {
            console.error('解析SSE事件失败:', error)
        }
    })

    eventSource.addEventListener('error', (error) => {
        console.error('SSE连接错误:', error)
        if (onError) onError(error)
    })

    // 监听连接关闭
    const originalClose = eventSource.close.bind(eventSource)
    eventSource.close = () => {
        if (onClose) onClose()
        originalClose()
    }

    return eventSource
} 
