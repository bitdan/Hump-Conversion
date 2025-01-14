import { ref, computed } from 'vue'
import { useWebSocket } from '@vueuse/core'

export interface GameState {
  board: number[][]
  currentPlayer: 'black' | 'white'
  winner: 'black' | 'white' | null
  lastMove: { x: number; y: number } | null
}

export function useGomokuGame(roomId: string) {
  // 连接WebSocket
  const { status, data, send } = useWebSocket(`${import.meta.env.VITE_WS_URL}/gomoku/${roomId}`)

  // 游戏状态
  const gameState = ref<GameState>({
    board: Array(15).fill(null).map(() => Array(15).fill(0)),
    currentPlayer: 'black',
    winner: null,
    lastMove: null
  })

  // 玩家信息
  const playerColor = ref<'black' | 'white' | null>(null)
  const opponentName = ref<string | null>(null)
  const isMyTurn = computed(() => gameState.value.currentPlayer === playerColor.value)

  // 处理接收到的消息
  const onMessage = (event: MessageEvent) => {
    const message = JSON.parse(event.data)
    
    switch (message.type) {
      case 'gameState':
        gameState.value = message.data
        break
      case 'playerAssigned':
        playerColor.value = message.color
        break
      case 'opponentJoined':
        opponentName.value = message.name
        break
      case 'opponentLeft':
        opponentName.value = null
        break
    }
  }

  // 下棋
  const makeMove = (x: number, y: number) => {
    if (!isMyTurn.value || gameState.value.winner || gameState.value.board[y][x] !== 0) {
      return false
    }

    send(JSON.stringify({
      type: 'move',
      data: { x, y }
    }))

    return true
  }

  // 重新开始游戏
  const restartGame = () => {
    send(JSON.stringify({ type: 'restart' }))
  }

  // 离开游戏
  const leaveGame = () => {
    send(JSON.stringify({ type: 'leave' }))
  }

  return {
    status,
    gameState,
    playerColor,
    opponentName,
    isMyTurn,
    makeMove,
    restartGame,
    leaveGame
  }
} 