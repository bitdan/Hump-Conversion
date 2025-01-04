<template>
  <div class="container mx-auto p-5 bg-white rounded-lg shadow-md">
    <div class="flex flex-col items-center">
      <h1 class="text-2xl text-gray-800 py-5">围棋</h1>

      <!-- 游戏控制区 -->
      <div class="flex gap-4 mb-6">
        <v-btn color="primary" @click="startNewGame">
          新游戏
        </v-btn>
        <v-btn color="error" @click="undoMove" :disabled="!canUndo">
          悔棋
        </v-btn>
        <v-btn color="warning" @click="pass" :disabled="gameOver">
          虚着
        </v-btn>
      </div>

      <!-- 游戏状态显示 -->
      <div class="mb-4 text-lg font-semibold" :class="{'text-blue-600': currentPlayer === 'black', 'text-gray-600': currentPlayer === 'white'}">
        {{ gameOver ? '游戏结束' : `当前回合: ${currentPlayer === 'black' ? '黑棋' : '白棋'}` }}
      </div>

      <!-- 棋盘容器 -->
      <div ref="boardContainer">
        <canvas 
          ref="boardCanvas" 
          class="border border-gray-300 shadow-md"
          @click="handleClick"
        ></canvas>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 类型定义
type Player = 'black' | 'white'
type Point = { row: number; col: number }
type Position = { x: number; y: number }
type Stone = { row: number; col: number; player: Player }

// 棋盘常量
const BOARD_SIZE = 19
const CELL_SIZE = 30
const BOARD_PADDING = 20
const STONE_RADIUS = 14

// 状态变量
const currentPlayer = ref<Player>('black')
const gameOver = ref(false)
const stones = ref<Stone[]>([])
const lastMove = ref<Stone | null>(null)
const passCount = ref(0)
const boardCanvas = ref<HTMLCanvasElement | null>(null)
const boardContainer = ref<HTMLElement | null>(null)
const canUndo = ref(false)

// 计算棋盘总大小
const BOARD_WIDTH = CELL_SIZE * (BOARD_SIZE - 1) + BOARD_PADDING * 2
const BOARD_HEIGHT = BOARD_WIDTH

// 绘制棋盘
function drawBoard(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)
  
  // 绘制背景
  ctx.fillStyle = '#DEB887'
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)

  // 绘制网格线
  ctx.beginPath()
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1

  // 绘制横线和竖线
  for (let i = 0; i < BOARD_SIZE; i++) {
    const position = BOARD_PADDING + i * CELL_SIZE
    
    // 横线
    ctx.moveTo(BOARD_PADDING, position)
    ctx.lineTo(BOARD_WIDTH - BOARD_PADDING, position)
    
    // 竖线
    ctx.moveTo(position, BOARD_PADDING)
    ctx.lineTo(position, BOARD_HEIGHT - BOARD_PADDING)
  }
  ctx.stroke()

  // 绘制星位
  const starPoints = [
    {x: 3, y: 3}, {x: 9, y: 3}, {x: 15, y: 3},
    {x: 3, y: 9}, {x: 9, y: 9}, {x: 15, y: 9},
    {x: 3, y: 15}, {x: 9, y: 15}, {x: 15, y: 15}
  ]

  starPoints.forEach(point => {
    ctx.beginPath()
    ctx.arc(
      BOARD_PADDING + point.x * CELL_SIZE,
      BOARD_PADDING + point.y * CELL_SIZE,
      4,
      0,
      Math.PI * 2
    )
    ctx.fillStyle = '#000000'
    ctx.fill()
  })
}

// 绘制棋子
function drawStones(ctx: CanvasRenderingContext2D) {
  stones.value.forEach((stone, index) => {
    const x = BOARD_PADDING + stone.col * CELL_SIZE
    const y = BOARD_PADDING + stone.row * CELL_SIZE

    ctx.beginPath()
    ctx.arc(x, y, STONE_RADIUS, 0, Math.PI * 2)
    
    if (stone.player === 'black') {
      ctx.fillStyle = '#000000'
    } else {
      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
    }
    
    ctx.fill()
    if (stone.player === 'white') {
      ctx.stroke()
    }

    // 标记最后一手
    if (index === stones.value.length - 1) {
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fillStyle = stone.player === 'black' ? '#FFFFFF' : '#000000'
      ctx.fill()
    }
  })
}

// 更新画布
function updateCanvas() {
  const ctx = boardCanvas.value?.getContext('2d')
  if (!ctx) return

  drawBoard(ctx)
  drawStones(ctx)
}

// 获取鼠标位置对应的棋盘交叉点
function getBoardPosition(clientX: number, clientY: number): Point | null {
  if (!boardCanvas.value) return null

  const rect = boardCanvas.value.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top

  // 计算最近的交叉点
  const col = Math.round((x - BOARD_PADDING) / CELL_SIZE)
  const row = Math.round((y - BOARD_PADDING) / CELL_SIZE)

  // 检查是否在有效范围内
  if (col >= 0 && col < BOARD_SIZE && row >= 0 && row < BOARD_SIZE) {
    return { row, col }
  }

  return null
}

// 检查是否形成提子
function checkCapture(row: number, col: number, player: Player): Stone[] {
  const opponent = player === 'black' ? 'white' : 'black'
  const captured: Stone[] = []
  
  // 检查四个方向
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]
  
  directions.forEach(([dx, dy]) => {
    const adjacentRow = row + dx
    const adjacentCol = col + dy
    
    // 检查相邻位置是否有对手的棋子
    const adjacentGroup = stones.value.filter(stone => 
      stone.player === opponent &&
      isConnected(stone.row, stone.col, adjacentRow, adjacentCol, opponent)
    )
    
    if (adjacentGroup.length > 0 && !hasLiberty(adjacentGroup)) {
      captured.push(...adjacentGroup)
    }
  })
  
  return captured
}

// 检查棋子组是否有气
function hasLiberty(group: Stone[]): boolean {
  for (const stone of group) {
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]
    
    for (const [dx, dy] of directions) {
      const newRow = stone.row + dx
      const newCol = stone.col + dy
      
      // 检查是否在棋盘范围内
      if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
        // 检查该位置是否为空
        if (!stones.value.some(s => s.row === newRow && s.col === newCol)) {
          return true
        }
      }
    }
  }
  
  return false
}

// 检查两个位置是否相连
function isConnected(row1: number, col1: number, row2: number, col2: number, player: Player): boolean {
  const visited = new Set<string>()
  const queue: Point[] = [{ row: row1, col: col1 }]
  
  while (queue.length > 0) {
    const current = queue.shift()!
    const key = `${current.row},${current.col}`
    
    if (visited.has(key)) continue
    visited.add(key)
    
    if (current.row === row2 && current.col === col2) {
      return true
    }
    
    // 检查四个方向
    const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]
    
    for (const [dx, dy] of directions) {
      const newRow = current.row + dx
      const newCol = current.col + dy
      
      // 检查是否在棋盘范围内且是同色棋子
      if (newRow >= 0 && newRow < BOARD_SIZE && 
          newCol >= 0 && newCol < BOARD_SIZE) {
        const stone = stones.value.find(s => 
          s.row === newRow && s.col === newCol && s.player === player
        )
        
        if (stone) {
          queue.push({ row: newRow, col: newCol })
        }
      }
    }
  }
  
  return false
}

// 处理落子
function handleClick(event: MouseEvent) {
  if (gameOver.value) return

  const pos = getBoardPosition(event.clientX, event.clientY)
  if (!pos) return

  // 检查点击位置是否在有效范围内
  if (pos.row < 0 || pos.row >= BOARD_SIZE || 
      pos.col < 0 || pos.col >= BOARD_SIZE) {
    return
  }

  // 检查该位置是否已有棋子
  if (stones.value.some(stone => stone.row === pos.row && stone.col === pos.col)) {
    return
  }

  // 落子
  const newStone: Stone = {
    row: pos.row,
    col: pos.col,
    player: currentPlayer.value
  }

  // 临时添加新棋子以检查是否有气
  stones.value.push(newStone)
  
  // 获取包含新棋子的群组
  const newGroup = stones.value.filter(stone => 
    stone.player === currentPlayer.value &&
    isConnected(stone.row, stone.col, newStone.row, newStone.col, currentPlayer.value)
  )
  
  // 检查新落子群组是否有气
  const hasLiberties = hasLiberty(newGroup)
  
  // 检查是否能提掉对方的子
  const captured = checkCapture(pos.row, pos.col, currentPlayer.value)
  
  // 如果新落子没气，且没有提掉对方的子，则这是一个无效的落子
  if (!hasLiberties && captured.length === 0) {
    // 移除刚才临时添加的棋子
    stones.value.pop()
    return
  }
  
  // 移除被提的棋子
  if (captured.length > 0) {
    stones.value = stones.value.filter(stone => 
      !captured.some(c => c.row === stone.row && c.col === stone.col)
    )
  }

  lastMove.value = newStone
  canUndo.value = true
  passCount.value = 0

  // 切换玩家
  currentPlayer.value = currentPlayer.value === 'black' ? 'white' : 'black'
  
  // 更新画布
  updateCanvas()
}

// 虚着
function pass() {
  if (gameOver.value) return
  
  passCount.value++
  if (passCount.value >= 2) {
    gameOver.value = true
    return
  }
  
  currentPlayer.value = currentPlayer.value === 'black' ? 'white' : 'black'
}

// 悔棋
function undoMove() {
  if (!canUndo.value || stones.value.length === 0) return
  
  stones.value.pop()
  currentPlayer.value = currentPlayer.value === 'black' ? 'white' : 'black'
  passCount.value = 0
  canUndo.value = false
  updateCanvas()
}

// 开始新游戏
function startNewGame() {
  stones.value = []
  currentPlayer.value = 'black'
  gameOver.value = false
  passCount.value = 0
  canUndo.value = false
  updateCanvas()
}

// 生命周期钩子
onMounted(() => {
  if (boardCanvas.value) {
    boardCanvas.value.width = BOARD_WIDTH
    boardCanvas.value.height = BOARD_HEIGHT
    updateCanvas()
  }
})

// 监听窗口大小变化
function handleResize() {
  updateCanvas()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped></style> 