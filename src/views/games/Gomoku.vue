<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-2 sm:p-4">
    <h1 class="text-2xl sm:text-4xl font-bold mb-4 sm:mb-8">五子棋</h1>

    <!-- 游戏状态 -->
    <div class="mb-4 text-base sm:text-xl">
      <p v-if="winner">获胜者: {{ winner === 'black' ? '黑棋' : '白棋' }}</p>
      <p v-else>当前玩家: {{ currentPlayer === 'black' ? '黑棋' : '白棋' }}</p>
    </div>

    <!-- 棋盘容器 -->
    <div
        class="relative bg-amber-100 rounded-lg shadow-lg p-[15px] sm:p-[30px] touch-none"
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
                cursor: !board[y-1][x-1] && !winner ? 'pointer' : 'default'
              }"
              @click="makeMove(x-1, y-1)"
              @touchstart.prevent="makeMove(x-1, y-1)"
          >
            <div
                v-if="board[y-1][x-1]"
                class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg"
                :style="{
                  width: `${isMobile ? '16px' : '24px'}`,
                  height: `${isMobile ? '16px' : '24px'}`
                }"
                :class="{
                  'bg-gray-900': board[y-1][x-1] === 'black',
                  'bg-white border-2 border-gray-900': board[y-1][x-1] === 'white'
                }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 最后落子标记 -->
      <div
          v-if="lastMove"
          class="absolute bg-red-500 rounded-full"
          :style="{
            width: `${isMobile ? '6px' : '8px'}`,
            height: `${isMobile ? '6px' : '8px'}`,
            left: `${lastMove.x * cellSize + (isMobile ? 15 : 30)}px`,
            top: `${lastMove.y * cellSize + (isMobile ? 15 : 30)}px`,
            transform: 'translate(-50%, -50%)'
          }"
      ></div>
    </div>

    <!-- 重新开始按钮 -->
    <button
        @click="resetGame"
        class="mt-4 sm:mt-8 px-4 sm:px-6 py-2 bg-blue-500 text-white text-sm sm:text-base rounded-lg hover:bg-blue-600 focus:outline-none"
    >
      重新开始
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

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
  board.value = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null))
  currentPlayer.value = 'black'
  winner.value = null
  lastMove.value = null
}
</script>

<style scoped>
@media (max-width: 768px) {
  .container {
    padding: 0.5rem;
  }
}
</style>
