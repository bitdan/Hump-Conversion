<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-2 sm:p-4">
    <h1 class="text-2xl sm:text-4xl font-bold mb-4 sm:mb-8">五子棋</h1>

    <!-- 在线对战控制 -->
    <div v-if="!isOnlineMode" class="mb-4 flex gap-4">
      <v-btn color="primary" @click="createRoom">
        创建对战房间
      </v-btn>
      <v-text-field
        v-model="inputRoomId"
        label="房间ID"
        placeholder="输入房间ID加入游戏"
        variant="outlined"
        hide-details
        class="max-w-xs"
      >
        <template v-slot:append>
          <v-btn
            color="primary"
            variant="text"
            :disabled="!inputRoomId"
            @click="joinRoom(inputRoomId)"
          >
            加入
          </v-btn>
        </template>
      </v-text-field>
    </div>

    <!-- 在线对战信息 -->
    <v-card v-if="isOnlineMode" class="mb-4 p-4 w-full max-w-2xl">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-lg font-bold mb-2">
            房间号: {{ roomId }}
            <v-btn
              variant="text"
              density="compact"
              @click="copyRoomId"
            >
              复制
            </v-btn>
          </div>
          <div v-if="activeOnlineGame?.opponentName" class="text-sm">
            对手: {{ activeOnlineGame.opponentName }}
            <span class="ml-2" :class="{ 'text-green-500': activeOnlineGame.isReady }">
              {{ activeOnlineGame.isReady ? '(已准备)' : '(未准备)' }}
            </span>
          </div>
          <div v-else class="text-sm text-gray-500">
            等待对手加入...
          </div>
          <div
              v-if="activeOnlineGame?.gameState.status === 'ready' && isRoomHost"
              class="mt-2">
            <v-btn color="success" size="small" @click="startGame">
              开始游戏
            </v-btn>
          </div>
          <div v-if="isOnlineConnected" class="text-xs text-green-500">
            连接状态: 已连接
          </div>
          <div v-else class="text-xs text-red-500">
            连接状态: 断开
          </div>
        </div>
        <v-btn color="error" variant="outlined" @click="leaveRoom">
          退出房间
        </v-btn>
      </div>
    </v-card>

    <!-- 游戏状态 -->
    <div class="mb-4 text-base sm:text-xl">
      <template v-if="isOnlineMode && activeOnlineGame">
        <template v-if="activeOnlineGame.gameState.winner">
          {{ activeOnlineGame.gameState.winner === 'black' ? '黑棋' : '白棋' }}胜利！
        </template>
        <template v-else>
          {{ activeOnlineGame.gameState.currentPlayer === 'black' ? '黑棋' : '白棋' }}回合
          <span v-if="activeOnlineGame.playerColor" class="ml-2">
            (你是{{ activeOnlineGame.playerColor === 'black' ? '黑棋' : '白棋' }})
          </span>
        </template>
      </template>
      <template v-else>
        <template v-if="winner">
          获胜者: {{ winner === 'black' ? '黑棋' : '白棋' }}
        </template>
        <template v-else>
          当前玩家: {{ currentPlayer === 'black' ? '黑棋' : '白棋' }}
        </template>
      </template>
    </div>

    <!-- 棋盘容器 -->
    <div
      class="relative bg-amber-100 rounded-lg shadow-lg p-[15px] sm:p-[30px] touch-none"
      :class="{ 'opacity-50': isOnlineMode && !activeOnlineGame?.isReady }"
      :style="{
        width: `${boardSize + (isMobile ? 30 : 60)}px`,
        height: `${boardSize + (isMobile ? 30 : 60)}px`
      }"
    >
      <!-- 棋盘网格线 -->
      <div class="absolute" :style="{ inset: `${isMobile ? '15px' : '30px'}` }">
        <div
          v-for="i in gridSize"
          :key="`h${i}`"
          class="absolute bg-gray-800"
          :style="{
            left: '0',
            right: '0',
            top: `${(i-1) * cellSize}px`,
            height: '1px'
          }"
        ></div>
        <div
          v-for="i in gridSize"
          :key="`v${i}`"
          class="absolute bg-gray-800"
          :style="{
            top: '0',
            bottom: '0',
            left: `${(i-1) * cellSize}px`,
            width: '1px'
          }"
        ></div>
      </div>

      <!-- 点击区域和棋子 -->
      <div class="absolute" :style="{ inset: `${isMobile ? '15px' : '30px'}` }">
        <div
          v-for="y in gridSize"
          :key="`row${y}`"
          class="absolute top-0 left-0 right-0"
        >
          <div
            v-for="x in gridSize"
            :key="`cell${x}`"
            class="absolute cursor-pointer"
            :style="{
              left: `${(x-1) * cellSize}px`,
              top: `${(y-1) * cellSize}px`,
              width: `${isMobile ? '20px' : '30px'}`,
              height: `${isMobile ? '20px' : '30px'}`,
              transform: 'translate(-50%, -50%)',
              cursor: canMove(x-1, y-1) ? 'pointer' : 'default'
            }"
            @click="makeMove(x-1, y-1)"
            @touchstart.prevent="makeMove(x-1, y-1)"
          >
            <div
                v-if="isOnlineMode ? getOnlineCellValue(x - 1, y - 1) !== 0 : board[y-1][x-1]"
              class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg"
              :style="{
                width: `${isMobile ? '16px' : '24px'}`,
                height: `${isMobile ? '16px' : '24px'}`
              }"
              :class="{
                'bg-gray-900': isOnlineMode ? getOnlineCellValue(x - 1, y - 1) === 1 : board[y-1][x-1] === 'black',
                'bg-white border-2 border-gray-900': isOnlineMode ? getOnlineCellValue(x - 1, y - 1) === 2 : board[y-1][x-1] === 'white'
              }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 最后落子标记 -->
      <div
          v-if="displayLastMove"
        class="absolute bg-red-500 rounded-full"
        :style="{
          width: `${isMobile ? '6px' : '8px'}`,
          height: `${isMobile ? '6px' : '8px'}`,
          left: `${(displayLastMove?.x || 0) * cellSize + (isMobile ? 15 : 30)}px`,
          top: `${(displayLastMove?.y || 0) * cellSize + (isMobile ? 15 : 30)}px`,
          transform: 'translate(-50%, -50%)'
        }"
      ></div>
    </div>

    <!-- 重新开始按钮 -->
    <button
      @click="resetGame"
      class="mt-4 sm:mt-8 px-4 sm:px-6 py-2 bg-blue-500 text-white text-sm sm:text-base rounded-lg hover:bg-blue-600 focus:outline-none"
      :disabled="isOnlineMode && (!activeOnlineGame?.isReady || !activeOnlineGame?.opponentName)"
    >
      重新开始
    </button>

    <!-- 在线模式退出按钮 -->
    <button
      v-if="isOnlineMode"
      @click="leaveRoom"
      class="mt-2 px-4 sm:px-6 py-2 border border-red-500 text-red-500 text-sm sm:text-base rounded-lg hover:bg-red-50 focus:outline-none"
    >
      退出对战
    </button>
  </div>
</template>

<script setup lang="ts">
import {computed, onUnmounted, ref, shallowRef, watch} from 'vue'
import {useAuthCheck} from '@/composables/useAuthCheck'
import {useGomokuGame} from '@/composables/useGomokuGame'
import {useMessage} from '@/composables/useMessage'
import {createGomokuRoom, joinGomokuRoom, leaveGomokuRoom} from '@/api/game'

const { withAuth } = useAuthCheck()
const { showSuccess, showError } = useMessage()

// 响应式布局
const isMobile = computed(() => window.innerWidth < 768)
const boardSize = computed(() => {
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight
  const minDimension = Math.min(screenWidth, screenHeight)
  return isMobile.value ? Math.min(320, minDimension - 80) : 560
})

// 棋盘配置
const gridSize = 15  // 15x15的交叉点
const cellSize = computed(() => boardSize.value / (gridSize - 1)) // 格子大小

// 游戏状态
const board = ref(Array(gridSize).fill(null).map(() => Array(gridSize).fill(null)))
const currentPlayer = ref<'black' | 'white'>('black')
const winner = ref<'black' | 'white' | null>(null)
const lastMove = ref<{x: number, y: number} | null>(null)

// 在线对战状态
const isOnlineMode = ref(false)
const roomId = ref<string | null>(null)
const inputRoomId = ref('')
const onlineGame = shallowRef<ReturnType<typeof useGomokuGame> | null>(null)
const activeOnlineGame = computed(() => onlineGame.value?.game.value ?? null)
const isOnlineConnected = computed(() => onlineGame.value?.isConnected.value ?? false)
const currentUserId = computed(() => localStorage.getItem('userId') || localStorage.getItem('user_id') || '')
const isRoomHost = computed(() => activeOnlineGame.value?.host.userId === currentUserId.value)
const displayLastMove = computed(() => (
    isOnlineMode.value
        ? activeOnlineGame.value?.gameState.lastMove ?? null
        : lastMove.value
))

function getOnlineCellValue(x: number, y: number): number {
  return activeOnlineGame.value?.gameState.board[y]?.[x] ?? 0
}

// 检查是否可以落子
const canMove = (x: number, y: number) => {
  if (isOnlineMode.value) {
    const gameData = activeOnlineGame.value
    return Boolean(gameData?.isReady &&
        !gameData?.gameState.winner &&
        getOnlineCellValue(x, y) === 0 &&
        gameData?.gameState.currentPlayer === gameData?.playerColor &&
        gameData?.opponentName)
  } else {
    return !winner.value && !board.value[y][x]
  }
}

// 检查是否获胜
const checkWinner = (x: number, y: number, player: 'black' | 'white') => {
  const directions = [
    [1, 0],   // 水平
    [0, 1],   // 垂直
    [1, 1],   // 对角线
    [1, -1]   // 反对角线
  ]

  for (const [dx, dy] of directions) {
    let count = 1

    // 正向检查
    for (let i = 1; i < 5; i++) {
      const newX = x + dx * i
      const newY = y + dy * i
      if (
        newX < 0 || newX >= gridSize ||
        newY < 0 || newY >= gridSize ||
        board.value[newY][newX] !== player
      ) break
      count++
    }

    // 反向检查
    for (let i = 1; i < 5; i++) {
      const newX = x - dx * i
      const newY = y - dy * i
      if (
        newX < 0 || newX >= gridSize ||
        newY < 0 || newY >= gridSize ||
        board.value[newY][newX] !== player
      ) break
      count++
    }

    if (count >= 5) return true
  }
  return false
}

// 落子
const makeMove = async (x: number, y: number) => {
  if (!canMove(x, y)) return

  if (isOnlineMode.value) {
    if (onlineGame.value) {
      await onlineGame.value.makeMove(x, y)
    }
    return
  }

  if (winner.value || board.value[y][x]) return

  board.value[y][x] = currentPlayer.value
  lastMove.value = {x, y}

  if (checkWinner(x, y, currentPlayer.value)) {
    winner.value = currentPlayer.value
    return
  }

  currentPlayer.value = currentPlayer.value === 'black' ? 'white' : 'black'
}

// 重置游戏
const resetGame = () => {
  if (isOnlineMode.value) {
    if (onlineGame.value) {
      onlineGame.value.restartGame()
    }
    return
  }

  board.value = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null))
  currentPlayer.value = 'black'
  winner.value = null
  lastMove.value = null
}

// 创建在线房间
async function createRoom() {
  await withAuth(async () => {
    try {
      const res = await createGomokuRoom()
      if (res.code === 200 && res.data) {
        roomId.value = res.data
        isOnlineMode.value = true
        showSuccess('房间创建成功')
      } else {
        showError(res.msg || '创建房间失败')
      }
    } catch (error: any) {
      console.error('创建房间错误:', error)
      showError(error.message || '创建房间失败，请重试')
    }
  })
}

// 加入在线房间
async function joinRoom(id: string) {
  await withAuth(async () => {
    try {
      const res = await joinGomokuRoom(id)
      if (res.code === 200) {
        roomId.value = id
        isOnlineMode.value = true
        showSuccess('加入房间成功')
      } else {
        showError(res.msg || '加入房间失败')
      }
    } catch (error: any) {
      console.error('加入房间错误:', error)
      showError(error.message || '加入房间失败，请检查房间号是否正确')
    }
  })
}

// 复制房间ID
function copyRoomId() {
  if (roomId.value) {
    // 尝试使用现代API
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(roomId.value).then(() => {
        showSuccess('房间ID已复制到剪贴板')
      }).catch(() => {
        if (roomId.value) {
          fallbackCopyTextToClipboard(roomId.value)
        }
      })
    } else {
      // 使用兼容性方法
      if (roomId.value) {
        fallbackCopyTextToClipboard(roomId.value)
      }
    }
  }
}

// 兼容性复制方法
function fallbackCopyTextToClipboard(text: string) {
  const textArea = document.createElement("textarea")
  textArea.value = text

  // 避免滚动到底部
  textArea.style.top = "0"
  textArea.style.left = "0"
  textArea.style.position = "fixed"
  textArea.style.opacity = "0"

  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    const successful = document.execCommand('copy')
    if (successful) {
      showSuccess('房间ID已复制到剪贴板')
    } else {
      showError('复制失败，请手动复制')
    }
  } catch (err) {
    console.error('复制失败:', err)
    showError('复制失败，请手动复制')
  }

  document.body.removeChild(textArea)
}

// 开始游戏
async function startGame() {
  if (onlineGame.value && roomId.value) {
    try {
      const success = await onlineGame.value.startGame()
      if (success) {
        showSuccess('游戏已开始')
      } else {
        showError('开始游戏失败')
      }
    } catch (error: any) {
      console.error('开始游戏错误:', error)
      showError('开始游戏失败，请重试')
    }
  }
}

// 离开房间
async function leaveRoom() {
  if (roomId.value) {
    try {
      const res = await leaveGomokuRoom()
      if (res.code === 200) {
        if (onlineGame.value) {
          onlineGame.value.leaveGame()
        }
        onlineGame.value = null
        roomId.value = null
        isOnlineMode.value = false
        resetGame()
        showSuccess('已退出房间')
      } else {
        showError(res.msg || '离开房间失败')
      }
    } catch (error: any) {
      console.error('离开房间错误:', error)
      showError(error.message || '退出房间失败，请重试')
    }
  }
}

// 监听房间ID变化，创建或销毁游戏实例
watch(roomId, (newRoomId) => {
  if (newRoomId) {
    onlineGame.value = useGomokuGame(newRoomId)
  } else {
    onlineGame.value = null
  }
})

// 组件卸载时清理资源
onUnmounted(() => {
  if (onlineGame.value) {
    onlineGame.value.cleanup()
  }
})
</script>

<style scoped>
@media (max-width: 768px) {
  .container {
    padding: 0.5rem;
  }
}
</style>
