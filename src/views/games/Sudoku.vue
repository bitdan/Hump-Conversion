<template>
  <div class="container mx-auto p-5">
    <div class="flex flex-col items-center">
      <h1 class="text-4xl font-bold mb-8 bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
        数独
      </h1>

      <!-- 控制区 -->
      <div class="flex gap-4 mb-6">
        <v-btn
            color="success"
            @click="startGame"
            :disabled="isPlaying"
            class="px-6"
        >
          开始游戏
        </v-btn>
        <v-btn
            :color="isPaused ? 'warning' : 'error'"
            @click="pauseGame"
            :disabled="!isPlaying"
            class="px-6"
        >
          {{ isPaused ? '继续' : '暂停' }}
        </v-btn>
        <v-btn
            color="primary"
            @click="resetGame"
            class="px-6"
        >
          重置
        </v-btn>
      </div>

      <!-- 状态显示 -->
      <div class="flex gap-6 mb-4 text-xl font-bold">
        <div class="bg-gradient-to-r from-green-400 to-blue-400 text-white px-6 py-2 rounded-full shadow-lg">
          计时: {{ formattedTime }}
        </div>
        <div class="bg-gradient-to-r from-rose-400 to-red-400 text-white px-6 py-2 rounded-full shadow-lg">
          错误: {{ mistakes }}/3
        </div>
      </div>

      <!-- 游戏结束提示 -->
      <div v-if="gameOver" class="mb-4 text-red-600 text-xl font-bold animate-pulse">
        游戏结束
      </div>
      <div v-else-if="isCompleted" class="mb-4 text-green-600 text-xl font-bold animate-pulse">
        恭喜完成！
      </div>

      <!-- 棋盘 -->
      <div class="relative p-4 bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl shadow-xl">
        <div class="grid grid-cols-9 gap-[2px] bg-gray-700 p-[2px] rounded-xl">
          <div
              v-for="(cell, idx) in flatBoard"
              :key="idx"
              class="relative bg-gray-900 rounded-lg overflow-hidden"
              :class="{
              'ring-2 ring-yellow-400': selectedIndex === idx,
              'opacity-60': cell.fixed
            }"
              :style="squareStyle(idx)"
              @click="selectCell(idx)"
          >
            <div
                class="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center text-white text-xl sm:text-2xl select-none"
                :class="{
                'text-green-400': !cell.fixed && cell.value,
                'text-gray-300': cell.fixed,
                'text-rose-400': cell.isError
              }"
            >
              {{ cell.value || '' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 数字输入 -->
      <div class="mt-6 grid grid-cols-5 sm:grid-cols-9 gap-3 w-full max-w-md">
        <v-btn
            v-for="n in 9"
            :key="`n-${n}`"
            color="primary"
            class="rounded-xl shadow-lg"
            :disabled="!isPlaying || isPaused || selectedIndex === null"
            @click="fillNumber(n)"
        >
          {{ n }}
        </v-btn>
        <v-btn
            color="warning"
            class="rounded-xl shadow-lg col-span-2"
            :disabled="!isPlaying || isPaused || selectedIndex === null"
            @click="eraseCell"
        >
          擦除
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'

type Cell = {
  value: number | null
  fixed: boolean
  isError?: boolean
}

const isPlaying = ref(false)
const isPaused = ref(false)
const gameOver = ref(false)
const mistakes = ref(0)
const selectedIndex = ref<number | null>(null)

// 计时
const elapsedMs = ref(0)
let timer: number | null = null
const formattedTime = computed(() => {
  const total = Math.floor(elapsedMs.value / 1000)
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
})

// 棋盘与解
const board = ref<Cell[][]>([])
const solution = ref<number[][]>([])

const flatBoard = computed(() => board.value.flat())

// 初始化一个简易题目（中等难度预置一组）
// 基础解（用于变换）
const BASE_SOLUTION: number[][] = [
  [4, 3, 5, 2, 6, 9, 7, 8, 1],
  [6, 8, 2, 5, 7, 1, 4, 9, 3],
  [1, 9, 7, 8, 3, 4, 5, 6, 2],
  [8, 2, 6, 1, 9, 5, 3, 4, 7],
  [3, 7, 4, 6, 8, 2, 9, 1, 5],
  [9, 5, 1, 7, 4, 3, 6, 2, 8],
  [5, 1, 9, 3, 2, 6, 8, 7, 4],
  [2, 4, 8, 9, 5, 7, 1, 3, 6],
  [7, 6, 3, 4, 1, 8, 2, 5, 9]
]

function cloneGrid(grid: number[][]): number[][] {
  return grid.map(r => r.slice())
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function permuteDigits(grid: number[][]): number[][] {
  const mapping = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
  const mapDigit = (d: number) => mapping[d - 1]
  return grid.map(row => row.map(mapDigit))
}

function permuteRows(grid: number[][]): number[][] {
  // 先在每个 band(0-2,3-5,6-8) 内打乱行，再打乱 band 顺序
  const bands = [0, 1, 2]
  const bandRows = bands.map(b => shuffle([0, 1, 2]).map(i => b * 3 + i))
  const bandOrder = shuffle([0, 1, 2])
  const newOrder = bandOrder.flatMap(bi => bandRows[bi])
  return newOrder.map(i => grid[i])
}

function permuteCols(grid: number[][]): number[][] {
  // 列的操作与行同理
  const bands = [0, 1, 2]
  const stackCols = bands.map(b => shuffle([0, 1, 2]).map(i => b * 3 + i))
  const stackOrder = shuffle([0, 1, 2])
  const newOrder = stackOrder.flatMap(bi => stackCols[bi])
  const res: number[][] = grid.map(() => new Array(9).fill(0))
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      res[r][c] = grid[r][newOrder[c]]
    }
  }
  return res
}

function generateRandomSolved(): number[][] {
  let g = cloneGrid(BASE_SOLUTION)
  g = permuteDigits(g)
  g = permuteRows(g)
  g = permuteCols(g)
  return g
}

function generatePuzzleFromSolved(solved: number[][], removeCount = 45): number[][] {
  const puzzle = solved.map(r => r.slice())
  // 随机移除指定数量的格子
  const cells = Array.from({length: 81}, (_, i) => i)
  const order = shuffle(cells)
  for (let k = 0; k < removeCount && k < order.length; k++) {
    const idx = order[k]
    const y = Math.floor(idx / 9)
    const x = idx % 9
    puzzle[y][x] = 0
  }
  return puzzle
}

function newPuzzle() {
  const solved = generateRandomSolved()
  // 可调整挖空数量以控制难度：35(简单) ~ 55(较难)
  const puzzle = generatePuzzleFromSolved(solved, 45)
  solution.value = solved
  board.value = puzzle.map(row => row.map(v => ({value: v || null, fixed: v !== 0})))
}

const isCompleted = computed(() => {
  return board.value.length === 9 && board.value.every((row, y) =>
      row.every((cell, x) => cell.value === solution.value[y][x])
  )
})

function squareStyle(idx: number) {
  const x = idx % 9
  const y = Math.floor(idx / 9)
  const thick = 'border-2 border-gray-700'
  const normal = 'border border-gray-800'
  const cls = [
    (x % 3 === 0 ? thick : normal),
    (y % 3 === 0 ? thick : normal)
  ]
  return {}
}

function selectCell(idx: number) {
  if (!isPlaying.value || isPaused.value || gameOver.value) return
  const cell = flatBoard.value[idx]
  if (cell.fixed) return
  selectedIndex.value = idx
}

function fillNumber(n: number) {
  if (selectedIndex.value === null) return
  const x = selectedIndex.value % 9
  const y = Math.floor(selectedIndex.value / 9)
  const correct = solution.value[y][x]

  const cell = board.value[y][x]
  if (cell.fixed) return

  if (n === correct) {
    cell.value = n
    cell.isError = false
  } else {
    cell.isError = true
    mistakes.value += 1
    if (mistakes.value >= 3) {
      endGame()
    }
  }
}

function eraseCell() {
  if (selectedIndex.value === null) return
  const x = selectedIndex.value % 9
  const y = Math.floor(selectedIndex.value / 9)
  const cell = board.value[y][x]
  if (cell.fixed) return
  cell.value = null
  cell.isError = false
}

function startTimer() {
  if (timer) window.clearInterval(timer)
  const start = Date.now() - elapsedMs.value
  timer = window.setInterval(() => {
    if (!isPaused.value && isPlaying.value && !gameOver.value && !isCompleted.value) {
      elapsedMs.value = Date.now() - start
    }
  }, 200)
}

function startGame() {
  isPlaying.value = true
  isPaused.value = false
  gameOver.value = false
  mistakes.value = 0
  selectedIndex.value = null
  elapsedMs.value = 0
  newPuzzle()
  startTimer()
}

function pauseGame() {
  if (!isPlaying.value) return
  isPaused.value = !isPaused.value
}

function resetGame() {
  isPlaying.value = false
  isPaused.value = false
  gameOver.value = false
  mistakes.value = 0
  selectedIndex.value = null
  elapsedMs.value = 0
  board.value = []
  solution.value = []
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}

function endGame() {
  gameOver.value = true
  isPlaying.value = false
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}

onMounted(() => {
  // 进入页面即开始计时与游戏
  startGame()
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<style scoped>
.grid > div {
  transition: transform 0.12s ease;
}

.grid > div:hover {
  transform: scale(1.02);
}
</style>


