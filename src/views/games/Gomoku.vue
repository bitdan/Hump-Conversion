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
          <div v-if="game?.opponentName" class="text-sm">
            对手: {{ game.opponentName }}
            <span class="ml-2" :class="{ 'text-green-500': game.isReady }">
              {{ game.isReady ? '(已准备)' : '(未准备)' }}
            </span>
          </div>
          <div v-else class="text-sm text-gray-500">
            等待对手加入...
          </div>
        </div>
        <v-btn color="error" variant="outlined" @click="leaveRoom">
          退出房间
        </v-btn>
      </div>
    </v-card>

    <!-- 游戏状态 -->
    <div class="mb-4 text-base sm:text-xl">
      <template v-if="isOnlineMode && game">
        <template v-if="game.gameState.winner">
          {{ game.gameState.winner === 'black' ? '黑棋' : '白棋' }}胜利！
        </template>
        <template v-else>
          {{ game.gameState.currentPlayer === 'black' ? '黑棋' : '白棋' }}回合
          <span v-if="game.playerColor" class="ml-2">
            (你是{{ game.playerColor === 'black' ? '黑棋' : '白棋' }})
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
      :class="{ 'opacity-50': isOnlineMode && !game?.isReady }"
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
              v-if="isOnlineMode ? game?.gameState.board[y-1][x-1] !== 0 : board[y-1][x-1]"
              class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg"
              :style="{
                width: `${isMobile ? '16px' : '24px'}`,
                height: `${isMobile ? '16px' : '24px'}`
              }"
              :class="{
                'bg-gray-900': isOnlineMode ? game?.gameState.board[y-1][x-1] === 1 : board[y-1][x-1] === 'black',
                'bg-white border-2 border-gray-900': isOnlineMode ? game?.gameState.board[y-1][x-1] === 2 : board[y-1][x-1] === 'white'
              }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 最后落子标记 -->
      <div
        v-if="isOnlineMode ? game?.gameState.lastMove : lastMove"
        class="absolute bg-red-500 rounded-full"
        :style="{
          width: `${isMobile ? '6px' : '8px'}`,
          height: `${isMobile ? '6px' : '8px'}`,
          left: `${((isOnlineMode && game?.gameState.lastMove?.x !== undefined) ? game.gameState.lastMove.x : lastMove?.x || 0) * cellSize + (isMobile ? 15 : 30)}px`,
          top: `${((isOnlineMode && game?.gameState.lastMove?.y !== undefined) ? game.gameState.lastMove.y : lastMove?.y || 0) * cellSize + (isMobile ? 15 : 30)}px`,
          transform: 'translate(-50%, -50%)'
        }"
      ></div>
    </div>

    <!-- 重新开始按钮 -->
    <button
      @click="resetGame"
      class="mt-4 sm:mt-8 px-4 sm:px-6 py-2 bg-blue-500 text-white text-sm sm:text-base rounded-lg hover:bg-blue-600 focus:outline-none"
      :disabled="isOnlineMode && (!game?.isReady || !game?.opponentName)"
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
import {computed, ref} from 'vue'
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
const game = ref<ReturnType<typeof useGomokuGame> | null>(null)

// 检查是否可以落子
const canMove = (x: number, y: number) => {
  if (isOnlineMode.value) {
    return game.value?.isReady &&
           !game.value.gameState.winner &&
           game.value.gameState.board[y][x] === 0 &&
           game.value.gameState.currentPlayer === game.value.playerColor &&
           game.value.opponentName
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
const makeMove = (x: number, y: number) => {
  if (isOnlineMode.value) {
    if (game.value) {
      game.value.makeMove(x, y)
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
    if (game.value) {
      game.value.restartGame()
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
      console.log('开始创建房间')
      const res = await createGomokuRoom()
      console.log('创建房间响应:', res)
      if (res.code === 200 && res.data) {
        roomId.value = res.data
        isOnlineMode.value = true
        game.value = useGomokuGame(res.data)
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
      console.log('开始加入房间:', id)
      const res = await joinGomokuRoom(id)
      console.log('加入房间响应:', res)
      if (res.code === 200) {
        roomId.value = id
        isOnlineMode.value = true
        game.value = useGomokuGame(id)
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
    navigator.clipboard.writeText(roomId.value)
    showSuccess('房间ID已复制到剪贴板')
  }
}

// 离开房间
async function leaveRoom() {
  if (roomId.value) {
    try {
      console.log('开始离开房间:', roomId.value)
      const res = await leaveGomokuRoom(roomId.value)
      console.log('离开房间响应:', res)
      if (res.code === 200) {
        if (game.value) {
          game.value.leaveGame()
          game.value = null
        }
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
</script>

<style scoped>
@media (max-width: 768px) {
  .container {
    padding: 0.5rem;
  }
}
</style>
