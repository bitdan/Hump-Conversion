<template>
  <ToolPageLayout :card="false" max-width="max-w-3xl">
    <div class="flex flex-col items-center">
      <!-- 游戏控制区 -->
      <div class="flex gap-4 mb-6">
        <v-btn 
          color="success" 
          @click="startGame" 
          :disabled="isPlaying && !gameOver"
          class="px-6"
        >
          {{ isPlaying ? '重新开始' : '开始游戏' }}
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

      <!-- 分数显示 -->
      <div class="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-white px-6 py-2 rounded-full shadow-lg mb-6">
        分数: {{ score }}
      </div>

      <!-- 游戏结束提示 -->
      <div 
        v-if="gameOver" 
        class="mb-4 text-2xl font-bold text-red-500 animate-pulse"
      >
        游戏结束
      </div>

      <!-- 游戏画布 -->
      <canvas
        ref="gameCanvas"
        :width="CANVAS_WIDTH"
        :height="CANVAS_HEIGHT"
        class="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-xl border border-indigo-200"
        @mousemove="handleMouseMove"
        @click="handleClick"
        @touchmove="handleTouchMove"
        @touchstart="handleTouchStart"
      ></canvas>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'

// 游戏常量
const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 600
const BUBBLE_RADIUS = 20
const SHOOTER_HEIGHT = 60
const GRID_ROWS = 12
const GRID_COLS = 10
const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF']

// 游戏状态
const gameCanvas = ref<HTMLCanvasElement | null>(null)
const isPlaying = ref(false)
const isPaused = ref(false)
const gameOver = ref(false)
const score = ref(0)

// 游戏数据
const bubbles = ref<Array<{
  x: number,
  y: number,
  color: string,
  row: number,
  col: number
}>>([])
const shooterAngle = ref(Math.PI / 2)
const currentBubble = ref<{
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string
} | null>(null)
let animationFrameId: number | null = null

// 初始化游戏网格
function initializeGrid() {
  bubbles.value = []
  const initialRows = 5

  for (let row = 0; row < initialRows; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const x = col * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + (row % 2 ? BUBBLE_RADIUS : 0)
      const y = row * BUBBLE_RADIUS * Math.sqrt(3) + BUBBLE_RADIUS
      
      bubbles.value.push({
        x,
        y,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        row,
        col
      })
    }
  }
}

// 开始游戏
function startGame() {
  isPlaying.value = true
  isPaused.value = false
  gameOver.value = false
  score.value = 0
  
  initializeGrid()
  spawnNewBubble()
  gameLoop()
}

// 暂停游戏
function pauseGame() {
  isPaused.value = !isPaused.value
  if (!isPaused.value) {
    gameLoop()
  }
}

// 生成新泡泡
function spawnNewBubble() {
  if (!gameCanvas.value) return
  
  const x = CANVAS_WIDTH / 2
  const y = CANVAS_HEIGHT - SHOOTER_HEIGHT
  
  currentBubble.value = {
    x,
    y,
    dx: 0,
    dy: 0,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  }
}

// 处理鼠标移动
function handleMouseMove(e: MouseEvent) {
  if (!gameCanvas.value || !isPlaying.value || isPaused.value) return
  
  const rect = gameCanvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  updateShooterAngle(x, y)
}

// 处理触摸移动
function handleTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (!gameCanvas.value || !isPlaying.value || isPaused.value) return
  
  const rect = gameCanvas.value.getBoundingClientRect()
  const x = e.touches[0].clientX - rect.left
  const y = e.touches[0].clientY - rect.top
  
  updateShooterAngle(x, y)
}

// 处理点击/触摸开始
function handleClick() {
  shootBubble()
}

function handleTouchStart(e: TouchEvent) {
  e.preventDefault()
  shootBubble()
}

// 更新发射角度
function updateShooterAngle(x: number, y: number) {
  if (!gameCanvas.value) return
  
  const shooterX = CANVAS_WIDTH / 2
  const shooterY = CANVAS_HEIGHT - SHOOTER_HEIGHT
  
  shooterAngle.value = Math.atan2(
    shooterY - y,
    x - shooterX
  )
}

// 发射泡泡
function shootBubble() {
  if (!currentBubble.value || !isPlaying.value || isPaused.value) return
  
  const speed = 10
  currentBubble.value.dx = Math.cos(shooterAngle.value) * speed
  currentBubble.value.dy = -Math.sin(shooterAngle.value) * speed
}

// 游戏主循环
function gameLoop() {
  if (!isPlaying.value || isPaused.value || gameOver.value) {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    return
  }

  update()
  draw()
  animationFrameId = requestAnimationFrame(gameLoop)
}

// 更新游戏状态
function update() {
  if (!currentBubble.value) return

  // 更新泡泡位置
  if (currentBubble.value.dx !== 0 || currentBubble.value.dy !== 0) {
    currentBubble.value.x += currentBubble.value.dx
    currentBubble.value.y += currentBubble.value.dy

    // 检查墙壁碰撞
    if (currentBubble.value.x <= BUBBLE_RADIUS || 
        currentBubble.value.x >= CANVAS_WIDTH - BUBBLE_RADIUS) {
      currentBubble.value.dx *= -1
    }

    // 检查天花板碰撞
    if (currentBubble.value.y <= BUBBLE_RADIUS) {
      snapBubbleToGrid()
    }

    // 检查与其他泡泡的碰撞
    for (const bubble of bubbles.value) {
      const dx = currentBubble.value.x - bubble.x
      const dy = currentBubble.value.y - bubble.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < BUBBLE_RADIUS * 2) {
        snapBubbleToGrid()
        break
      }
    }
  }
}

// 将泡泡对齐到网格
function snapBubbleToGrid() {
  if (!currentBubble.value) return

  const row = Math.round(currentBubble.value.y / (BUBBLE_RADIUS * Math.sqrt(3)))
  const col = Math.round((currentBubble.value.x - (row % 2 ? BUBBLE_RADIUS : 0)) / (BUBBLE_RADIUS * 2))

  bubbles.value.push({
    x: col * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + (row % 2 ? BUBBLE_RADIUS : 0),
    y: row * BUBBLE_RADIUS * Math.sqrt(3) + BUBBLE_RADIUS,
    color: currentBubble.value.color,
    row,
    col
  })

  // 检查并消除相同颜色的泡泡
  checkAndPopBubbles()

  // 检查游戏是否结束
  if (checkGameOver()) {
    endGame()
  } else {
    spawnNewBubble()
  }
}

// 检查并消除相同颜色的泡泡
function checkAndPopBubbles() {
  const lastBubble = bubbles.value[bubbles.value.length - 1]
  const sameColorBubbles = findConnectedBubbles(lastBubble)

  if (sameColorBubbles.length >= 3) {
    // 移除相连的相同颜色泡泡
    bubbles.value = bubbles.value.filter(bubble => 
      !sameColorBubbles.some(b => b.row === bubble.row && b.col === bubble.col)
    )
    score.value += sameColorBubbles.length * 10
  }
}

// 查找相连的相同颜色泡泡
function findConnectedBubbles(bubble: typeof bubbles.value[0]) {
  const connected: typeof bubbles.value = []
  const checked = new Set<string>()

  function check(b: typeof bubble) {
    const key = `${b.row},${b.col}`
    if (checked.has(key)) return
    checked.add(key)

    if (b.color === bubble.color) {
      connected.push(b)
      
      // 检查相邻的泡泡
      const neighbors = getNeighbors(b)
      neighbors.forEach(check)
    }
  }

  check(bubble)
  return connected
}

// 获取相邻的泡泡
function getNeighbors(bubble: typeof bubbles.value[0]) {
  const directions = bubble.row % 2 ? 
    [[0, 1], [0, -1], [-1, 0], [-1, 1], [1, 0], [1, 1]] :
    [[0, 1], [0, -1], [-1, -1], [-1, 0], [1, -1], [1, 0]]

  return directions
    .map(([dr, dc]) => ({
      row: bubble.row + dr,
      col: bubble.col + dc
    }))
    .map(pos => bubbles.value.find(b => b.row === pos.row && b.col === pos.col))
    .filter((b): b is typeof bubble => b !== undefined)
}

// 检查游戏是否结束
function checkGameOver() {
  return bubbles.value.some(bubble => 
    bubble.y + BUBBLE_RADIUS >= CANVAS_HEIGHT - SHOOTER_HEIGHT
  )
}

// 结束游戏
function endGame() {
  gameOver.value = true
  isPlaying.value = false
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

// 绘制游戏画面
function draw() {
  const ctx = gameCanvas.value?.getContext('2d')
  if (!ctx) return

  // 清空画布并绘制渐变背景
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  gradient.addColorStop(0, '#eff6ff')  // blue-50
  gradient.addColorStop(1, '#e0e7ff')  // indigo-100
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // 绘制网格线
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)'  // indigo-500 with opacity
  ctx.lineWidth = 0.5
  for (let i = 0; i < GRID_ROWS; i++) {
    for (let j = 0; j < GRID_COLS; j++) {
      const x = j * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + (i % 2 ? BUBBLE_RADIUS : 0)
      const y = i * BUBBLE_RADIUS * Math.sqrt(3) + BUBBLE_RADIUS
      
      ctx.beginPath()
      ctx.arc(x, y, BUBBLE_RADIUS - 1, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // 绘制现有的泡泡
  bubbles.value.forEach(bubble => {
    ctx.fillStyle = bubble.color
    ctx.beginPath()
    ctx.arc(bubble.x, bubble.y, BUBBLE_RADIUS - 2, 0, Math.PI * 2)
    ctx.fill()
  })

  // 绘制发射器
  ctx.fillStyle = '#4F46E5'
  ctx.beginPath()
  ctx.moveTo(CANVAS_WIDTH / 2 - 20, CANVAS_HEIGHT)
  ctx.lineTo(CANVAS_WIDTH / 2 + 20, CANVAS_HEIGHT)
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - SHOOTER_HEIGHT)
  ctx.closePath()
  ctx.fill()

  // 绘制当前泡泡
  if (currentBubble.value) {
    ctx.fillStyle = currentBubble.value.color
    ctx.beginPath()
    ctx.arc(
      currentBubble.value.x,
      currentBubble.value.y,
      BUBBLE_RADIUS - 2,
      0,
      Math.PI * 2
    )
    ctx.fill()
  }
}

// 生命周期钩子
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})

// 键盘事件处理
function handleKeyDown(e: KeyboardEvent) {
  if (e.code === 'Space') {
    if (!isPlaying.value) {
      startGame()
    } else {
      pauseGame()
    }
  }
}
</script>

<style scoped>
canvas {
  touch-action: none;
}
</style> 
