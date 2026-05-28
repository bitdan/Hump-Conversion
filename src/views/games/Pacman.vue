<template>
  <ToolPageLayout :card="false" max-width="max-w-2xl">
    <div class="max-w-2xl mx-auto">
      <!-- 标题区域 -->
      <div class="text-center mb-8">
        <div class="flex justify-center items-center gap-8">
          <p class="text-gray-600">
            <v-icon icon="mdi-star" class="text-yellow-500" />
            得分: {{ score }}
          </p>
          <p class="text-gray-600">
            <v-icon icon="mdi-flag" class="text-green-500" />
            {{ levelConfig.name }}
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
          :width="CANVAS_SIZE"
          :height="CANVAS_SIZE"
          class="bg-gray-900 rounded-lg shadow-xl"
        ></canvas>
      </div>

      <!-- 移动端控制按钮 -->
      <div class="mt-8 grid grid-cols-3 gap-3 md:hidden">
        <div></div>
        <v-btn
          color="primary"
          @click="changeDirection('up')"
          :disabled="!isPlaying || isPaused"
        >
          ↑
        </v-btn>
        <div></div>
        <v-btn
          color="primary"
          @click="changeDirection('left')"
          :disabled="!isPlaying || isPaused"
        >
          ←
        </v-btn>
        <v-btn
          color="primary"
          @click="changeDirection('down')"
          :disabled="!isPlaying || isPaused"
        >
          ↓
        </v-btn>
        <v-btn
          color="primary"
          @click="changeDirection('right')"
          :disabled="!isPlaying || isPaused"
        >
          →
        </v-btn>
      </div>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'

// 游戏常量
const CANVAS_SIZE = 600
const GRID_SIZE = 20
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE
const PACMAN_SIZE = CELL_SIZE * 0.8
const DOT_SIZE = CELL_SIZE * 0.2
const POWER_DOT_SIZE = CELL_SIZE * 0.4
const GHOST_SIZE = CELL_SIZE * 0.8

// 添加关卡配置
const LEVELS = [
  {
    name: '第1关',
    wallCount: 20,
    ghostCount: 4,
    ghostSpeed: 1.2,
    powerDotDuration: 8000
  },
  {
    name: '第2关',
    wallCount: 25,
    ghostCount: 5,
    ghostSpeed: 1.5,
    powerDotDuration: 6000
  },
  {
    name: '第3关',
    wallCount: 30,
    ghostCount: 6,
    ghostSpeed: 1.8,
    powerDotDuration: 4000
  },
  {
    name: '第4关',
    wallCount: 25,
    ghostCount: 8,
    ghostSpeed: 2.0,
    powerDotDuration: 3000
  }
]

// 添加关卡状态
const currentLevel = ref(0)
const levelConfig = computed(() => LEVELS[currentLevel.value])

// 游戏状态
const gameCanvas = ref<HTMLCanvasElement | null>(null)
const isPlaying = ref(false)
const isPaused = ref(false)
const score = ref(0)
let gameLoop: number | null = null

// 游戏对象
type Direction = 'up' | 'down' | 'left' | 'right'
type Position = { x: number; y: number }

const pacman = ref<Position & { direction: Direction }>({
  x: CELL_SIZE * 10,
  y: CELL_SIZE * 15,
  direction: 'right'
})

interface Ghost {
  x: number
  y: number
  color: string
  direction: Direction
  isVulnerable: boolean
}

const ghosts = ref<Ghost[]>([
  { x: CELL_SIZE * 9, y: CELL_SIZE * 9, color: '#ff0000', direction: 'right', isVulnerable: false },
  { x: CELL_SIZE * 10, y: CELL_SIZE * 9, color: '#00ff00', direction: 'left', isVulnerable: false },
  { x: CELL_SIZE * 11, y: CELL_SIZE * 9, color: '#0000ff', direction: 'up', isVulnerable: false },
  { x: CELL_SIZE * 10, y: CELL_SIZE * 10, color: '#ff00ff', direction: 'down', isVulnerable: false }
])

// 初始化地图
const createMap = (wallCount: number) => {
  const map = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0))
  
  // 添加墙壁
  for (let i = 0; i < GRID_SIZE; i++) {
    map[0][i] = 1
    map[GRID_SIZE - 1][i] = 1
    map[i][0] = 1
    map[i][GRID_SIZE - 1] = 1
  }

  // 添加一些随机墙壁
  for (let i = 0; i < wallCount; i++) {
    const x = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1
    const y = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1
    map[y][x] = 1
  }

  return map
}

const map = ref(createMap(levelConfig.value.wallCount))
const dots = ref<Position[]>([])
const powerDots = ref<Position[]>([])

// 初始化豆子
const initializeDots = () => {
  dots.value = []
  powerDots.value = []
  
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (map.value[y][x] === 0) {
        if (Math.random() < 0.1) {
          powerDots.value.push({ x: x * CELL_SIZE + CELL_SIZE / 2, y: y * CELL_SIZE + CELL_SIZE / 2 })
        } else {
          dots.value.push({ x: x * CELL_SIZE + CELL_SIZE / 2, y: y * CELL_SIZE + CELL_SIZE / 2 })
        }
      }
    }
  }
}

// 绘制游戏画面
const draw = () => {
  const ctx = gameCanvas.value?.getContext('2d')
  if (!ctx) return

  // 清空画布
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // 绘制墙壁
  ctx.fillStyle = '#1d4ed8'
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (map.value[y][x] === 1) {
        // 绘制圆角矩形作为墙壁
        const radius = 4
        ctx.beginPath()
        ctx.roundRect(
          x * CELL_SIZE + 1,
          y * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2,
          radius
        )
        ctx.fill()
      }
    }
  }

  // 绘制豆子
  ctx.fillStyle = '#ffffff'
  dots.value.forEach(dot => {
    ctx.beginPath()
    ctx.arc(dot.x, dot.y, DOT_SIZE, 0, Math.PI * 2)
    ctx.fill()
  })

  // 绘制能量豆
  ctx.fillStyle = '#fbbf24'
  powerDots.value.forEach(dot => {
    ctx.beginPath()
    ctx.arc(dot.x, dot.y, POWER_DOT_SIZE, 0, Math.PI * 2)
    ctx.fill()
    // 添加发光效果
    ctx.shadowColor = '#fbbf24'
    ctx.shadowBlur = 10
    ctx.fill()
    ctx.shadowBlur = 0
  })

  // 绘制吃豆人
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  let startAngle = 0
  let endAngle = 2 * Math.PI
  const mouthSize = Math.sin(Date.now() / 100) * 0.2 + 0.2 // 嘴巴张合动画
  
  switch (pacman.value.direction) {
    case 'right':
      startAngle = mouthSize
      endAngle = 2 * Math.PI - mouthSize
      break
    case 'left':
      startAngle = Math.PI + mouthSize
      endAngle = Math.PI - mouthSize
      break
    case 'up':
      startAngle = Math.PI * 1.5 + mouthSize
      endAngle = Math.PI * 1.5 - mouthSize
      break
    case 'down':
      startAngle = Math.PI * 0.5 + mouthSize
      endAngle = Math.PI * 0.5 - mouthSize
      break
  }
  
  ctx.arc(
    pacman.value.x,
    pacman.value.y,
    PACMAN_SIZE / 2,
    startAngle,
    endAngle
  )
  ctx.lineTo(pacman.value.x, pacman.value.y)
  ctx.fill()

  // 绘制幽灵
  const ghostColors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff']
  ghosts.value.forEach((ghost, index) => {
    ctx.fillStyle = ghost.isVulnerable ? '#2563eb' : ghostColors[index % ghostColors.length]
    
    // 绘制幽灵身体
    ctx.beginPath()
    ctx.arc(
      ghost.x,
      ghost.y - GHOST_SIZE / 3,
      GHOST_SIZE / 2,
      Math.PI,
      0,
      false
    )
    
    // 绘制幽灵下半身
    const waveOffset = Math.sin(Date.now() / 200) * 2 // 飘动动画
    ctx.lineTo(
      ghost.x + GHOST_SIZE / 2,
      ghost.y + GHOST_SIZE / 3
    )
    
    // 绘制波浪形底部
    for (let i = 0; i < 3; i++) {
      const curve = GHOST_SIZE / 6
      ctx.quadraticCurveTo(
        ghost.x + GHOST_SIZE / 2 - curve * (2 * i + 1) + waveOffset,
        ghost.y + GHOST_SIZE / 3 + curve,
        ghost.x + GHOST_SIZE / 2 - curve * (2 * i + 2),
        ghost.y + GHOST_SIZE / 3
      )
    }
    
    ctx.lineTo(
      ghost.x - GHOST_SIZE / 2,
      ghost.y - GHOST_SIZE / 3
    )
    ctx.fill()
    
    // 绘制眼睛
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(
      ghost.x - GHOST_SIZE / 4,
      ghost.y - GHOST_SIZE / 3,
      GHOST_SIZE / 6,
      0,
      Math.PI * 2
    )
    ctx.arc(
      ghost.x + GHOST_SIZE / 4,
      ghost.y - GHOST_SIZE / 3,
      GHOST_SIZE / 6,
      0,
      Math.PI * 2
    )
    ctx.fill()
    
    // 绘制瞳孔
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(
      ghost.x - GHOST_SIZE / 4 + Math.cos(ghost.direction === 'right' ? 0 : Math.PI) * 2,
      ghost.y - GHOST_SIZE / 3 + Math.sin(ghost.direction === 'down' ? 0 : Math.PI) * 2,
      GHOST_SIZE / 10,
      0,
      Math.PI * 2
    )
    ctx.arc(
      ghost.x + GHOST_SIZE / 4 + Math.cos(ghost.direction === 'right' ? 0 : Math.PI) * 2,
      ghost.y - GHOST_SIZE / 3 + Math.sin(ghost.direction === 'down' ? 0 : Math.PI) * 2,
      GHOST_SIZE / 10,
      0,
      Math.PI * 2
    )
    ctx.fill()
  })
}

// 移动吃豆人
const movePacman = () => {
  const speed = 2
  const nextPosition = { ...pacman.value }

  switch (pacman.value.direction) {
    case 'up':
      nextPosition.y -= speed
      break
    case 'down':
      nextPosition.y += speed
      break
    case 'left':
      nextPosition.x -= speed
      break
    case 'right':
      nextPosition.x += speed
      break
  }

  // 碰撞检测
  const gridX = Math.floor(nextPosition.x / CELL_SIZE)
  const gridY = Math.floor(nextPosition.y / CELL_SIZE)

  if (
    gridX >= 0 && gridX < GRID_SIZE &&
    gridY >= 0 && gridY < GRID_SIZE &&
    map.value[gridY][gridX] !== 1
  ) {
    pacman.value = nextPosition
  }

  // 收集豆子
  dots.value = dots.value.filter(dot => {
    const distance = Math.hypot(dot.x - pacman.value.x, dot.y - pacman.value.y)
    if (distance < CELL_SIZE / 2) {
      score.value += 10
      return false
    }
    return true
  })

  // 收集能量豆
  powerDots.value = powerDots.value.filter(dot => {
    const distance = Math.hypot(dot.x - pacman.value.x, dot.y - pacman.value.y)
    if (distance < CELL_SIZE / 2) {
      score.value += 50
      ghosts.value.forEach(ghost => ghost.isVulnerable = true)
      setTimeout(() => {
        ghosts.value.forEach(ghost => ghost.isVulnerable = false)
      }, 5000)
      return false
    }
    return true
  })
}

// 移动幽灵
const moveGhosts = () => {
  ghosts.value.forEach(ghost => {
    const speed = ghost.isVulnerable ? levelConfig.value.ghostSpeed * 0.5 : levelConfig.value.ghostSpeed
    
    // 计算到吃豆人的方向
    const dx = pacman.value.x - ghost.x
    const dy = pacman.value.y - ghost.y
    
    // 如果幽灵处于脆弱状态，则远离吃豆人
    const shouldFlee = ghost.isVulnerable
    
    // 根据距离决定是否追踪
    const distance = Math.hypot(dx, dy)
    const shouldChase = !shouldFlee && distance < CANVAS_SIZE / 2
    
    let nextPosition = { x: ghost.x, y: ghost.y }
    
    if (shouldChase || shouldFlee) {
      // 计算最佳移动方向
      const angle = Math.atan2(dy, dx)
      const moveAngle = shouldFlee ? angle + Math.PI : angle
      
      nextPosition.x += Math.cos(moveAngle) * speed
      nextPosition.y += Math.sin(moveAngle) * speed
    } else {
      // 随机移动
      if (Math.random() < 0.02) {
        ghost.direction = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)]
      }
      
      switch (ghost.direction) {
        case 'up': nextPosition.y -= speed; break
        case 'down': nextPosition.y += speed; break
        case 'left': nextPosition.x -= speed; break
        case 'right': nextPosition.x += speed; break
      }
    }
    
    // 碰撞检测
    const gridX = Math.floor(nextPosition.x / CELL_SIZE)
    const gridY = Math.floor(nextPosition.y / CELL_SIZE)
    
    if (
      gridX >= 0 && gridX < GRID_SIZE &&
      gridY >= 0 && gridY < GRID_SIZE &&
      map.value[gridY][gridX] !== 1
    ) {
      ghost.x = nextPosition.x
      ghost.y = nextPosition.y
    }
    
    // 检测与吃豆人的碰撞
    const collisionDistance = Math.hypot(ghost.x - pacman.value.x, ghost.y - pacman.value.y)
    if (collisionDistance < CELL_SIZE) {
      if (ghost.isVulnerable) {
        ghost.x = CELL_SIZE * 10
        ghost.y = CELL_SIZE * 10
        ghost.isVulnerable = false
        score.value += 200
      } else {
        endGame()
      }
    }
  })
}

// 游戏循环
const gameStep = () => {
  if (!isPlaying.value || isPaused.value) return

  movePacman()
  moveGhosts()
  draw()

  // 检查游戏是否结束
  if (dots.value.length === 0 && powerDots.value.length === 0) {
    endGame(true)
  }
}

// 开始游戏
const startGame = () => {
  if (isPlaying.value) return

  isPlaying.value = true
  isPaused.value = false
  
  // 如果所有关卡都完成，重新开始
  if (currentLevel.value >= LEVELS.length) {
    currentLevel.value = 0
    score.value = 0
  }
  
  // 重置游戏状态
  map.value = createMap(levelConfig.value.wallCount)
  initializeDots()
  pacman.value = { x: CELL_SIZE * 10, y: CELL_SIZE * 15, direction: 'right' }
  
  // 根据当前关卡创建幽灵
  const ghostColors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff']
  ghosts.value = Array(levelConfig.value.ghostCount).fill(0).map((_, i) => ({
    x: CELL_SIZE * (9 + i),
    y: CELL_SIZE * 9,
    color: ghostColors[i],
    direction: ['right', 'left', 'up', 'down'][i % 4],
    isVulnerable: false
  }))

  if (gameLoop) clearInterval(gameLoop)
  gameLoop = window.setInterval(gameStep, 1000 / 60)
}

// 暂停游戏
const pauseGame = () => {
  isPaused.value = !isPaused.value
}

// 结束游戏
const endGame = (win = false) => {
  isPlaying.value = false
  if (gameLoop) {
    clearInterval(gameLoop)
    gameLoop = null
  }
  
  if (win) {
    // 进入下一关
    currentLevel.value++
    if (currentLevel.value < LEVELS.length) {
      // 显示过关动画
      const ctx = gameCanvas.value?.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        ctx.fillStyle = '#fff'
        ctx.font = '48px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('恭喜过关!', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 30)
        ctx.font = '24px Arial'
        ctx.fillText('按空格键开始下一关', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 30)
      }
    } else {
      // 通关
      const ctx = gameCanvas.value?.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        ctx.fillStyle = '#fff'
        ctx.font = '48px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('恭喜通关!', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 30)
        ctx.font = '24px Arial'
        ctx.fillText(`最终得分: ${score.value}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 30)
      }
    }
  } else {
    const ctx = gameCanvas.value?.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.fillStyle = '#fff'
      ctx.font = '48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('游戏结束!', CANVAS_SIZE / 2, CANVAS_SIZE / 2)
    }
  }
}

// 改变方向
const changeDirection = (direction: Direction) => {
  pacman.value.direction = direction
}

// 键盘控制
const handleKeydown = (event: KeyboardEvent) => {
  if (!isPlaying.value || isPaused.value) return

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
