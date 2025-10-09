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
  console.log('调用创建房间接口')
    return request.post<ApiResponse<string>>('/api/v1/game/create-room', {})
}

// 加入五子棋房间
export function joinGomokuRoom(roomId: string) {
  console.log('调用加入房间接口', roomId)
    return request.post<ApiResponse<void>>('/api/v1/game/join-room', {room_id: roomId})
}

// 离开五子棋房间
export function leaveGomokuRoom() {
    console.log('调用离开房间接口')
    return request.post<ApiResponse<void>>('/api/v1/game/leave-room')
}

// 下棋
export function makeMove(roomId: string, x: number, y: number) {
    console.log('调用下棋接口', {roomId, x, y})
    return request.post<ApiResponse<void>>('/api/v1/game/make-move', {
        room_id: roomId,
        x,
        y
    })
}

// 开始游戏
export function startGame(roomId: string) {
    console.log('调用开始游戏接口', roomId)
    return request.post<ApiResponse<void>>(`/api/v1/game/start-game?room_id=${roomId}`)
}

// 重新开始游戏
export function restartGame(roomId: string) {
    console.log('调用重新开始游戏接口', roomId)
    return request.post<ApiResponse<void>>(`/api/v1/game/restart-game?room_id=${roomId}`)
}

// 获取房间信息
export function getRoomInfo(roomId: string) {
    console.log('调用获取房间信息接口', roomId)
    return request.get<ApiResponse<RoomInfo>>(`/api/v1/game/room/${roomId}`)
}

// 创建SSE事件流
export function createEventStream(roomId: string, onMessage: (event: GameEvent) => void, onError?: (error: Event) => void, onClose?: () => void): EventSource {
    const token = localStorage.getItem('token')
    const url = `${import.meta.env.VITE_API_BASE_URL}/api/v1/game/events/${roomId}?access_token=${token}`

    const eventSource = new EventSource(url, {
        withCredentials: true
    })

    // 设置请求头
    eventSource.addEventListener('open', () => {
        console.log('SSE连接已建立')
    })

    eventSource.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data)
            console.log('收到SSE事件:', data)
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
        console.log('SSE连接已关闭')
        if (onClose) onClose()
        originalClose()
    }

    return eventSource
} 
