<template>
  <div class="container mx-auto p-5 bg-white rounded-lg shadow-md">
    <div class="flex flex-col items-center">
      <h1 class="text-2xl text-gray-800 py-5">中国象棋</h1>

      <!-- 游戏控制区 -->
      <div class="flex gap-4 mb-6">
        <v-btn color="primary" @click="startNewGame">
          新游戏
        </v-btn>
        <v-btn color="error" @click="undoMove" :disabled="!canUndo">
          悔棋
        </v-btn>
      </div>

      <!-- 游戏状态显示 -->
      <div class="mb-4 text-lg font-semibold" 
           :class="{
             'text-red-600': currentPlayer === 'red',
             'text-black': currentPlayer === 'black'
           }">
        {{ gameOver ? '游戏结束' : `当前回合: ${currentPlayer === 'red' ? '红方' : '黑方'}` }}
        <span v-if="isCheck" class="ml-2 text-red-600 animate-pulse">
          将军！
        </span>
      </div>

      <!-- 棋盘容器 -->
      <div ref="boardContainer" class="relative">
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
type Player = 'red' | 'black'
type PieceType = '帅' | '将' | '士' | '相' | '象' | '马' | '车' | '炮' | '兵' | '卒'
type Position = { row: number; col: number }
type Piece = {
  type: PieceType
  player: Player
  row: number
  col: number
}

// 棋盘常量
const BOARD_SIZE = { rows: 10, cols: 9 }
const CELL_SIZE = 60
const BOARD_PADDING = 30
const PIECE_RADIUS = 25

// 状态变量
const currentPlayer = ref<Player>('red')
const gameOver = ref(false)
const pieces = ref<Piece[]>([])
const selectedPiece = ref<Piece | null>(null)
const validMoves = ref<Position[]>([])
const boardCanvas = ref<HTMLCanvasElement | null>(null)
const boardContainer = ref<HTMLElement | null>(null)
const canUndo = ref(false)
const moveHistory = ref<Piece[][]>([])
const checkSound = new Audio('/sounds/check.wav') // 需要添加音效文件
const captureSound = new Audio('/sounds/capture.wav') // 可选的吃子音效
const eatSound = new Audio('/sounds/eat.wav')

// 添加将军状态
const isCheck = ref(false)

// 计算棋盘总大小
const BOARD_WIDTH = CELL_SIZE * (BOARD_SIZE.cols - 1) + BOARD_PADDING * 2
const BOARD_HEIGHT = CELL_SIZE * (BOARD_SIZE.rows - 1) + BOARD_PADDING * 2

// 初始化棋子位置
function initializePieces() {
  const initialPieces: Piece[] = [
    // 红方
    { type: '车', player: 'red', row: 9, col: 0 },
    { type: '马', player: 'red', row: 9, col: 1 },
    { type: '相', player: 'red', row: 9, col: 2 },
    { type: '士', player: 'red', row: 9, col: 3 },
    { type: '帅', player: 'red', row: 9, col: 4 },
    { type: '士', player: 'red', row: 9, col: 5 },
    { type: '相', player: 'red', row: 9, col: 6 },
    { type: '马', player: 'red', row: 9, col: 7 },
    { type: '车', player: 'red', row: 9, col: 8 },
    { type: '炮', player: 'red', row: 7, col: 1 },
    { type: '炮', player: 'red', row: 7, col: 7 },
    { type: '兵', player: 'red', row: 6, col: 0 },
    { type: '兵', player: 'red', row: 6, col: 2 },
    { type: '兵', player: 'red', row: 6, col: 4 },
    { type: '兵', player: 'red', row: 6, col: 6 },
    { type: '兵', player: 'red', row: 6, col: 8 },

    // 黑方
    { type: '车', player: 'black', row: 0, col: 0 },
    { type: '马', player: 'black', row: 0, col: 1 },
    { type: '象', player: 'black', row: 0, col: 2 },
    { type: '士', player: 'black', row: 0, col: 3 },
    { type: '将', player: 'black', row: 0, col: 4 },
    { type: '士', player: 'black', row: 0, col: 5 },
    { type: '象', player: 'black', row: 0, col: 6 },
    { type: '马', player: 'black', row: 0, col: 7 },
    { type: '车', player: 'black', row: 0, col: 8 },
    { type: '炮', player: 'black', row: 2, col: 1 },
    { type: '炮', player: 'black', row: 2, col: 7 },
    { type: '卒', player: 'black', row: 3, col: 0 },
    { type: '卒', player: 'black', row: 3, col: 2 },
    { type: '卒', player: 'black', row: 3, col: 4 },
    { type: '卒', player: 'black', row: 3, col: 6 },
    { type: '卒', player: 'black', row: 3, col: 8 }
  ]

  pieces.value = initialPieces
}

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

  // 绘制横线（10条）
  for (let i = 0; i < 10; i++) {
    const y = BOARD_PADDING + i * CELL_SIZE
    ctx.moveTo(BOARD_PADDING, y)
    ctx.lineTo(BOARD_WIDTH - BOARD_PADDING, y)
  }

  // 绘制竖线（9条）
  for (let i = 0; i < 9; i++) {
    const x = BOARD_PADDING + i * CELL_SIZE
    // 上半部分（0-4）
    ctx.moveTo(x, BOARD_PADDING)
    ctx.lineTo(x, BOARD_PADDING + 4 * CELL_SIZE)
    // 下半部分（5-9）
    ctx.moveTo(x, BOARD_PADDING + 5 * CELL_SIZE)
    ctx.lineTo(x, BOARD_HEIGHT - BOARD_PADDING)
  }
  ctx.stroke()

  // 绘制楚河汉界
  ctx.font = '30px KaiTi'
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('楚 河', BOARD_WIDTH / 4, BOARD_HEIGHT / 2)
  ctx.fillText('汉 界', BOARD_WIDTH * 3 / 4, BOARD_HEIGHT / 2)

  // 绘制斜线（九宫格）
  ctx.beginPath()
  ctx.lineWidth = 1
  // 红方九宫格
  const redStartX = BOARD_PADDING + 3 * CELL_SIZE
  const redStartY = BOARD_PADDING + 7 * CELL_SIZE
  const redEndX = BOARD_PADDING + 5 * CELL_SIZE
  const redEndY = BOARD_PADDING + 9 * CELL_SIZE
  ctx.moveTo(redStartX, redStartY)
  ctx.lineTo(redEndX, redEndY)
  ctx.moveTo(redEndX, redStartY)
  ctx.lineTo(redStartX, redEndY)
  
  // 黑方九宫格
  const blackStartX = BOARD_PADDING + 3 * CELL_SIZE
  const blackStartY = BOARD_PADDING
  const blackEndX = BOARD_PADDING + 5 * CELL_SIZE
  const blackEndY = BOARD_PADDING + 2 * CELL_SIZE
  ctx.moveTo(blackStartX, blackStartY)
  ctx.lineTo(blackEndX, blackEndY)
  ctx.moveTo(blackEndX, blackStartY)
  ctx.lineTo(blackStartX, blackEndY)
  
  ctx.stroke()

  // 绘制兵/卒位置标记
  drawPositionMarks(ctx)
}

// 绘制兵/卒位置标记
function drawPositionMarks(ctx: CanvasRenderingContext2D) {
  const markSize = 6
  const positions = [
    // 黑方（卒）位置
    { row: 3, cols: [0, 2, 4, 6, 8] },
    // 红方（兵）位置
    { row: 6, cols: [0, 2, 4, 6, 8] },
    // 炮位置
    { row: 2, cols: [1, 7] },
    { row: 7, cols: [1, 7] }
  ]

  ctx.beginPath()
  positions.forEach(({ row, cols }) => {
    cols.forEach(col => {
      const x = BOARD_PADDING + col * CELL_SIZE
      const y = BOARD_PADDING + row * CELL_SIZE
      
      // 绘制十字标记
      if (col > 0) { // 左
        ctx.moveTo(x - markSize, y)
        ctx.lineTo(x - 1, y)
      }
      if (col < 8) { // 右
        ctx.moveTo(x + 1, y)
        ctx.lineTo(x + markSize, y)
      }
      if (row > 0) { // 上
        ctx.moveTo(x, y - markSize)
        ctx.lineTo(x, y - 1)
      }
      if (row < 9) { // 下
        ctx.moveTo(x, y + 1)
        ctx.lineTo(x, y + markSize)
      }
    })
  })
  ctx.stroke()
}

// 绘制棋子
function drawPieces(ctx: CanvasRenderingContext2D) {
  pieces.value.forEach(piece => {
    const x = BOARD_PADDING + piece.col * CELL_SIZE
    const y = BOARD_PADDING + piece.row * CELL_SIZE

    // 绘制棋子背景
    ctx.beginPath()
    ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = '#f0d5b6'
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    ctx.stroke()

    // 绘制棋子文字
    ctx.font = '24px KaiTi'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = piece.player === 'red' ? '#ff0000' : '#000000'
    ctx.fillText(piece.type, x, y)

    // 绘制选中状态
    if (selectedPiece.value === piece) {
      ctx.beginPath()
      ctx.arc(x, y, PIECE_RADIUS + 2, 0, Math.PI * 2)
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  })

  // 绘制有效移动位置
  validMoves.value.forEach(pos => {
    const x = BOARD_PADDING + pos.col * CELL_SIZE
    const y = BOARD_PADDING + pos.row * CELL_SIZE

    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#00ff00'
    ctx.fill()
  })
}

// 更新画布
function updateCanvas() {
  const ctx = boardCanvas.value?.getContext('2d')
  if (!ctx) return

  drawBoard(ctx)
  drawPieces(ctx)
}

// 获取点击位置对应的棋盘坐标
function getBoardPosition(clientX: number, clientY: number): Position | null {
  if (!boardCanvas.value) return null

  const rect = boardCanvas.value.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top

  const col = Math.round((x - BOARD_PADDING) / CELL_SIZE)
  const row = Math.round((y - BOARD_PADDING) / CELL_SIZE)

  if (col >= 0 && col < BOARD_SIZE.cols && row >= 0 && row < BOARD_SIZE.rows) {
    return { row, col }
  }

  return null
}

// 添加检查将军的函数
function checkForCheck(player: Player): boolean {
  // 找到对方的将/帅
  const king = pieces.value.find(p => 
    p.player !== player && (p.type === '将' || p.type === '帅')
  )
  if (!king) return false

  // 检查所有己方棋子是否可以吃到对方的将/帅
  return pieces.value.some(piece => {
    if (piece.player === player) {
      const moves = getValidMoves(piece)
      return moves.some(move => move.row === king.row && move.col === king.col)
    }
    return false
  })
}

// 处理点击事件
function handleClick(event: MouseEvent) {
  if (gameOver.value) return

  const pos = getBoardPosition(event.clientX, event.clientY)
  if (!pos) return

  const clickedPiece = pieces.value.find(p => p.row === pos.row && p.col === pos.col)

  // 如果已经选中了棋子
  if (selectedPiece.value) {
    // 如果点击的是有效移动位置
    if (validMoves.value.some(move => move.row === pos.row && move.col === pos.col)) {
      // 保存当前状态用于悔棋
      moveHistory.value.push([...pieces.value])
      
      // 移动棋子
      const targetPiece = pieces.value.find(p => p.row === pos.row && p.col === pos.col)
      if (targetPiece) {
        // 吃子
        pieces.value = pieces.value.filter(p => p !== targetPiece)
        eatSound.play().catch(() => {}) // 播放吃子音效
        
        // 检查是否将军
        if (targetPiece.type === '将' || targetPiece.type === '帅') {
          gameOver.value = true
        }
      } else {
        // 只是移动棋子
        captureSound.play().catch(() => {}) // 播放走子音效
      }

      selectedPiece.value.row = pos.row
      selectedPiece.value.col = pos.col
      
      // 检查是否将军
      const nextPlayer = currentPlayer.value === 'red' ? 'black' : 'red'
      isCheck.value = checkForCheck(currentPlayer.value)
      
      if (isCheck.value) {
        checkSound.play().catch(() => {}) // 播放将军音效
      }
      
      // 切换玩家
      currentPlayer.value = nextPlayer
      canUndo.value = true
      
      // 清除选中状态和有效移动
      selectedPiece.value = null
      validMoves.value = []
    } else if (clickedPiece?.player === currentPlayer.value) {
      // 如果点击的是己方棋子，更新选中状态
      selectedPiece.value = clickedPiece
      validMoves.value = getValidMoves(clickedPiece)
    } else {
      // 点击其他位置，清除选中状态
      selectedPiece.value = null
      validMoves.value = []
    }
  } else if (clickedPiece?.player === currentPlayer.value) {
    // 选中己方棋子
    selectedPiece.value = clickedPiece
    validMoves.value = getValidMoves(clickedPiece)
  }

  updateCanvas()
}

// 获取有效移动位置
function getValidMoves(piece: Piece): Position[] {
  const moves: Position[] = []
  
  switch (piece.type) {
    case '车':
      // 车可以横竖移动任意格
      addStraightMoves(piece, moves)
      break
    case '马':
      // 马走日，注意蹩马腿
      addHorseMoves(piece, moves)
      break
    case '相':
    case '象':
      // 相/象走田，不能过河
      addElephantMoves(piece, moves)
      break
    case '士':
      // 士走斜线，限制在九宫格内
      addAdvisorMoves(piece, moves)
      break
    case '帅':
    case '将':
      // 帅/将走直线，限制在九宫格内
      addKingMoves(piece, moves)
      break
    case '炮':
      // 炮走直线，隔子吃子
      addCannonMoves(piece, moves)
      break
    case '兵':
    case '卒':
      // 兵/卒向前走，过河后可以横走
      addPawnMoves(piece, moves)
      break
  }

  return moves
}

// 添加直线移动（车）
function addStraightMoves(piece: Piece, moves: Position[]) {
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]
  
  directions.forEach(([dx, dy]) => {
    let x = piece.col + dx
    let y = piece.row + dy
    
    while (x >= 0 && x < BOARD_SIZE.cols && y >= 0 && y < BOARD_SIZE.rows) {
      const targetPiece = pieces.value.find(p => p.col === x && p.row === y)
      
      if (!targetPiece) {
        moves.push({ row: y, col: x })
      } else {
        if (targetPiece.player !== piece.player) {
          moves.push({ row: y, col: x })
        }
        break
      }
      
      x += dx
      y += dy
    }
  })
}

// 添加马的移动
function addHorseMoves(piece: Piece, moves: Position[]) {
  const directions = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ]
  
  directions.forEach(([dy, dx]) => {
    const newRow = piece.row + dy
    const newCol = piece.col + dx
    
    if (newRow >= 0 && newRow < BOARD_SIZE.rows && 
        newCol >= 0 && newCol < BOARD_SIZE.cols) {
      // 修正蹩马腿的检查逻辑
      const legRow = piece.row + (Math.abs(dy) === 2 ? Math.sign(dy) : 0)
      const legCol = piece.col + (Math.abs(dx) === 2 ? Math.sign(dx) : 0)
      const legPiece = pieces.value.find(p => p.row === legRow && p.col === legCol)
      
      if (!legPiece) {
        const targetPiece = pieces.value.find(p => p.row === newRow && p.col === newCol)
        if (!targetPiece || targetPiece.player !== piece.player) {
          moves.push({ row: newRow, col: newCol })
        }
      }
    }
  })
}

// 添加相/象的移动
function addElephantMoves(piece: Piece, moves: Position[]) {
  const directions = [[-2, -2], [-2, 2], [2, -2], [2, 2]]
  
  directions.forEach(([dy, dx]) => {
    const newRow = piece.row + dy
    const newCol = piece.col + dx
    
    // 检查是否过河和是否在棋盘内
    if (newRow >= 0 && newRow < BOARD_SIZE.rows && 
        newCol >= 0 && newCol < BOARD_SIZE.cols &&
        ((piece.player === 'red' && newRow >= 5) || 
         (piece.player === 'black' && newRow <= 4))) {
      
      // 检查象眼
      const eyeRow = piece.row + dy/2
      const eyeCol = piece.col + dx/2
      const eyePiece = pieces.value.find(p => p.row === eyeRow && p.col === eyeCol)
      
      if (!eyePiece) {
        const targetPiece = pieces.value.find(p => p.row === newRow && p.col === newCol)
        if (!targetPiece || targetPiece.player !== piece.player) {
          moves.push({ row: newRow, col: newCol })
        }
      }
    }
  })
}

// 添加士的移动
function addAdvisorMoves(piece: Piece, moves: Position[]) {
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
  
  directions.forEach(([dy, dx]) => {
    const newRow = piece.row + dy
    const newCol = piece.col + dx
    
    // 检查是否在九宫格内
    if (newCol >= 3 && newCol <= 5 && 
        ((piece.player === 'red' && newRow >= 7 && newRow <= 9) ||
         (piece.player === 'black' && newRow >= 0 && newRow <= 2))) {
      
      const targetPiece = pieces.value.find(p => p.row === newRow && p.col === newCol)
      if (!targetPiece || targetPiece.player !== piece.player) {
        moves.push({ row: newRow, col: newCol })
      }
    }
  })
}

// 添加帅/将的移动
function addKingMoves(piece: Piece, moves: Position[]) {
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]
  
  directions.forEach(([dy, dx]) => {
    const newRow = piece.row + dy
    const newCol = piece.col + dx
    
    // 检查是否在九宫格内
    if (newCol >= 3 && newCol <= 5 && 
        ((piece.player === 'red' && newRow >= 7 && newRow <= 9) ||
         (piece.player === 'black' && newRow >= 0 && newRow <= 2))) {
      
      const targetPiece = pieces.value.find(p => p.row === newRow && p.col === newCol)
      if (!targetPiece || targetPiece.player !== piece.player) {
        moves.push({ row: newRow, col: newCol })
      }
    }
  })
}

// 添加炮的移动
function addCannonMoves(piece: Piece, moves: Position[]) {
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]]
  
  directions.forEach(([dy, dx]) => {
    let newRow = piece.row + dy
    let newCol = piece.col + dx
    let foundPlatform = false
    
    while (newRow >= 0 && newRow < BOARD_SIZE.rows && 
           newCol >= 0 && newCol < BOARD_SIZE.cols) {
      const targetPiece = pieces.value.find(p => p.row === newRow && p.col === newCol)
      
      if (!foundPlatform) {
        if (!targetPiece) {
          moves.push({ row: newRow, col: newCol })
        } else {
          foundPlatform = true
        }
      } else {
        if (targetPiece) {
          if (targetPiece.player !== piece.player) {
            moves.push({ row: newRow, col: newCol })
          }
          break
        }
      }
      
      newRow += dy
      newCol += dx
    }
  })
}

// 添加兵/卒的移动
function addPawnMoves(piece: Piece, moves: Position[]) {
  const direction = piece.player === 'red' ? -1 : 1
  
  // 向前移动
  const forwardRow = piece.row + direction
  if (forwardRow >= 0 && forwardRow < BOARD_SIZE.rows) {
    const targetPiece = pieces.value.find(p => p.row === forwardRow && p.col === piece.col)
    if (!targetPiece || targetPiece.player !== piece.player) {
      moves.push({ row: forwardRow, col: piece.col })
    }
  }
  
  // 过河后可以左右移动
  if ((piece.player === 'red' && piece.row < 5) ||
      (piece.player === 'black' && piece.row > 4)) {
    [-1, 1].forEach(dx => {
      const newCol = piece.col + dx
      if (newCol >= 0 && newCol < BOARD_SIZE.cols) {
        const targetPiece = pieces.value.find(p => p.row === piece.row && p.col === newCol)
        if (!targetPiece || targetPiece.player !== piece.player) {
          moves.push({ row: piece.row, col: newCol })
        }
      }
    })
  }
}

// 悔棋
function undoMove() {
  if (!canUndo.value || moveHistory.value.length === 0) return
  
  pieces.value = [...moveHistory.value.pop()!]
  currentPlayer.value = currentPlayer.value === 'red' ? 'black' : 'red'
  selectedPiece.value = null
  validMoves.value = []
  canUndo.value = false
  gameOver.value = false
  
  updateCanvas()
}

// 开始新游戏
function startNewGame() {
  initializePieces()
  currentPlayer.value = 'red'
  gameOver.value = false
  selectedPiece.value = null
  validMoves.value = []
  moveHistory.value = []
  canUndo.value = false
  updateCanvas()
}

// 生命周期钩子
onMounted(() => {
  if (boardCanvas.value) {
    boardCanvas.value.width = BOARD_WIDTH
    boardCanvas.value.height = BOARD_HEIGHT
    startNewGame()
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

<style scoped>
.board-container {
  user-select: none;
}
</style> 