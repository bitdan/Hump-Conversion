import {ref} from 'vue'
import {useUserStore} from '../stores/user'
import {useMessage} from './useMessage'
import {useRouter} from 'vue-router'
import {useWebSocket} from '../hooks/useWebSocket'

interface GameState {
  board: number[][]
  currentPlayer: 'black' | 'white'
  winner: 'black' | 'white' | null
  lastMove: { x: number; y: number } | null
}

export function useGomokuGame(roomId: string) {
  const { showError } = useMessage()
  const userStore = useUserStore()
  const router = useRouter()

  const gameState = ref<GameState>({
    board: Array(15).fill(0).map(() => Array(15).fill(0)),
    currentPlayer: 'black',
    winner: null,
    lastMove: null
  })

  const playerColor = ref<'black' | 'white' | null>(null)
  const opponentName = ref<string | null>(null)
  const isReady = ref(false)

  const { connect, disconnect, send, onMessage, isConnected } = useWebSocket(`/ws/gomoku/${roomId}`)

  // 连接WebSocket
  connect()

  // 处理消息
  onMessage((event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('收到WebSocket消息:', data)

      switch (data.type) {
        case 'GAME_STATE':
          gameState.value = data.data
          break
        case 'PLAYER_INFO':
          playerColor.value = data.data.color
          break
        case 'OPPONENT_JOIN':
          opponentName.value = data.data.username
          isReady.value = true
          break
        case 'OPPONENT_LEAVE':
          opponentName.value = null
          isReady.value = false
          break
        case 'ERROR':
          showError(data.data.message)
          // 如果是token过期，跳转到登录页
          if (data.data.message === 'invalid token') {
            userStore.clearUserInfo()
            router.push('/login')
          }
          break
        default:
          console.warn('收到未知类型的消息:', data.type)
      }
    } catch (error) {
      console.error('处理WebSocket消息失败:', error)
    }
  })

  // 发送加入消息
  if (isConnected.value) {
    const joinMessage = {
      type: 'JOIN',
      roomId,
      data: {
        userId: userStore.userId,
        username: userStore.username
      }
    }
    console.log('发送加入消息:', joinMessage)
    send(joinMessage)
  }

  const makeMove = (x: number, y: number) => {
    if (isConnected.value) {
      const moveMessage = {
        type: 'MOVE',
        roomId,
        data: {
          x,
          y,
          player: playerColor.value
        }
      }
      console.log('发送移动消息:', moveMessage)
      send(moveMessage)
    } else {
      console.warn('WebSocket未连接，无法发送移动')
      showError('游戏未连接')
    }
  }

  const restartGame = () => {
    if (isConnected.value) {
      const restartMessage = {
        type: 'RESTART',
        roomId,
        data: {}
      }
      console.log('发送重启消息:', restartMessage)
      send(restartMessage)
    } else {
      console.warn('WebSocket未连接，无法重启游戏')
      showError('游戏未连接')
    }
  }

  const leaveGame = () => {
    if (isConnected.value) {
      const leaveMessage = {
        type: 'LEAVE',
        roomId,
        data: {}
      }
      console.log('发送离开消息:', leaveMessage)
      send(leaveMessage)
      disconnect()
    }
  }

  return {
    gameState,
    playerColor,
    opponentName,
    isReady,
    makeMove,
    restartGame,
    leaveGame
  }
}
