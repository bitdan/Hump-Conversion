<template>
  <div class="container mx-auto p-5">
    <div class="flex flex-col items-center">
      <h1 class="text-4xl font-bold mb-8 bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
        贪吃蛇
      </h1>

      <!-- 游戏控制区 -->
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
      </div>

      <!-- 分数显示 -->
      <div class="mb-4 text-xl font-bold bg-gradient-to-r from-green-400 to-blue-400 text-white px-6 py-2 rounded-full shadow-lg">
        分数: {{ score }}
      </div>

      <!-- 游戏结束提示 -->
      <div v-if="gameOver" class="mb-4 text-red-600 text-xl font-bold animate-pulse">
        游戏结束
      </div>

      <!-- 游戏画布容器 -->
      <div class="relative p-4 bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl shadow-xl">
        <canvas 
          ref="gameCanvas" 
          class="border-2 border-green-200 rounded-xl shadow-inner bg-gradient-to-br from-gray-900 to-gray-800"
          :width="CANVAS_SIZE"
          :height="CANVAS_SIZE"
        ></canvas>
      </div>

      <!-- 移动端控制按钮 -->
      <div class="mt-8 grid grid-cols-3 gap-3 md:hidden w-[280px]">
        <div></div>
        <v-btn 
          color="primary" 
          @click="changeDirection('up')" 
          :disabled="!isPlaying || isPaused"
          class="rounded-xl shadow-lg"
        >
          ↑
        </v-btn>
        <div></div>
        <v-btn 
          color="primary" 
          @click="changeDirection('left')" 
          :disabled="!isPlaying || isPaused"
          class="rounded-xl shadow-lg"
        >
          ←
        </v-btn>
        <v-btn 
          color="primary" 
          @click="changeDirection('down')" 
          :disabled="!isPlaying || isPaused"
          class="rounded-xl shadow-lg"
        >
          ↓
        </v-btn>
        <v-btn 
          color="primary" 
          @click="changeDirection('right')" 
          :disabled="!isPlaying || isPaused"
          class="rounded-xl shadow-lg"
        >
          →
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 游戏常量
const CANVAS_SIZE = 400
const GRID_SIZE = 20
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE
const INITIAL_SNAKE_LENGTH = 3
const GAME_SPEED = 150

// 方向类型
type Direction = 'up' | 'down' | 'left' | 'right'

// 坐标类型
type Position = {
  x: number
  y: number
}

// 状态变量
const gameCanvas = ref<HTMLCanvasElement | null>(null)
const snake = ref<Position[]>([])
const food = ref<Position>({ x: 0, y: 0 })
const direction = ref<Direction>('right')
const nextDirection = ref<Direction>('right')
const isPlaying = ref(false)
const isPaused = ref(false)
const gameOver = ref(false)
const score = ref(0)
let gameLoop: number | null = null

// 初始化蛇的位置
function initializeSnake() {
  snake.value = []
  const startX = Math.floor(GRID_SIZE / 4)
  const startY = Math.floor(GRID_SIZE / 2)
  
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    snake.value.push({ x: startX - i, y: startY })
  }
}

// 生成食物
function generateFood() {
  let newFood: Position
  do {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    }
  } while (snake.value.some(segment => segment.x === newFood.x && segment.y === newFood.y))
  
  food.value = newFood
}

// 绘制游戏画面
function draw() {
  const ctx = gameCanvas.value?.getContext('2d')
  if (!ctx) return

  // 清空画布并绘制网格背景
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // 绘制网格线
  ctx.strokeStyle = '#2a2a2a'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath()
    ctx.moveTo(i * CELL_SIZE, 0)
    ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(0, i * CELL_SIZE)
    ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE)
    ctx.stroke()
  }

  // 绘制蛇身 - 使用渐变色
  snake.value.forEach((segment, index) => {
    const gradient = ctx.createLinearGradient(
      segment.x * CELL_SIZE,
      segment.y * CELL_SIZE,
      (segment.x + 1) * CELL_SIZE,
      (segment.y + 1) * CELL_SIZE
    )

    if (index === 0) {
      // 蛇头使用特殊的渐变色
      gradient.addColorStop(0, '#4ade80')
      gradient.addColorStop(1, '#22c55e')
    } else {
      // 蛇身使用渐变色
      gradient.addColorStop(0, '#22c55e')
      gradient.addColorStop(1, '#16a34a')
    }

    ctx.fillStyle = gradient
    ctx.shadowColor = '#22c55e'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.roundRect(
      segment.x * CELL_SIZE + 1,
      segment.y * CELL_SIZE + 1,
      CELL_SIZE - 2,
      CELL_SIZE - 2,
      4
    )
    ctx.fill()
  })

  // 重置阴影效果
  ctx.shadowBlur = 0

  // 绘制食物 - 使用渐变和动画效果
  const foodGradient = ctx.createRadialGradient(
    (food.value.x + 0.5) * CELL_SIZE,
    (food.value.y + 0.5) * CELL_SIZE,
    2,
    (food.value.x + 0.5) * CELL_SIZE,
    (food.value.y + 0.5) * CELL_SIZE,
    CELL_SIZE / 2
  )
  foodGradient.addColorStop(0, '#ef4444')
  foodGradient.addColorStop(1, '#dc2626')
  
  ctx.fillStyle = foodGradient
  ctx.shadowColor = '#ef4444'
  ctx.shadowBlur = 15
  ctx.beginPath()
  ctx.arc(
    (food.value.x + 0.5) * CELL_SIZE,
    (food.value.y + 0.5) * CELL_SIZE,
    CELL_SIZE / 2 - 2,
    0,
    Math.PI * 2
  )
  ctx.fill()
}

// 移动蛇
function moveSnake() {
  if (!isPlaying.value || isPaused.value || gameOver.value) return

  // 更新方向
  direction.value = nextDirection.value

  // 获取蛇头位置
  const head = { ...snake.value[0] }

  // 根据方向移动蛇头
  switch (direction.value) {
    case 'up':
      head.y--
      break
    case 'down':
      head.y++
      break
    case 'left':
      head.x--
      break
    case 'right':
      head.x++
      break
  }

  // 检查是否撞墙
  if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
    endGame()
    return
  }

  // 检查是否撞到自己
  if (snake.value.some(segment => segment.x === head.x && segment.y === head.y)) {
    endGame()
    return
  }

  // 将新的头部添加到蛇身数组的开头
  snake.value.unshift(head)

  // 检查是否吃到食物
  if (head.x === food.value.x && head.y === food.value.y) {
    score.value += 10
    generateFood()
  } else {
    // 如果没有吃到食物，移除尾部
    snake.value.pop()
  }

  draw()
}

// 改变方向
function changeDirection(newDirection: Direction) {
  // 防止反向移动
  const opposites = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left'
  }
  
  if (opposites[newDirection] !== direction.value) {
    nextDirection.value = newDirection
  }
}

// 开始游戏
function startGame() {
  isPlaying.value = true
  gameOver.value = false
  isPaused.value = false
  score.value = 0
  direction.value = 'right'
  nextDirection.value = 'right'
  
  initializeSnake()
  generateFood()
  draw()
  
  if (gameLoop) clearInterval(gameLoop)
  gameLoop = window.setInterval(moveSnake, GAME_SPEED)
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
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      changeDirection('up')
      break
    case 'ArrowDown':
      event.preventDefault()
      changeDirection('down')
      break
    case 'ArrowLeft':
      event.preventDefault()
      changeDirection('left')
      break
    case 'ArrowRight':
      event.preventDefault()
      changeDirection('right')
      break
    case ' ':
      event.preventDefault()
      if (isPlaying.value) {
        pauseGame()
      } else {
        startGame()
      }
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