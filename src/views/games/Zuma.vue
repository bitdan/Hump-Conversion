<template>
  <div class="container mx-auto p-5">
    <div class="flex flex-col items-center">
      <h1 class="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
        祖玛
      </h1>

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
      <div v-if="gameOver" class="mb-4 text-2xl font-bold text-red-500 animate-pulse">
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 游戏常量
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const BALL_RADIUS = 15
const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF']
const PATH_POINTS = generatePath()
const BALL_SPEED = 1
const SHOOT_SPEED = 15

// 游戏状态
const gameCanvas = ref<HTMLCanvasElement | null>(null)
const isPlaying = ref(false)
const isPaused = ref(false)
const gameOver = ref(false)
const score = ref(0)

// 游戏数据
interface Ball {
  x: number
  y: number
  color: string
  pathIndex: number
  progress: number
}

interface Shooter {
  x: number
  y: number
  angle: number
  currentBall: string
  nextBall: string
}

const balls = ref<Ball[]>([])
const shooter = ref<Shooter>({
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT / 2,
  angle: 0,
  currentBall: COLORS[0],
  nextBall: COLORS[Math.floor(Math.random() * COLORS.length)]
})

const shootingBall = ref<{x: number, y: number, dx: number, dy: number, color: string} | null>(null)
let animationFrameId: number | null = null

// 生成游戏路径
function generatePath() {
  const points: {x: number, y: number}[] = []
  const centerX = CANVAS_WIDTH / 2
  const centerY = CANVAS_HEIGHT / 2
  const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.35
  
  for (let angle = 0; angle <= Math.PI * 4; angle += 0.1) {
    const x = centerX + Math.cos(angle) * radius * (1 + angle / (Math.PI * 4) * 0.5)
    const y = centerY + Math.sin(angle) * radius * (1 + angle / (Math.PI * 4) * 0.5)
    points.push({x, y})
  }
  
  return points
}

// 初始化游戏
function initializeGame() {
  balls.value = []
  const initialBallCount = 20
  
  for (let i = 0; i < initialBallCount; i++) {
    balls.value.push({
      x: PATH_POINTS[0].x,
      y: PATH_POINTS[0].y,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      pathIndex: 0,
      progress: -i * (BALL_RADIUS * 2.2) // 间距
    })
  }
  
  shooter.value.currentBall = COLORS[Math.floor(Math.random() * COLORS.length)]
  shooter.value.nextBall = COLORS[Math.floor(Math.random() * COLORS.length)]
}

// 开始游戏
function startGame() {
  isPlaying.value = true
  isPaused.value = false
  gameOver.value = false
  score.value = 0
  initializeGame()
  gameLoop()
}

// 暂停游戏
function pauseGame() {
  isPaused.value = !isPaused.value
  if (!isPaused.value) {
    gameLoop()
  }
}

// 处理鼠标移动
function handleMouseMove(e: MouseEvent) {
  if (!gameCanvas.value || !isPlaying.value || isPaused.value) return
  
  const rect = gameCanvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  shooter.value.angle = Math.atan2(y - shooter.value.y, x - shooter.value.x)
}

// 处理触摸移动
function handleTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (!gameCanvas.value || !isPlaying.value || isPaused.value) return
  
  const rect = gameCanvas.value.getBoundingClientRect()
  const x = e.touches[0].clientX - rect.left
  const y = e.touches[0].clientY - rect.top
  
  shooter.value.angle = Math.atan2(y - shooter.value.y, x - shooter.value.x)
}

// 发射球
function shootBall() {
  if (shootingBall.value || !isPlaying.value || isPaused.value) return
  
  const angle = shooter.value.angle
  shootingBall.value = {
    x: shooter.value.x,
    y: shooter.value.y,
    dx: Math.cos(angle) * SHOOT_SPEED,
    dy: Math.sin(angle) * SHOOT_SPEED,
    color: shooter.value.currentBall
  }
  
  // 更新发射器的球
  shooter.value.currentBall = shooter.value.nextBall
  shooter.value.nextBall = COLORS[Math.floor(Math.random() * COLORS.length)]
}

// 处理点击和触摸
function handleClick() {
  shootBall()
}

function handleTouchStart(e: TouchEvent) {
  e.preventDefault()
  shootBall()
}

// 检查球的碰撞
function checkCollision() {
  if (!shootingBall.value) return
  
  for (let i = 0; i < balls.value.length; i++) {
    const ball = balls.value[i]
    const dx = shootingBall.value.x - ball.x
    const dy = shootingBall.value.y - ball.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < BALL_RADIUS * 2) {
      // 插入新球
      const newBall: Ball = {
        x: ball.x,
        y: ball.y,
        color: shootingBall.value.color,
        pathIndex: ball.pathIndex,
        progress: ball.progress
      }
      
      balls.value.splice(i, 0, newBall)
      shootingBall.value = null
      
      // 检查并消除相同颜色的球
      checkMatches()
      break
    }
  }
}

// 检查相同颜色的球
function checkMatches() {
  let matchFound = true
  while (matchFound) {
    matchFound = false
    let count = 1
    let startIndex = 0
    
    for (let i = 1; i < balls.value.length; i++) {
      if (balls.value[i].color === balls.value[i - 1].color) {
        count++
      } else {
        if (count >= 3) {
          balls.value.splice(startIndex, count)
          score.value += count * 10
          matchFound = true
          break
        }
        count = 1
        startIndex = i
      }
    }
    
    if (count >= 3) {
      balls.value.splice(startIndex, count)
      score.value += count * 10
      matchFound = true
    }
  }
}

// 更新游戏状态
function update() {
  // 更新球的位置
  balls.value.forEach(ball => {
    ball.progress += BALL_SPEED
    if (ball.progress >= 0) {
      const pathIndex = Math.floor(ball.progress / (BALL_RADIUS * 2))
      if (pathIndex < PATH_POINTS.length) {
        ball.pathIndex = pathIndex
        ball.x = PATH_POINTS[pathIndex].x
        ball.y = PATH_POINTS[pathIndex].y
      }
    }
  })
  
  // 更新发射的球
  if (shootingBall.value) {
    shootingBall.value.x += shootingBall.value.dx
    shootingBall.value.y += shootingBall.value.dy
    
    // 检查边界碰撞
    if (shootingBall.value.x < 0 || shootingBall.value.x > CANVAS_WIDTH ||
        shootingBall.value.y < 0 || shootingBall.value.y > CANVAS_HEIGHT) {
      shootingBall.value = null
    } else {
      checkCollision()
    }
  }
  
  // 检查游戏结束条件
  if (balls.value.length > 0 && 
      balls.value[balls.value.length - 1].pathIndex >= PATH_POINTS.length - 1) {
    endGame()
  }
}

// 绘制游戏画面
function draw() {
  const ctx = gameCanvas.value?.getContext('2d')
  if (!ctx) return
  
  // 清空画布
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  
  // 绘制路径
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)'
  ctx.lineWidth = BALL_RADIUS * 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  
  PATH_POINTS.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y)
    } else {
      ctx.lineTo(point.x, point.y)
    }
  })
  ctx.stroke()
  
  // 绘制球
  balls.value.forEach(ball => {
    ctx.fillStyle = ball.color
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)
    ctx.fill()
  })
  
  // 绘制发射器
  ctx.fillStyle = '#4F46E5'
  ctx.beginPath()
  ctx.arc(shooter.value.x, shooter.value.y, BALL_RADIUS * 1.5, 0, Math.PI * 2)
  ctx.fill()
  
  // 绘制当前球和下一个球
  ctx.fillStyle = shooter.value.currentBall
  ctx.beginPath()
  ctx.arc(shooter.value.x, shooter.value.y, BALL_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  
  // 绘制预览球
  ctx.fillStyle = shooter.value.nextBall
  ctx.beginPath()
  ctx.arc(
    shooter.value.x + Math.cos(shooter.value.angle + Math.PI) * BALL_RADIUS * 3,
    shooter.value.y + Math.sin(shooter.value.angle + Math.PI) * BALL_RADIUS * 3,
    BALL_RADIUS * 0.7,
    0,
    Math.PI * 2
  )
  ctx.fill()
  
  // 绘制发射的球
  if (shootingBall.value) {
    ctx.fillStyle = shootingBall.value.color
    ctx.beginPath()
    ctx.arc(shootingBall.value.x, shootingBall.value.y, BALL_RADIUS, 0, Math.PI * 2)
    ctx.fill()
  }
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

// 结束游戏
function endGame() {
  gameOver.value = true
  isPlaying.value = false
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
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