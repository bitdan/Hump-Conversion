import {onMounted, onUnmounted, ref} from 'vue'
import {useUserStore} from '@/store/user'
import {useWebSocket} from '@/hooks/useWebSocket'
import {useMessage} from '@/composables/useMessage'

export interface GameState {
  board: number[][]
  currentPlayer: 'black' | 'white'
  winner: 'black' | 'white' | null
  lastMove: { x: number; y: number } | null
}

export function useGomokuGame(roomId: string) {
  const userStore = useUserStore()
  const { showError } = useMessage()

  const gameState = ref<GameState>({
    board: Array(15).fill(0).map(() => Array(15).fill(0)),
    currentPlayer: 'black',
    winner: null,
    lastMove: null
  })
  const playerColor = ref<'black' | 'white' | null>(null)
  const opponentName = ref<string | null>(null)
  const isReady = ref(false)

  const { connect, disconnect, send, onMessage } = useWebSocket(`/ws/gomoku?token=${userStore.token}`)

  const handleJoin = (data: any) => {
    const { userId, username } = data
    if (userId !== userStore.userId) {
      opponentName.value = username
      // 分配颜色：房主是黑棋，加入者是白棋
      playerColor.value = playerColor.value || 'white'
    } else {
      playerColor.value = playerColor.value || 'black'
    }
    isReady.value = true
  }

  const handleMove = (data: any) => {
    const { x, y, player } = data
    if (x >= 0 && x < 15 && y >= 0 && y < 15) {
      gameState.value.board[y][x] = player === 'black' ? 1 : 2
      gameState.value.lastMove = { x, y }
      gameState.value.currentPlayer = player === 'black' ? 'white' : 'black'

      if (data.winner) {
        gameState.value.winner = data.winner
      }
    }
  }

  const handleLeave = (data: any) => {
    const { userId } = data
    if (userId !== userStore.userId) {
      opponentName.value = null
      isReady.value = false
    }
  }

  const handleRestart = () => {
    gameState.value = {
      board: Array(15).fill(0).map(() => Array(15).fill(0)),
      currentPlayer: 'black',
      winner: null,
      lastMove: null
    }
  }

  onMessage((event: MessageEvent) => {
    const message = JSON.parse(event.data)

    switch (message.type) {
      case 'JOIN':
        handleJoin(message.data)
        break
      case 'MOVE':
        handleMove(message.data)
        break
      case 'LEAVE':
        handleLeave(message.data)
        break
      case 'RESTART':
        handleRestart()
        break
      case 'ERROR':
        showError(message.data.message)
        break
    }
  })

  const makeMove = (x: number, y: number) => {
    if (
      !isReady.value ||
      gameState.value.winner ||
      gameState.value.board[y][x] !== 0 ||
      gameState.value.currentPlayer !== playerColor.value ||
      !opponentName.value
    ) {
      return
    }

    send({
      type: 'MOVE',
      roomId,
      data: { x, y, player: playerColor.value }
    })
  }

  const restartGame = () => {
    if (!isReady.value) return

    send({
      type: 'RESTART',
      roomId,
      data: {}
    })
  }

  const leaveGame = () => {
    send({
      type: 'LEAVE',
      roomId,
      data: {}
    })
    disconnect()
  }

  onMounted(() => {
    connect()
    send({
      type: 'JOIN',
      roomId,
      data: {}
    })
  })

  onUnmounted(() => {
    leaveGame()
  })

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
