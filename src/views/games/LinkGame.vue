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
const BOARD_SIZE = 10 // 整个棋盘大小
const GRID_SIZE = 8  // 图标区域大小
const CELL_SIZE = CANVAS_SIZE / BOARD_SIZE
const ICON_SIZE = CELL_SIZE * 0.8
const PADDING = 1   // 图标区域的偏移量
const INFINITY = 10000
const DIRECTIONS = [
  { dx: 0, dy: 1 }, // 下
  { dx: 0, dy: -1 }, // 上
  { dx: 1, dy: 0 }, // 右
  { dx: -1, dy: 0 } // 左
]

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

// 添加一个新的状态来存储当前的连接线
const currentPath = ref<{ x: number; y: number }[] | null>(null)

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
  
  // 填充游戏板 (10x10, 中间8x8放图标)
  board.value = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(-1))
  let pairIndex = 0
  
  // 只在中间8x8区域放置图标
  for (let i = PADDING; i < PADDING + GRID_SIZE; i++) {
    for (let j = PADDING; j < PADDING + GRID_SIZE; j++) {
      board.value[i][j] = pairs[pairIndex++]
    }
  }
}

// 绘制游戏画面
const draw = () => {
  const ctx = gameCanvas.value?.getContext('2d')
  if (!ctx) return

  // 清空画布
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // 绘制网格
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      const x = j * CELL_SIZE
      const y = i * CELL_SIZE
      
      // 绘制单元格边框
      ctx.strokeStyle = '#e5e7eb'
      ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE)
      
      // 如果在图标区域且有图标，绘制图标
      if (i >= PADDING && i < PADDING + GRID_SIZE && 
          j >= PADDING && j < PADDING + GRID_SIZE && 
          board.value[i][j] !== -1) {
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
        ctx.fillText(icon, x + CELL_SIZE / 2, y + CELL_SIZE / 2)
        
        // 添加选中效果
        if (selectedCell.value?.x === j && selectedCell.value?.y === i) {
          ctx.strokeStyle = '#4f46e5'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.roundRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 8)
          ctx.stroke()
          
          ctx.shadowColor = '#4f46e5'
          ctx.shadowBlur = 10
          ctx.stroke()
          ctx.shadowBlur = 0
        }
      }
    }
  }

  // 绘制连接线
  if (currentPath.value) {
    ctx.strokeStyle = '#4f46e5'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(
      currentPath.value[0].x * CELL_SIZE + CELL_SIZE / 2,
      currentPath.value[0].y * CELL_SIZE + CELL_SIZE / 2
    )

    for (let i = 1; i < currentPath.value.length; i++) {
      ctx.lineTo(
        currentPath.value[i].x * CELL_SIZE + CELL_SIZE / 2,
        currentPath.value[i].y * CELL_SIZE + CELL_SIZE / 2
      )
    }
    
    // 添加线条动画效果
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = '#4f46e5'
    ctx.shadowBlur = 5
    ctx.stroke()
    ctx.shadowBlur = 0
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


// 处理点击事件
const handleClick = (event: MouseEvent) => {
  if (!isPlaying.value || isPaused.value) return
  
  const rect = (event.target as HTMLCanvasElement).getBoundingClientRect()
  const x = Math.floor((event.clientX - rect.left) / CELL_SIZE)
  const y = Math.floor((event.clientY - rect.top) / CELL_SIZE)
  
  if (board.value[y][x] === -1) return
  
  if (!selectedCell.value) {
    selectedCell.value = { x, y }
    currentPath.value = null  // 清除之前的连接线
  } else {
    if (selectedCell.value.x === x && selectedCell.value.y === y) {
      selectedCell.value = null
      currentPath.value = null
    } else {
      const path = findPath(selectedCell.value.x, selectedCell.value.y, x, y)
      if (path) {
        currentPath.value = path  // 保存新的连接线
        draw()  // 立即绘制连接线

        // 添加消除动画
        setTimeout(() => {
          board.value[selectedCell.value.y][selectedCell.value.x] = -1
          board.value[y][x] = -1
          selectedCell.value = null
          currentPath.value = null  // 清除连接线
          score.value += 10

          if (isGameComplete()) {
            endGame(true)
          }
          draw()
        }, 300)  // 延长显示时间以便看清连接线
      } else {
        selectedCell.value = { x, y }
        currentPath.value = null
      }
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
  currentPath.value = null
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

// 替换原有的路径查找相关函数
interface PathNode {
  x: number
  y: number
  distance: number
  turns: number
  prev: PathNode | null
  direction: number // 0:下, 1:上, 2:右, 3:左, -1:起点
}

// 检查两点是否可以连接并返回路径
const findPath = (x1: number, y1: number, x2: number, y2: number): { x: number; y: number }[] | null => {
  if (board.value[y1][x1] !== board.value[y2][x2]) return null
  
  // 创建访问数组 (10x10)
  const visited = Array(BOARD_SIZE).fill(0).map(() => 
    Array(BOARD_SIZE).fill(0).map(() => 
      Array(4).fill(0).map(() => ({
        distance: INFINITY,
        turns: INFINITY
      }))
    )
  )
  
  const queue: PathNode[] = []
  
  // 初始化起点
  for (let i = 0; i < 4; i++) {
    const node: PathNode = {
      x: x1,
      y: y1,
      distance: 0,
      turns: 0,
      prev: null,
      direction: -1
    }
    queue.push(node)
    visited[y1][x1][i].distance = 0
    visited[y1][x1][i].turns = 0
  }
  
  let result: PathNode | null = null
  
  while (queue.length > 0) {
    // 获取距离最小的节点
    const current = queue.reduce((min, node, index) => 
      node.distance < queue[min].distance ? index : min, 0)
    const node = queue.splice(current, 1)[0]
    
    // 到达终点
    if (node.x === x2 && node.y === y2 && node.turns <= 2) {
      result = node
      break
    }
    
    // 遍历四个方向
    for (let i = 0; i < 4; i++) {
      const { dx, dy } = DIRECTIONS[i]
      const newX = node.x + dx
      const newY = node.y + dy
      
      // 检查边界
      if (newX < 0 || newX >= BOARD_SIZE || newY < 0 || newY >= BOARD_SIZE) continue
      
      // 检查是否是有效路径（可以经过空白区域或终点）
      if (board.value[newY][newX] !== -1 && !(newX === x2 && newY === y2)) continue
      
      // 计算转弯数
      const newTurns = node.direction === -1 ? 0 : 
                      node.direction === i ? node.turns : 
                      node.turns + 1
                      
      if (newTurns > 2) continue
      
      // 计算新距离
      const newDistance = node.distance + 1
      
      // 更新最短路径
      if (newDistance < visited[newY][newX][i].distance || 
          (newDistance === visited[newY][newX][i].distance && newTurns < visited[newY][newX][i].turns)) {
        visited[newY][newX][i].distance = newDistance
        visited[newY][newX][i].turns = newTurns
        
        const newNode: PathNode = {
          x: newX,
          y: newY,
          distance: newDistance,
          turns: newTurns,
          prev: node,
          direction: i
        }
        queue.push(newNode)
      }
    }
  }
  
  // 重建路径
  if (!result) return null
  
  const path: { x: number; y: number }[] = []
  let current: PathNode | null = result
  
  while (current) {
    path.unshift({ x: current.x, y: current.y })
    current = current.prev
  }
  
  return path
}
</script> 

