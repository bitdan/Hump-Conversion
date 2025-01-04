<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- 标题区域 -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          连连看
        </h1>
        <div class="mt-2 flex justify-center items-center gap-8">
          <p class="text-gray-600">
            <v-icon icon="mdi-clock-outline" class="text-blue-500" />
            剩余时间: {{ formatTime(remainingTime) }}
          </p>
          <p class="text-gray-600">
            <v-icon icon="mdi-star" class="text-yellow-500" />
            得分: {{ score }}
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
          class="bg-white rounded-lg shadow-xl cursor-pointer"
          @click="handleClick"
        ></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 游戏常量
const CANVAS_SIZE = 600
const GRID_SIZE = 8
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE
const ICON_SIZE = CELL_SIZE * 0.8

// 游戏状态
const gameCanvas = ref<HTMLCanvasElement | null>(null)
const isPlaying = ref(false)
const isPaused = ref(false)
const score = ref(0)
const remainingTime = ref(300) // 5分钟
let gameLoop: number | null = null
let timerInterval: ReturnType<typeof setInterval> | null = null

// 游戏数据
const board = ref<number[][]>([])
const selectedCell = ref<{ x: number; y: number } | null>(null)

// Emoji 图标集合
const icons = [
  '🐱', '🐶', '🐼', '🐨', '🦊', '🦁', '🐯', '🐸',
  '🍎', '🍌', '🍊', '🍇', '🍓', '🍉', '🥝', '🍐',
  '⭐', '🌙', '☀️', '🌈', '🌸', '🌺', '🌻', '🌹'
]

// 初始化游戏板
const initializeBoard = () => {
  const pairs = []
  // 创建图标对
  for (let i = 0; i < (GRID_SIZE * GRID_SIZE) / 2; i++) {
    const iconIndex = i % icons.length
    pairs.push(iconIndex, iconIndex)
  }
  
  // 随机打乱
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pairs[i], pairs[j]] = [pairs[j], pairs[i]]
  }
  
  // 填充游戏板
  board.value = []
  for (let i = 0; i < GRID_SIZE; i++) {
    const row = []
    for (let j = 0; j < GRID_SIZE; j++) {
      row.push(pairs[i * GRID_SIZE + j])
    }
    board.value.push(row)
  }
}

// 绘制游戏画面
const draw = () => {
  const ctx = gameCanvas.value?.getContext('2d')
  if (!ctx) return

  // 清空画布
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // 绘制网格和图标
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const x = j * CELL_SIZE
      const y = i * CELL_SIZE
      
      // 绘制单元格边框
      ctx.strokeStyle = '#e5e7eb'
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE)
      
      // 如果有图标，绘制图标
      if (board.value[i][j] !== -1) {
        // 绘制背景
        if (selectedCell.value?.x === j && selectedCell.value?.y === i) {
          ctx.fillStyle = '#e5e7eb'
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE)
        }
        
        // 绘制图标
        const icon = icons[board.value[i][j]]
        ctx.font = `${ICON_SIZE}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(
          icon,
          x + CELL_SIZE / 2,
          y + CELL_SIZE / 2
        )
        
        // 添加选中效果
        if (selectedCell.value?.x === j && selectedCell.value?.y === i) {
          ctx.strokeStyle = '#4f46e5'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.roundRect(
            x + 2,
            y + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4,
            8
          )
          ctx.stroke()
          
          // 添加发光效果
          ctx.shadowColor = '#4f46e5'
          ctx.shadowBlur = 10
          ctx.stroke()
          ctx.shadowBlur = 0
        }
      }
    }
  }
}

// 检查两点是否可以连接
const canConnect = (x1: number, y1: number, x2: number, y2: number): boolean => {
  // 检查是否是同一个图标
  if (board.value[y1][x1] !== board.value[y2][x2]) return false
  
  // 检查直线连接
  if (canDirectConnect(x1, y1, x2, y2)) return true
  
  // 检查一次转弯
  if (canOneCornerConnect(x1, y1, x2, y2)) return true
  
  // 检查两次转弯
  if (canTwoCornerConnect(x1, y1, x2, y2)) return true
  
  return false
}

// 检查是否可以直线连接
const canDirectConnect = (x1: number, y1: number, x2: number, y2: number): boolean => {
  // 如果在同一行
  if (y1 === y2) {
    const minX = Math.min(x1, x2)
    const maxX = Math.max(x1, x2)
    // 检查中间是否有阻碍
    for (let x = minX + 1; x < maxX; x++) {
      if (board.value[y1][x] !== -1) return false
    }
    return true
  }
  
  // 如果在同一列
  if (x1 === x2) {
    const minY = Math.min(y1, y2)
    const maxY = Math.max(y1, y2)
    // 检查中间是否有阻碍
    for (let y = minY + 1; y < maxY; y++) {
      if (board.value[y][x1] !== -1) return false
    }
    return true
  }
  
  return false
}

// 检查是否可以一次转弯连接
const canOneCornerConnect = (x1: number, y1: number, x2: number, y2: number): boolean => {
  // 检查转角点(x1,y2)
  if (board.value[y2][x1] === -1 && 
      canDirectConnect(x1, y1, x1, y2) && 
      canDirectConnect(x1, y2, x2, y2)) {
    return true
  }
  
  // 检查转角点(x2,y1)
  if (board.value[y1][x2] === -1 && 
      canDirectConnect(x1, y1, x2, y1) && 
      canDirectConnect(x2, y1, x2, y2)) {
    return true
  }
  
  return false
}

// 检查是否可以两次转弯连接
const canTwoCornerConnect = (x1: number, y1: number, x2: number, y2: number): boolean => {
  // 检查所有可能的中间点
  for (let x = -1; x <= GRID_SIZE; x++) {
    // 检查通过点(x,y1)和(x,y2)的连接
    if (x !== x1 && x !== x2) {
      if (canDirectConnect(x1, y1, x, y1) && 
          board.value[y1][x] === -1 && 
          canDirectConnect(x, y1, x, y2) && 
          canDirectConnect(x, y2, x2, y2)) {
        return true
      }
    }
  }
  
  for (let y = -1; y <= GRID_SIZE; y++) {
    // 检查通过点(x1,y)和(x2,y)的连接
    if (y !== y1 && y !== y2) {
      if (canDirectConnect(x1, y1, x1, y) && 
          board.value[y][x1] === -1 && 
          canDirectConnect(x1, y, x2, y) && 
          canDirectConnect(x2, y, x2, y2)) {
        return true
      }
    }
  }
  
  return false
}

// 获取连接路径
const getConnectPath = (x1: number, y1: number, x2: number, y2: number): { x: number; y: number }[] | null => {
  if (!canConnect(x1, y1, x2, y2)) return null
  
  const path = [{ x: x1, y: y1 }]
  
  // 直线连接
  if (canDirectConnect(x1, y1, x2, y2)) {
    path.push({ x: x2, y: y2 })
    return path
  }
  
  // 一次转弯
  // 检查转角点(x1,y2)
  if (board.value[y2][x1] === -1 && 
      canDirectConnect(x1, y1, x1, y2) && 
      canDirectConnect(x1, y2, x2, y2)) {
    path.push({ x: x1, y: y2 })
    path.push({ x: x2, y: y2 })
    return path
  }
  
  // 检查转角点(x2,y1)
  if (board.value[y1][x2] === -1 && 
      canDirectConnect(x1, y1, x2, y1) && 
      canDirectConnect(x2, y1, x2, y2)) {
    path.push({ x: x2, y: y1 })
    path.push({ x: x2, y: y2 })
    return path
  }
  
  // 两次转弯
  for (let x = -1; x <= GRID_SIZE; x++) {
    if (x !== x1 && x !== x2) {
      if (canDirectConnect(x1, y1, x, y1) && 
          board.value[y1][x] === -1 && 
          canDirectConnect(x, y1, x, y2) && 
          canDirectConnect(x, y2, x2, y2)) {
        path.push({ x, y: y1 })
        path.push({ x, y: y2 })
        path.push({ x: x2, y: y2 })
        return path
      }
    }
  }
  
  for (let y = -1; y <= GRID_SIZE; y++) {
    if (y !== y1 && y !== y2) {
      if (canDirectConnect(x1, y1, x1, y) && 
          board.value[y][x1] === -1 && 
          canDirectConnect(x1, y, x2, y) && 
          canDirectConnect(x2, y, x2, y2)) {
        path.push({ x: x1, y })
        path.push({ x: x2, y })
        path.push({ x: x2, y: y2 })
        return path
      }
    }
  }
  
  return null
}

// 绘制连接路径
const drawPath = (path: { x: number; y: number }[]) => {
  const ctx = gameCanvas.value?.getContext('2d')
  if (!ctx) return

  ctx.strokeStyle = '#4f46e5'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(
    path[0].x * CELL_SIZE + CELL_SIZE / 2,
    path[0].y * CELL_SIZE + CELL_SIZE / 2
  )

  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(
      path[i].x * CELL_SIZE + CELL_SIZE / 2,
      path[i].y * CELL_SIZE + CELL_SIZE / 2
    )
  }
  
  ctx.stroke()
}

// 处理点击事件
const handleClick = (event: MouseEvent) => {
  if (!isPlaying.value || isPaused.value) return
  
  const rect = (event.target as HTMLCanvasElement).getBoundingClientRect()
  const x = Math.floor((event.clientX - rect.left) / CELL_SIZE)
  const y = Math.floor((event.clientY - rect.top) / CELL_SIZE)
  
  if (board.value[y][x] === -1) return
  
  if (!selectedCell.value) {
    selectedCell.value = { x, y }
  } else {
    if (selectedCell.value.x === x && selectedCell.value.y === y) {
      selectedCell.value = null
    } else if (canConnect(selectedCell.value.x, selectedCell.value.y, x, y)) {
      // 获取连接路径并显示
      const path = getConnectPath(selectedCell.value.x, selectedCell.value.y, x, y)
      if (path) {
        drawPath(path)
      }
      
      // 添加消除动画
      setTimeout(() => {
        // 消除配对
        board.value[selectedCell.value.y][selectedCell.value.x] = -1
        board.value[y][x] = -1
        selectedCell.value = null
        score.value += 10
        
        // 检查游戏是否结束
        if (isGameComplete()) {
          endGame(true)
        }
        draw()
      }, 200)
    } else {
      selectedCell.value = { x, y }
    }
  }
  
  draw()
}

// 检查游戏是否完成
const isGameComplete = (): boolean => {
  return board.value.every(row => row.every(cell => cell === -1))
}

// 格式化时间
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 开始游戏
const startGame = () => {
  if (isPlaying.value) return
  
  isPlaying.value = true
  isPaused.value = false
  score.value = 0
  remainingTime.value = 300
  selectedCell.value = null
  
  initializeBoard()
  draw()
  
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (!isPaused.value) {
      remainingTime.value--
      if (remainingTime.value <= 0) {
        endGame(false)
      }
    }
  }, 1000)
}

// 暂停游戏
const pauseGame = () => {
  isPaused.value = !isPaused.value
}

// 结束游戏
const endGame = (win: boolean) => {
  isPlaying.value = false
  if (timerInterval) clearInterval(timerInterval)
  
  const ctx = gameCanvas.value?.getContext('2d')
  if (ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    ctx.fillStyle = '#fff'
    ctx.font = '48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(
      win ? '恭喜过关!' : '游戏结束!',
      CANVAS_SIZE / 2,
      CANVAS_SIZE / 2 - 30
    )
    ctx.font = '24px Arial'
    ctx.fillText(
      `最终得分: ${score.value}`,
      CANVAS_SIZE / 2,
      CANVAS_SIZE / 2 + 30
    )
  }
}

// 生命周期钩子
onMounted(() => {
  draw()
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script> 

