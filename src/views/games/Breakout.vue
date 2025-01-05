<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- 标题区域 -->
      <div class="text-center mb-6">
        <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          打砖块
        </h1>
        <div class="mt-4 flex justify-center items-center gap-8">
          <p class="text-gray-600">
            <v-icon icon="mdi-star" class="text-yellow-500" />
            得分: {{ score }}
          </p>
          <p class="text-gray-600">
            <v-icon icon="mdi-heart" class="text-red-500" />
            生命: {{ lives }}
          </p>
        </div>
      </div>

      <!-- 游戏控制区 -->
      <div class="flex justify-center gap-4 mb-6">
        <v-btn
          color="primary"
          @click="startGame"
          :disabled="isPlaying"
        >
          开始游戏
        </v-btn>
        <v-btn
          color="error"
          @click="pauseGame"
          :disabled="!isPlaying"
        >
          {{ isPaused ? '继续' : '暂停' }}
        </v-btn>
      </div>

      <!-- 游戏画布 -->
      <div class="flex justify-center">
        <canvas
          ref="gameCanvas"
          class="bg-gray-900 rounded-lg shadow-xl"
          :width="CANVAS_WIDTH"
          :height="CANVAS_HEIGHT"
          @mousemove="handleMouseMove"
          @touchmove="handleTouchMove"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 游戏常量
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const PADDLE_WIDTH = 100
const PADDLE_HEIGHT = 10
const BALL_RADIUS = 8
const BRICK_ROWS = 5
const BRICK_COLS = 8
const BRICK_WIDTH = CANVAS_WIDTH / BRICK_COLS
const BRICK_HEIGHT = 30
const BRICK_PADDING = 4

// 游戏状态
const score = ref(0)
const lives = ref(3)
const isPlaying = ref(false)
const isPaused = ref(false)
const gameCanvas = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number | null = null

// 游戏对象
const paddle = ref({ x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2, y: CANVAS_HEIGHT - 30 })
const ball = ref({
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT - 50,
  dx: 5,
  dy: -5
})
const bricks = ref<Array<{ x: number; y: number; visible: boolean }>>([])

// 初始化砖块
function initBricks() {
  bricks.value = []
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.value.push({
        x: col * BRICK_WIDTH + BRICK_PADDING,
        y: row * BRICK_HEIGHT + BRICK_PADDING + 50,
        visible: true
      })
    }
  }
}

// 开始游戏
function startGame() {
  if (isPlaying.value) return
  
  isPlaying.value = true
  isPaused.value = false
  score.value = 0
  lives.value = 3
  initBricks()
  resetBall()
  
  // 开始游戏循环
  gameLoop()
}

// 暂停游戏
function pauseGame() {
  isPaused.value = !isPaused.value
}

// 重置球的位置
function resetBall() {
  ball.value = {
    x: paddle.value.x + PADDLE_WIDTH / 2,
    y: CANVAS_HEIGHT - 50,
    dx: 5,
    dy: -5
  }
}

// 处理鼠标移动
function handleMouseMove(e: MouseEvent) {
  if (!isPlaying.value || isPaused.value) return
  const rect = gameCanvas.value?.getBoundingClientRect()
  if (!rect) return
  
  const relativeX = e.clientX - rect.left
  if (relativeX > 0 && relativeX < CANVAS_WIDTH) {
    paddle.value.x = relativeX - PADDLE_WIDTH / 2
  }
}

// 处理触摸移动
function handleTouchMove(e: TouchEvent) {
  e.preventDefault()
  if (!isPlaying.value || isPaused.value) return
  const rect = gameCanvas.value?.getBoundingClientRect()
  if (!rect) return
  
  const relativeX = e.touches[0].clientX - rect.left
  if (relativeX > 0 && relativeX < CANVAS_WIDTH) {
    paddle.value.x = relativeX - PADDLE_WIDTH / 2
  }
}

// 游戏主循环
function gameLoop() {
  if (!isPlaying.value || isPaused.value) {
    return
  }
  
  const ctx = gameCanvas.value?.getContext('2d')
  if (!ctx) return
  
  // 清空画布
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  
  // 绘制游戏对象
  drawPaddle(ctx)
  drawBall(ctx)
  drawBricks(ctx)
  
  // 碰撞检测和更新
  detectCollision()
  updateBallPosition()
  
  // 继续循环
  animationFrameId = requestAnimationFrame(gameLoop)
}

// 绘制挡板
function drawPaddle(ctx: CanvasRenderingContext2D) {
  ctx.beginPath()
  ctx.roundRect(
    paddle.value.x,
    paddle.value.y,
    PADDLE_WIDTH,
    PADDLE_HEIGHT,
    4
  )
  ctx.fillStyle = '#4F46E5'
  ctx.fill()
  ctx.closePath()
}

// 绘制球
function drawBall(ctx: CanvasRenderingContext2D) {
  ctx.beginPath()
  ctx.arc(ball.value.x, ball.value.y, BALL_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = '#EF4444'
  ctx.fill()
  ctx.closePath()
}

// 绘制砖块
function drawBricks(ctx: CanvasRenderingContext2D) {
  bricks.value.forEach((brick, index) => {
    if (!brick.visible) return
    
    ctx.beginPath()
    ctx.roundRect(
      brick.x,
      brick.y,
      BRICK_WIDTH - BRICK_PADDING * 2,
      BRICK_HEIGHT - BRICK_PADDING * 2,
      4
    )
    ctx.fillStyle = `hsl(${index * 360 / bricks.value.length}, 70%, 60%)`
    ctx.fill()
    ctx.closePath()
  })
}

// 碰撞检测
function detectCollision() {
  const currentBall = ball.value  // 重命名变量避免冲突
  const currentPaddle = paddle.value  // 重命名变量避免冲突

  // 检测球与墙壁的碰撞
  if (currentBall.x + currentBall.dx > CANVAS_WIDTH - BALL_RADIUS || 
      currentBall.x + currentBall.dx < BALL_RADIUS) {
    currentBall.dx = -currentBall.dx // 反弹
  }
  if (currentBall.y + currentBall.dy < BALL_RADIUS) {
    currentBall.dy = -currentBall.dy // 反弹
  }

  // 检测球是否掉落
  if (currentBall.y + currentBall.dy > CANVAS_HEIGHT - BALL_RADIUS) {
    lives.value--
    if (lives.value <= 0) {
      // 游戏结束
      isPlaying.value = false
      alert('游戏结束！得分：' + score.value)
      return
    }
    resetBall()
    return
  }

  // 检测球与挡板的碰撞
  if (currentBall.y + currentBall.dy > currentPaddle.y - BALL_RADIUS &&
      currentBall.x > currentPaddle.x &&
      currentBall.x < currentPaddle.x + PADDLE_WIDTH) {
    // 根据击中挡板的位置改变反弹角度
    const hitX = (currentBall.x - (currentPaddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2)
    currentBall.dx = hitX * 8 // 最大水平速度
    currentBall.dy = -Math.abs(currentBall.dy) // 确保球向上弹
  }

  // 检测球与砖块的碰撞
  bricks.value.forEach((brick, index) => {
    if (!brick.visible) return

    const brickLeft = brick.x
    const brickRight = brick.x + BRICK_WIDTH - BRICK_PADDING * 2
    const brickTop = brick.y
    const brickBottom = brick.y + BRICK_HEIGHT - BRICK_PADDING * 2

    if (currentBall.x > brickLeft &&
        currentBall.x < brickRight &&
        currentBall.y > brickTop &&
        currentBall.y < brickBottom) {
      
      currentBall.dy = -currentBall.dy
      brick.visible = false
      score.value += 10

      // 检查是否获胜
      if (bricks.value.every(b => !b.visible)) {
        isPlaying.value = false
        alert('恭喜你赢了！')
      }
    }
  })
}

// 更新球的位置
function updateBallPosition() {
  const currentBall = ball.value  // 重命名变量避免冲突
  
  // 限制挡板不超出画布
  paddle.value.x = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, paddle.value.x))
  
  // 更新球的位置
  currentBall.x += currentBall.dx
  currentBall.y += currentBall.dy
}

// 生命周期钩子
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
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