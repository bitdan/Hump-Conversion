<template>
  <div class="container mx-auto p-5">
    <div class="flex flex-col items-center">
      <h1 class="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
        俄罗斯方块
      </h1>

      <div class="flex gap-8 items-start">
        <!-- 游戏主区域 -->
        <div class="relative">
          <!-- 游戏画布容器 -->
          <div class="relative p-4 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl shadow-xl">
            <canvas 
              ref="gameCanvas" 
              class="border-2 border-purple-200 rounded-xl shadow-inner bg-gradient-to-br from-gray-900 to-gray-800"
              :width="CANVAS_WIDTH"
              :height="CANVAS_HEIGHT"
            ></canvas>
          </div>

          <!-- 游戏结束提示 -->
          <div 
            v-if="gameOver" 
            class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-2xl"
          >
            <div class="text-white text-2xl font-bold animate-pulse">
              游戏结束
            </div>
          </div>
        </div>

        <!-- 游戏信息和控制区 -->
        <div class="flex flex-col gap-6">
          <!-- 分数显示 -->
          <div class="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-white px-6 py-2 rounded-full shadow-lg">
            分数: {{ score }}
          </div>

          <!-- 等级显示 -->
          <div class="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-white px-6 py-2 rounded-full shadow-lg">
            等级: {{ level }}
          </div>

          <!-- 下一个方块预览 -->
          <div class="p-4 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl shadow-lg">
            <div class="text-center mb-2 font-bold text-gray-700">下一个</div>
            <canvas 
              ref="previewCanvas" 
              class="border-2 border-purple-200 rounded-lg shadow-inner bg-gradient-to-br from-gray-900 to-gray-800"
              :width="PREVIEW_SIZE"
              :height="PREVIEW_SIZE"
            ></canvas>
          </div>

          <!-- 游戏控制按钮 -->
          <div class="flex flex-col gap-3">
            <v-btn 
              color="success" 
              @click="startGame" 
              :disabled="isPlaying && !gameOver"
              class="px-6"
            >
              {{ gameOver ? '重新开始' : '开始游戏' }}
            </v-btn>
            <v-btn 
              :color="isPaused ? 'warning' : 'error'" 
              @click="pauseGame" 
              :disabled="!isPlaying || gameOver"
              class="px-6"
            >
              {{ isPaused ? '继续' : '暂停' }}
            </v-btn>
          </div>

          <!-- 操作说明 -->
          <div class="bg-white p-4 rounded-xl shadow-lg">
            <div class="font-bold mb-2 text-gray-700">操作说明</div>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>← → : 左右移动</li>
              <li>↑ : 旋转</li>
              <li>↓ : 加速下落</li>
              <li>空格 : 直接落下</li>
              <li>P : 暂停/继续</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 移动端控制按钮 -->
      <div class="mt-8 grid grid-cols-4 gap-3 md:hidden w-[360px]">
        <v-btn 
          color="primary" 
          @click="moveLeft" 
          :disabled="!isPlaying || isPaused || gameOver"
          class="rounded-xl shadow-lg"
        >
          ←
        </v-btn>
        <v-btn 
          color="primary" 
          @click="rotate" 
          :disabled="!isPlaying || isPaused || gameOver"
          class="rounded-xl shadow-lg"
        >
          ↻
        </v-btn>
        <v-btn 
          color="primary" 
          @click="moveRight" 
          :disabled="!isPlaying || isPaused || gameOver"
          class="rounded-xl shadow-lg"
        >
          →
        </v-btn>
        <v-btn 
          color="primary" 
          @click="dropDown" 
          :disabled="!isPlaying || isPaused || gameOver"
          class="rounded-xl shadow-lg"
        >
          ↓
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 游戏常量
const CANVAS_WIDTH = 300
const CANVAS_HEIGHT = 600
const BLOCK_SIZE = 30
const PREVIEW_SIZE = 120
const COLS = CANVAS_WIDTH / BLOCK_SIZE
const ROWS = CANVAS_HEIGHT / BLOCK_SIZE
const INITIAL_SPEED = 800
const MIN_SPEED = 100
const SPEED_INCREASE = 0.85
const SPEED_UP_SCORE = 500

// 方块形状定义
const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  DOT: [[1]]
}

// 方块颜色
const COLORS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
  DOT: '#ffffff'
}

// 游戏状态
const gameCanvas = ref<HTMLCanvasElement | null>(null)
const previewCanvas = ref<HTMLCanvasElement | null>(null)
const isPlaying = ref(false)
const isPaused = ref(false)
const gameOver = ref(false)
const score = ref(0)
const level = ref(1)
const baseSpeed = ref(INITIAL_SPEED)
let gameLoop: number | null = null

// 游戏数据
const board = ref<number[][]>(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)))
const currentPiece = ref<{
  shape: number[][],
  color: string,
  x: number,
  y: number
} | null>(null)
const nextPiece = ref<{
  shape: number[][],
  color: string
} | null>(null)

// 生成新方块
function generatePiece() {
  const shapes = Object.keys(SHAPES)
  const type = Math.random() < 0.15 ? 'DOT' : shapes[Math.floor(Math.random() * (shapes.length - 1))]
  return {
    shape: SHAPES[type as keyof typeof SHAPES],
    color: COLORS[type as keyof typeof COLORS]
  }
}

// 初始化新方块
function spawnPiece() {
  if (!nextPiece.value) {
    nextPiece.value = generatePiece()
  }

  currentPiece.value = {
    ...nextPiece.value,
    x: Math.floor(COLS / 2) - Math.floor(nextPiece.value.shape[0].length / 2),
    y: 0
  }

  nextPiece.value = generatePiece()
  drawPreview()

  if (!isValidMove(0, 0)) {
    endGame()
  }
}

// 检查移动是否有效
function isValidMove(moveX: number, moveY: number, newShape?: number[][]) {
  if (!currentPiece.value) return false

  const shape = newShape || currentPiece.value.shape
  const newX = currentPiece.value.x + moveX
  const newY = currentPiece.value.y + moveY

  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const boardX = newX + x
        const boardY = newY + y

        if (
          boardX < 0 || 
          boardX >= COLS || 
          boardY >= ROWS ||
          (boardY >= 0 && board.value[boardY][boardX])
        ) {
          return false
        }
      }
    }
  }

  return true
}

// 旋转方块
function rotate() {
  if (!currentPiece.value) return

  const newShape = currentPiece.value.shape[0].map((_, i) => 
    currentPiece.value!.shape.map(row => row[i]).reverse()
  )

  if (isValidMove(0, 0, newShape)) {
    currentPiece.value.shape = newShape
    draw()
  }
}

// 移动方块
function moveLeft() {
  if (isValidMove(-1, 0)) {
    currentPiece.value!.x--
    draw()
  }
}

function moveRight() {
  if (isValidMove(1, 0)) {
    currentPiece.value!.x++
    draw()
  }
}

function moveDown(isAccelerated = false) {
  if (isValidMove(0, 1)) {
    currentPiece.value!.y++
    draw()
    if (isAccelerated) {
      score.value += 1
    }
    return true
  }
  return false
}

// 直接落下
function dropDown() {
  while (moveDown()) {}
  lockPiece()
}

// 锁定方块
function lockPiece() {
  if (!currentPiece.value) return

  for (let y = 0; y < currentPiece.value.shape.length; y++) {
    for (let x = 0; x < currentPiece.value.shape[y].length; x++) {
      if (currentPiece.value.shape[y][x]) {
        const boardY = currentPiece.value.y + y
        const boardX = currentPiece.value.x + x
        if (boardY >= 0) {
          board.value[boardY][boardX] = 1
        }
      }
    }
  }

  clearLines()
  spawnPiece()
}

// 清除完整行
function clearLines() {
  let linesCleared = 0
  let combo = 0

  for (let y = ROWS - 1; y >= 0; y--) {
    if (board.value[y].every(cell => cell)) {
      board.value.splice(y, 1)
      board.value.unshift(Array(COLS).fill(0))
      linesCleared++
      combo++
      y++
    }
  }

  if (linesCleared > 0) {
    const baseScore = [40, 100, 300, 1200][linesCleared - 1]
    const comboBonus = Math.floor(combo * 1.5)
    score.value += (baseScore * level.value) + comboBonus
    
    level.value = Math.floor(score.value / 1000) + 1
    
    updateSpeed()
  }
}

// 更新游戏速度
function updateSpeed() {
  if (!gameLoop) return
  
  const newBaseSpeed = Math.max(
    MIN_SPEED,
    INITIAL_SPEED * Math.pow(SPEED_INCREASE, Math.floor(score.value / SPEED_UP_SCORE))
  )
  
  if (newBaseSpeed !== baseSpeed.value) {
    baseSpeed.value = newBaseSpeed
    clearInterval(gameLoop)
    gameLoop = window.setInterval(gameStep, baseSpeed.value)
  }
}

// 游戏步进
function gameStep() {
  if (!isPlaying.value || isPaused.value || gameOver.value) return

  if (!moveDown()) {
    lockPiece()
  }
}

// 绘制游戏画面
function draw() {
  const ctx = gameCanvas.value?.getContext('2d')
  if (!ctx) return

  // 清空画布
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // 绘制网格
  ctx.strokeStyle = '#2a2a2a'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath()
    ctx.moveTo(x * BLOCK_SIZE, 0)
    ctx.lineTo(x * BLOCK_SIZE, CANVAS_HEIGHT)
    ctx.stroke()
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * BLOCK_SIZE)
    ctx.lineTo(CANVAS_WIDTH, y * BLOCK_SIZE)
    ctx.stroke()
  }

  // 绘制已固定的方块
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board.value[y][x]) {
        ctx.fillStyle = '#4a4a4a'
        ctx.shadowColor = '#6a6a6a'
        ctx.shadowBlur = 5
        ctx.fillRect(
          x * BLOCK_SIZE + 1,
          y * BLOCK_SIZE + 1,
          BLOCK_SIZE - 2,
          BLOCK_SIZE - 2
        )
      }
    }
  }

  // 绘制当前方块
  if (currentPiece.value) {
    ctx.fillStyle = currentPiece.value.color
    ctx.shadowColor = currentPiece.value.color
    ctx.shadowBlur = 10
    
    for (let y = 0; y < currentPiece.value.shape.length; y++) {
      for (let x = 0; x < currentPiece.value.shape[y].length; x++) {
        if (currentPiece.value.shape[y][x]) {
          ctx.fillRect(
            (currentPiece.value.x + x) * BLOCK_SIZE + 1,
            (currentPiece.value.y + y) * BLOCK_SIZE + 1,
            BLOCK_SIZE - 2,
            BLOCK_SIZE - 2
          )
        }
      }
    }
  }
}

// 绘制预览
function drawPreview() {
  const ctx = previewCanvas.value?.getContext('2d')
  if (!ctx || !nextPiece.value) return

  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)

  const blockSize = PREVIEW_SIZE / 4
  const offsetX = (PREVIEW_SIZE - nextPiece.value.shape[0].length * blockSize) / 2
  const offsetY = (PREVIEW_SIZE - nextPiece.value.shape.length * blockSize) / 2

  ctx.fillStyle = nextPiece.value.color
  ctx.shadowColor = nextPiece.value.color
  ctx.shadowBlur = 10

  for (let y = 0; y < nextPiece.value.shape.length; y++) {
    for (let x = 0; x < nextPiece.value.shape[y].length; x++) {
      if (nextPiece.value.shape[y][x]) {
        ctx.fillRect(
          offsetX + x * blockSize + 1,
          offsetY + y * blockSize + 1,
          blockSize - 2,
          blockSize - 2
        )
      }
    }
  }
}

// 开始游戏
function startGame() {
  board.value = Array(ROWS).fill(null).map(() => Array(COLS).fill(0))
  score.value = 0
  level.value = 1
  baseSpeed.value = INITIAL_SPEED
  isPlaying.value = true
  gameOver.value = false
  isPaused.value = false

  spawnPiece()
  draw()

  if (gameLoop) clearInterval(gameLoop)
  gameLoop = window.setInterval(gameStep, baseSpeed.value)
}

// 暂停游戏
function pauseGame() {
  isPaused.value = !isPaused.value
}

// 结束游戏
function endGame() {
  gameOver.value = true
  isPlaying.value = false
  if (gameLoop) {
    clearInterval(gameLoop)
    gameLoop = null
  }
}

// 键盘控制
function handleKeydown(event: KeyboardEvent) {
  if (!isPlaying.value || isPaused.value || gameOver.value) {
    if (event.key === ' ' || event.key.toLowerCase() === 'p') {
      event.preventDefault()
      if (gameOver.value) {
        startGame()
      } else if (isPlaying.value) {
        pauseGame()
      }
    }
    return
  }

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      moveLeft()
      break
    case 'ArrowRight':
      event.preventDefault()
      moveRight()
      break
    case 'ArrowUp':
      event.preventDefault()
      rotate()
      break
    case 'ArrowDown':
      event.preventDefault()
      moveDown(true)
      break
    case ' ':
      event.preventDefault()
      dropDown()
      break
    case 'p':
    case 'P':
      event.preventDefault()
      pauseGame()
      break
  }
}

// 生命周期钩子
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  draw()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (gameLoop) {
    clearInterval(gameLoop)
  }
})
</script>

<style scoped>
canvas {
  image-rendering: pixelated;
  transition: transform 0.2s ease;
}

canvas:hover {
  transform: scale(1.01);
}
</style> 