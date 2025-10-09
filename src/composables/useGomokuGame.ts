import {computed, ref} from 'vue'
import {
    createEventStream,
    leaveGomokuRoom,
    makeMove as apiMakeMove,
    restartGame as apiRestartGame,
    startGame as apiStartGame
} from '@/api/game'

export interface GameState {
    status: 'waiting' | 'ready' | 'playing' | 'finished'
    board: number[][]  // 0: 空, 1: 黑棋, 2: 白棋
  currentPlayer: 'black' | 'white'
  winner: 'black' | 'white' | null
    lastMove: { x: number, y: number } | null
    movesCount: number
}

export interface Player {
    userId: string
    username: string
    color: 'black' | 'white' | null
    isReady: boolean
    isOnline: boolean
}

export interface OnlineGame {
    roomId: string
    host: Player
    guest: Player | null
    gameState: GameState
    playerColor: 'black' | 'white' | null
    isReady: boolean
    opponentName: string | null
}

export function useGomokuGame(roomId: string) {
    const game = ref<OnlineGame | null>(null)
    const eventSource = ref<EventSource | null>(null)
    const isConnected = ref(false)
    const error = ref<string | null>(null)

    // 初始化游戏状态
    const initGame = () => {
        game.value = {
            roomId,
            host: {
                userId: '',
                username: '',
                color: null,
                isReady: false,
                isOnline: false
            },
            guest: null,
            gameState: {
                status: 'waiting',
                board: Array(15).fill(null).map(() => Array(15).fill(0)),
                currentPlayer: 'black',
                winner: null,
                lastMove: null,
                movesCount: 0
            },
            playerColor: null,
            isReady: false,
            opponentName: null
        }
    }

    // 启动SSE连接
    const startConnection = () => {
        if (eventSource.value) {
            eventSource.value.close()
        }

        eventSource.value = createEventStream(
            roomId,
            handleEvent,
            handleError,
            handleClose
        )
    }

    // 处理SSE事件
    const handleEvent = (event: any) => {
        console.log('处理游戏事件:', event)

        switch (event.type) {
            case 'connected':
                isConnected.value = true
                error.value = null
                break

            case 'room_state':
                updateGameState(event.data)
                break

            case 'player_joined':
                if (game.value) {
                    game.value.guest = {
                        userId: event.data.player.user_id,
                        username: event.data.player.username,
                        color: event.data.player.color,
                        isReady: true,
                        isOnline: true
                    }
                    game.value.opponentName = event.data.player.username
                    game.value.isReady = true
                    game.value.gameState.status = 'ready'
                }
                break

            case 'player_left':
                if (game.value && event.data.user_id === game.value.guest?.userId) {
                    game.value.guest = null
                    game.value.opponentName = null
                    game.value.isReady = false
                    game.value.gameState.status = 'waiting'
                }
                break

            case 'game_started':
                if (game.value) {
                    game.value.gameState.status = 'playing'
                    game.value.gameState.currentPlayer = event.data.current_player
                    if (event.data.board) {
                        game.value.gameState.board = event.data.board
                    }
                }
                break

            case 'move_made':
                if (game.value) {
                    const move = event.data.move
                    game.value.gameState.board[move.y][move.x] = move.color === 'black' ? 1 : 2
                    game.value.gameState.currentPlayer = event.data.current_player
                    game.value.gameState.lastMove = {x: move.x, y: move.y}
                    game.value.gameState.movesCount++
                }
                break

            case 'game_ended':
                if (game.value) {
                    game.value.gameState.status = 'finished'
                    game.value.gameState.winner = event.data.winner
                    const move = event.data.move
                    game.value.gameState.board[move.y][move.x] = move.color === 'black' ? 1 : 2
                    game.value.gameState.lastMove = {x: move.x, y: move.y}
                }
                break

            case 'error':
                error.value = event.message || '游戏错误'
                break

            case 'heartbeat':
                // 心跳事件，保持连接活跃
                break
        }
    }

    // 更新游戏状态
    const updateGameState = (roomData: any) => {
        if (!game.value) return

        game.value.host = {
            userId: roomData.host.user_id,
            username: roomData.host.username,
            color: roomData.host.color,
            isReady: roomData.host.is_ready,
            isOnline: roomData.host.is_online
        }

        if (roomData.guest) {
            game.value.guest = {
                userId: roomData.guest.user_id,
                username: roomData.guest.username,
                color: roomData.guest.color,
                isReady: roomData.guest.is_ready,
                isOnline: roomData.guest.is_online
            }
            game.value.opponentName = roomData.guest.username
            game.value.isReady = true
        } else {
            game.value.guest = null
            game.value.opponentName = null
            game.value.isReady = false
        }

        // 确定玩家颜色
        const currentUserId = localStorage.getItem('userId') || localStorage.getItem('user_id') // 尝试不同的key
        if (currentUserId === game.value.host.userId) {
            game.value.playerColor = game.value.host.color
        } else if (game.value.guest && currentUserId === game.value.guest.userId) {
            game.value.playerColor = game.value.guest.color
        }

        // 更新游戏状态
        game.value.gameState = {
            status: roomData.game_state.status,
            board: roomData.game_state.board,
            currentPlayer: roomData.game_state.current_player,
            winner: roomData.game_state.winner,
            lastMove: roomData.game_state.last_move,
            movesCount: roomData.game_state.moves_count
        }
    }

    // 处理错误
    const handleError = (errorEvent: Event) => {
        console.error('SSE连接错误:', errorEvent)
        isConnected.value = false
        error.value = '连接错误，请刷新页面重试'
    }

    // 处理连接关闭
    const handleClose = () => {
        console.log('SSE连接已关闭')
        isConnected.value = false
    }

    // 下棋
    const makeMove = async (x: number, y: number) => {
        if (!game.value || !game.value.isReady) {
            console.error('游戏未准备好')
            return false
        }

        try {
            await apiMakeMove(roomId, x, y)
            return true
    } catch (error) {
            console.error('下棋失败:', error)
            return false
        }
    }

    // 开始游戏
    const startGame = async () => {
        if (!game.value || !game.value.isReady) {
            console.error('游戏未准备好')
            return false
        }

        try {
            await apiStartGame(roomId)
            return true
        } catch (error) {
            console.error('开始游戏失败:', error)
            return false
    }
  }

    // 重新开始游戏
    const restartGame = async () => {
        if (!game.value) {
            console.error('游戏未初始化')
            return false
        }

        try {
            await apiRestartGame(roomId)
            return true
        } catch (error) {
            console.error('重新开始游戏失败:', error)
            return false
    }
  }

    // 离开游戏
    const leaveGame = async () => {
        try {
            await leaveGomokuRoom()
            if (eventSource.value) {
                eventSource.value.close()
                eventSource.value = null
      }
            isConnected.value = false
            game.value = null
        } catch (error) {
            console.error('离开游戏失败:', error)
    }
  }

    // 初始化
    initGame()
    startConnection()

    // 清理函数
    const cleanup = () => {
        if (eventSource.value) {
            eventSource.value.close()
            eventSource.value = null
        }
        isConnected.value = false
        game.value = null
  }

  return {
      game: computed(() => game.value),
      isConnected: computed(() => isConnected.value),
      error: computed(() => error.value),
    makeMove,
      startGame,
    restartGame,
      leaveGame,
      cleanup
  }
}
