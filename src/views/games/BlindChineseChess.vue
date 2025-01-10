<template>
  <div class="container mx-auto p-2 sm:p-5 bg-white rounded-lg shadow-md">
    <div class="flex flex-col items-center">
      <h1 class="text-xl sm:text-2xl text-gray-800 py-3 sm:py-5">揭棋</h1>

      <!-- 游戏控制区 -->
      <div class="flex gap-2 sm:gap-4 mb-4 sm:mb-6">
        <v-btn size="small" sm:size="medium" color="primary" @click="startNewGame">
          新游戏
        </v-btn>
        <v-btn size="small" sm:size="medium" color="error" @click="undoMove" :disabled="!canUndo">
          悔棋
        </v-btn>
      </div>

      <!-- 游戏状态显示 -->
      <div class="mb-2 sm:mb-4 text-base sm:text-lg font-semibold" 
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
      <div ref="boardContainer" class="relative touch-none">
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
import { ref, onMounted, onUnmounted, computed } from 'vue'

// 类型定义
type Player = 'red' | 'black'
type PieceType = '帅' | '将' | '士' | '相' | '象' | '马' | '车' | '炮' | '兵' | '卒'
type Position = { row: number; col: number }
type Piece = {
  type: PieceType
  player: Player
  row: number
  col: number
  isRevealed: boolean
  originalType?: PieceType // 用于记录暗子的原始类型
}

// 棋盘常量
const BOARD_SIZE = { rows: 10, cols: 9 }
const CELL_SIZE = ref(60)
const BOARD_PADDING = ref(30)
const PIECE_RADIUS = ref(25)

// 计算棋盘总大小
const BOARD_WIDTH = computed(() => CELL_SIZE.value * (BOARD_SIZE.cols - 1) + BOARD_PADDING.value * 2)
const BOARD_HEIGHT = computed(() => CELL_SIZE.value * (BOARD_SIZE.rows - 1) + BOARD_PADDING.value * 2)

// 添加响应式调整函数
function adjustBoardSize() {
  const isMobile = window.innerWidth < 768
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight
  const minDimension = Math.min(screenWidth, screenHeight)

  if (isMobile) {
    CELL_SIZE.value = Math.floor((minDimension - 40) / (BOARD_SIZE.cols + 1))
    BOARD_PADDING.value = Math.floor(CELL_SIZE.value / 2)
    PIECE_RADIUS.value = Math.floor(CELL_SIZE.value * 0.4)
  } else {
    CELL_SIZE.value = 60
    BOARD_PADDING.value = 30
    PIECE_RADIUS.value = 25
  }
}

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
const isCheck = ref(false)
const checkSound = new Audio('/sounds/check.wav')
const captureSound = new Audio('/sounds/capture.wav')
const eatSound = new Audio('/sounds/eat.wav')

// 定义红方棋子的初始位置
// 获取有效移动位置
function getValidMoves(piece: Piece): Position[] {
  const moves: Position[] = []

  // 如果是暗子，使用原始位置的棋子类型来决定走法
  // 如果是明子（已翻开），使用实际的棋子类型来决定走法
  const pieceType = !piece.isRevealed ? piece.originalType : piece.type

  switch (pieceType) {
    case '车':
      moves.push(...getRookMoves(piece))
      break
    case '马':
      moves.push(...getKnightMoves(piece))
      break
    case '相':
    case '象':
      moves.push(...getElephantMoves(piece))
      break
    case '士':
      moves.push(...getAdvisorMoves(piece))
      break
    case '帅':
    case '将':
      moves.push(...getKingMoves(piece))
      break
    case '炮':
      moves.push(...getCannonMoves(piece))
      break
    case '兵':
    case '卒':
      moves.push(...getPawnMoves(piece))
      break
  }

  return moves
}

// 初始化棋子位置
function initializePieces() {
  const initialPieces: Piece[] = [
    // 红方帅（固定位置且显示）
    { type: '帅', player: 'red', row: 9, col: 4, isRevealed: true },
    // 黑方将（固定位置且显示）
    { type: '将', player: 'black', row: 0, col: 4, isRevealed: true }
  ]

  // 创建红方和黑方的棋子类型数组
  const redPieces: PieceType[] = [
    '车', '车', '马', '马', '相', '相', '士', '士', '炮', '炮', '兵', '兵', '兵', '兵', '兵'
  ]
  const blackPieces: PieceType[] = [
    '车', '车', '马', '马', '象', '象', '士', '士', '炮', '炮', '卒', '卒', '卒', '卒', '卒'
  ]

  // 分别打乱红方和黑方棋子
  shuffleArray(redPieces)
  shuffleArray(blackPieces)
  let redIndex = 0
  let blackIndex = 0

  // 添加红方棋子到固定位置
  // 第一排（除了帅）
  for (let col = 0; col < 9; col++) {
    if (col !== 4) { // 跳过帅的位置
      // 根据位置确定原始棋子类型
      let originalType: PieceType
      if (col === 0 || col === 8) originalType = '车'
      else if (col === 1 || col === 7) originalType = '马'
      else if (col === 2 || col === 6) originalType = '相'
      else originalType = '士'

      initialPieces.push({
        type: redPieces[redIndex++],
        player: 'red',
        row: 9,
        col,
        isRevealed: false,
        originalType
      })
    }
  }
  // 炮的位置
  initialPieces.push({
    type: redPieces[redIndex++],
    player: 'red',
    row: 7,
    col: 1,
    isRevealed: false,
    originalType: '炮'
  })
  initialPieces.push({
    type: redPieces[redIndex++],
    player: 'red',
    row: 7,
    col: 7,
    isRevealed: false,
    originalType: '炮'
  })
  // 兵的位置
  for (let col = 0; col < 9; col += 2) {
    initialPieces.push({
      type: redPieces[redIndex++],
      player: 'red',
      row: 6,
      col,
      isRevealed: false,
      originalType: '兵'
    })
  }

  // 添加黑方棋子到固定位置
  // 第一排（除了将）
  for (let col = 0; col < 9; col++) {
    if (col !== 4) { // 跳过将的位置
      // 根据位置确定原始棋子类型
      let originalType: PieceType
      if (col === 0 || col === 8) originalType = '车'
      else if (col === 1 || col === 7) originalType = '马'
      else if (col === 2 || col === 6) originalType = '象'
      else originalType = '士'

      initialPieces.push({
        type: blackPieces[blackIndex++],
        player: 'black',
        row: 0,
        col,
        isRevealed: false,
        originalType
      })
    }
  }
  // 炮的位置
  initialPieces.push({
    type: blackPieces[blackIndex++],
    player: 'black',
    row: 2,
    col: 1,
    isRevealed: false,
    originalType: '炮'
  })
  initialPieces.push({
    type: blackPieces[blackIndex++],
    player: 'black',
    row: 2,
    col: 7,
    isRevealed: false,
    originalType: '炮'
  })
  // 卒的位置
  for (let col = 0; col < 9; col += 2) {
    initialPieces.push({
      type: blackPieces[blackIndex++],
      player: 'black',
      row: 3,
      col,
      isRevealed: false,
      originalType: '卒'
    })
  }

  pieces.value = initialPieces
}

// Fisher-Yates 洗牌算法
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
}

// 绘制棋盘
function drawBoard(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, BOARD_WIDTH.value, BOARD_HEIGHT.value)
  
  // 绘制背景
  ctx.fillStyle = '#DEB887'
  ctx.fillRect(0, 0, BOARD_WIDTH.value, BOARD_HEIGHT.value)

  // 绘制网格线
  ctx.beginPath()
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1

  // 绘制横线（分上下两部分，跳过楚河汉界）
  // 上半部分（0-4行）
  for (let i = 0; i <= 4; i++) {
    const y = BOARD_PADDING.value + i * CELL_SIZE.value
    ctx.moveTo(BOARD_PADDING.value, y)
    ctx.lineTo(BOARD_WIDTH.value - BOARD_PADDING.value, y)
  }
  // 下半部分（5-9行）
  for (let i = 5; i <= 9; i++) {
    const y = BOARD_PADDING.value + i * CELL_SIZE.value
    ctx.moveTo(BOARD_PADDING.value, y)
    ctx.lineTo(BOARD_WIDTH.value - BOARD_PADDING.value, y)
  }

  // 绘制竖线（9条）
  for (let i = 0; i < 9; i++) {
    const x = BOARD_PADDING.value + i * CELL_SIZE.value
    // 上半部分
    ctx.moveTo(x, BOARD_PADDING.value)
    ctx.lineTo(x, BOARD_PADDING.value + 4 * CELL_SIZE.value)
    // 下半部分
    ctx.moveTo(x, BOARD_PADDING.value + 5 * CELL_SIZE.value)
    ctx.lineTo(x, BOARD_HEIGHT.value - BOARD_PADDING.value)
  }
  ctx.stroke()

  // 绘制楚河汉界
  ctx.font = '30px KaiTi'
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('楚 河', BOARD_WIDTH.value / 4, BOARD_HEIGHT.value / 2)
  ctx.fillText('汉 界', BOARD_WIDTH.value * 3 / 4, BOARD_HEIGHT.value / 2)

  // 绘制斜线（九宫格）
  ctx.beginPath()
  ctx.lineWidth = 1
  // 红方九宫格
  const redStartX = BOARD_PADDING.value + 3 * CELL_SIZE.value
  const redStartY = BOARD_PADDING.value + 7 * CELL_SIZE.value
  const redEndX = BOARD_PADDING.value + 5 * CELL_SIZE.value
  const redEndY = BOARD_PADDING.value + 9 * CELL_SIZE.value
  ctx.moveTo(redStartX, redStartY)
  ctx.lineTo(redEndX, redEndY)
  ctx.moveTo(redEndX, redStartY)
  ctx.lineTo(redStartX, redEndY)
  
  // 黑方九宫格
  const blackStartX = BOARD_PADDING.value + 3 * CELL_SIZE.value
  const blackStartY = BOARD_PADDING.value
  const blackEndX = BOARD_PADDING.value + 5 * CELL_SIZE.value
  const blackEndY = BOARD_PADDING.value + 2 * CELL_SIZE.value
  ctx.moveTo(blackStartX, blackStartY)
  ctx.lineTo(blackEndX, blackEndY)
  ctx.moveTo(blackEndX, blackStartY)
  ctx.lineTo(blackStartX, blackEndY)
  
  ctx.stroke()
}

// 绘制棋子
function drawPieces(ctx: CanvasRenderingContext2D) {
  pieces.value.forEach(piece => {
    const x = BOARD_PADDING.value + piece.col * CELL_SIZE.value
    const y = BOARD_PADDING.value + piece.row * CELL_SIZE.value

    // 绘制棋子背景
    ctx.beginPath()
    ctx.arc(x, y, PIECE_RADIUS.value, 0, Math.PI * 2)
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

    // 如果是暗子，显示问号，否则显示棋子类型
    if (!piece.isRevealed && piece.type !== '帅' && piece.type !== '将') {
      ctx.fillText('?', x, y)
    } else {
      ctx.fillText(piece.type, x, y)
    }

    // 如果是选中的棋子，绘制高亮边框
    if (selectedPiece.value === piece) {
      ctx.beginPath()
      ctx.arc(x, y, PIECE_RADIUS.value + 2, 0, Math.PI * 2)
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  })

  // 绘制有效移动位置
  validMoves.value.forEach(move => {
    const x = BOARD_PADDING.value + move.col * CELL_SIZE.value
    const y = BOARD_PADDING.value + move.row * CELL_SIZE.value

    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#00ff00'
    ctx.fill()
  })
}

// 获取点击位置对应的棋盘坐标
function getClickPosition(event: MouseEvent | TouchEvent): Position | null {
  if (!boardCanvas.value) return null

  const rect = boardCanvas.value.getBoundingClientRect()
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
  const x = clientX - rect.left
  const y = clientY - rect.top

  const col = Math.round((x - BOARD_PADDING.value) / CELL_SIZE.value)
  const row = Math.round((y - BOARD_PADDING.value) / CELL_SIZE.value)

  if (col < 0 || col >= BOARD_SIZE.cols || row < 0 || row >= BOARD_SIZE.rows) {
    return null
  }

  return { row, col }
}

// 处理点击事件
function handleClick(event: MouseEvent | TouchEvent) {
  const clickPos = getClickPosition(event)
  if (!clickPos) return

  const clickedPiece = pieces.value.find(p => p.row === clickPos.row && p.col === clickPos.col)

  // 如果已经选中了一个棋子
  if (selectedPiece.value) {
    // 如果点击的是有效移动位置
    if (validMoves.value.some(move => move.row === clickPos.row && move.col === clickPos.col)) {
      movePiece(selectedPiece.value, clickPos)
      selectedPiece.value = null
      validMoves.value = []
    }
    // 如果点击的是自己的另一个棋子
    else if (clickedPiece && clickedPiece.player === currentPlayer.value) {
      selectedPiece.value = clickedPiece
      validMoves.value = getValidMoves(clickedPiece)
    }
    // 如果点击的是空位或对方的棋子，取消选中
    else {
      selectedPiece.value = null
      validMoves.value = []
    }
  }
  // 如果没有选中棋子，且点击的是当前玩家的棋子
  else if (clickedPiece && clickedPiece.player === currentPlayer.value) {
    selectedPiece.value = clickedPiece
    validMoves.value = getValidMoves(clickedPiece)
  }

  redraw()
}

// 移动棋子
function movePiece(piece: Piece, target: Position) {
  // 保存移动历史
  moveHistory.value.push(JSON.parse(JSON.stringify(pieces.value)))
  canUndo.value = true

  const targetPiece = pieces.value.find(p => p.row === target.row && p.col === target.col)
  
  // 如果目标位置有对方的棋子，移除它
  if (targetPiece) {
    pieces.value = pieces.value.filter(p => p !== targetPiece)
    // 播放吃子音效
    eatSound.play().catch(() => {})
    // 如果吃掉的是将或帅，游戏结束
    if (targetPiece.type === '将' || targetPiece.type === '帅') {
      gameOver.value = true
    }
  } else {
    // 如果只是移动棋子，播放走子音效
    captureSound.play().catch(() => {})
  }

  // 移动棋子
  piece.row = target.row
  piece.col = target.col

  // 如果是暗子，翻开它
  if (!piece.isRevealed) {
    piece.isRevealed = true
  }

  // 切换玩家
  currentPlayer.value = currentPlayer.value === 'red' ? 'black' : 'red'

  // 检查是否将军（注意：这里要在切换玩家后检查，因为当前玩家已经变成了对手）
  isCheck.value = checkForCheck()
  if (isCheck.value) {
    // 确保将军音效播放
    setTimeout(() => {
      checkSound.play().catch(() => {})
    }, 100)
  }
}

// 获取车的移动位置
function getRookMoves(piece: Piece): Position[] {
  const moves: Position[] = []
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]

  for (const [dx, dy] of directions) {
    let x = piece.col + dx
    let y = piece.row + dy

    while (x >= 0 && x < BOARD_SIZE.cols && y >= 0 && y < BOARD_SIZE.rows) {
      const targetPiece = pieces.value.find(p => p.row === y && p.col === x)
      if (!targetPiece) {
        moves.push({ row: y, col: x })
      } else if (targetPiece.player !== piece.player) {
        moves.push({ row: y, col: x })
        break
      } else {
        break
      }
      x += dx
      y += dy
    }
  }

  return moves
}

// 获取马的移动位置
function getKnightMoves(piece: Piece): Position[] {
  const moves: Position[] = []
  const possibleMoves = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ]

  for (const [dx, dy] of possibleMoves) {
    const newCol = piece.col + dx
    const newRow = piece.row + dy

    if (newCol >= 0 && newCol < BOARD_SIZE.cols && newRow >= 0 && newRow < BOARD_SIZE.rows) {
      // 检查蹩马腿
      // 对于横向移动（dx = ±2），检查马腿是否被挡住
      // 对于纵向移动（dy = ±2），检查马腿是否被挡住
      const blockingRow = piece.row + (Math.abs(dx) > Math.abs(dy) ? 0 : dy > 0 ? 1 : -1)
      const blockingCol = piece.col + (Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 1 : -1 : 0)
      
      // 检查是否有任何棋子（包括暗子和明子）挡住了马腿
      const blockingPiece = pieces.value.find(p => p.row === blockingRow && p.col === blockingCol)

      if (!blockingPiece) {
        const targetPiece = pieces.value.find(p => p.row === newRow && p.col === newCol)
        if (!targetPiece || targetPiece.player !== piece.player) {
          moves.push({ row: newRow, col: newCol })
        }
      }
    }
  }

  return moves
}

// 获取象的移动位置
function getElephantMoves(piece: Piece): Position[] {
  const moves: Position[] = []
  const possibleMoves = [[-2, -2], [-2, 2], [2, -2], [2, 2]]

  for (const [dx, dy] of possibleMoves) {
    const newCol = piece.col + dx
    const newRow = piece.row + dy

    // 在揭棋中，相（象）可以过河
    if (newCol >= 0 && newCol < BOARD_SIZE.cols && newRow >= 0 && newRow < BOARD_SIZE.rows) {
      // 检查象眼
      const eyeCol = piece.col + dx / 2
      const eyeRow = piece.row + dy / 2
      const eyePiece = pieces.value.find(p => p.row === eyeRow && p.col === eyeCol)

      if (!eyePiece) {
        const targetPiece = pieces.value.find(p => p.row === newRow && p.col === newCol)
        if (!targetPiece || targetPiece.player !== piece.player) {
          moves.push({ row: newRow, col: newCol })
        }
      }
    }
  }

  return moves
}

// 获取士的移动位置
function getAdvisorMoves(piece: Piece): Position[] {
  const moves: Position[] = []
  const possibleMoves = [[-1, -1], [-1, 1], [1, -1], [1, 1]]

  for (const [dx, dy] of possibleMoves) {
    const newCol = piece.col + dx
    const newRow = piece.row + dy

    // 检查是否在棋盘范围内
    if (newCol >= 0 && newCol < BOARD_SIZE.cols && newRow >= 0 && newRow < BOARD_SIZE.rows) {
      // 如果是暗子，只能在九宫格内移动
      if (!piece.isRevealed) {
        // 检查是否在九宫格内
        if (newCol >= 3 && newCol <= 5) {
          if ((piece.player === 'red' && newRow >= 7 && newRow <= 9) ||
              (piece.player === 'black' && newRow >= 0 && newRow <= 2)) {
            const targetPiece = pieces.value.find(p => p.row === newRow && p.col === newCol)
            if (!targetPiece || targetPiece.player !== piece.player) {
              moves.push({ row: newRow, col: newCol })
            }
          }
        }
      } else {
        // 如果是明子，可以在整个棋盘上移动
        const targetPiece = pieces.value.find(p => p.row === newRow && p.col === newCol)
        if (!targetPiece || targetPiece.player !== piece.player) {
          moves.push({ row: newRow, col: newCol })
        }
      }
    }
  }

  return moves
}

// 获取将/帅的移动位置
function getKingMoves(piece: Piece): Position[] {
  const moves: Position[] = []
  const possibleMoves = [[0, 1], [0, -1], [1, 0], [-1, 0]]

  for (const [dx, dy] of possibleMoves) {
    const newCol = piece.col + dx
    const newRow = piece.row + dy

    // 将/帅只能在九宫格内移动
    if (newCol >= 3 && newCol <= 5) {
      if (piece.player === 'red' && newRow >= 7 && newRow <= 9) {
        const targetPiece = pieces.value.find(p => p.row === newRow && p.col === newCol)
        if (!targetPiece || targetPiece.player !== piece.player) {
          moves.push({ row: newRow, col: newCol })
        }
      } else if (piece.player === 'black' && newRow >= 0 && newRow <= 2) {
        const targetPiece = pieces.value.find(p => p.row === newRow && p.col === newCol)
        if (!targetPiece || targetPiece.player !== piece.player) {
          moves.push({ row: newRow, col: newCol })
        }
      }
    }
  }

  return moves
}

// 获取炮的移动位置
function getCannonMoves(piece: Piece): Position[] {
  const moves: Position[] = []
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]

  for (const [dx, dy] of directions) {
    let x = piece.col + dx
    let y = piece.row + dy
    let foundPlatform = false

    while (x >= 0 && x < BOARD_SIZE.cols && y >= 0 && y < BOARD_SIZE.rows) {
      const targetPiece = pieces.value.find(p => p.row === y && p.col === x)
      
      if (!targetPiece) {
        if (!foundPlatform) {
          moves.push({ row: y, col: x })
        }
      } else {
        if (!foundPlatform) {
          foundPlatform = true
        } else {
          if (targetPiece.player !== piece.player) {
            moves.push({ row: y, col: x })
          }
          break
        }
      }
      
      x += dx
      y += dy
    }
  }

  return moves
}

// 获取兵/卒的移动位置
function getPawnMoves(piece: Piece): Position[] {
  const moves: Position[] = []
  
  if (piece.player === 'red') {
    // 红方兵
    // 向上移动
    if (piece.row > 0) {
      const targetPiece = pieces.value.find(p => p.row === piece.row - 1 && p.col === piece.col)
      if (!targetPiece || targetPiece.player !== piece.player) {
        moves.push({ row: piece.row - 1, col: piece.col })
      }
    }
    // 过河后可以左右移动
    if (piece.row < 5) {
      // 向左移动
      if (piece.col > 0) {
        const targetPiece = pieces.value.find(p => p.row === piece.row && p.col === piece.col - 1)
        if (!targetPiece || targetPiece.player !== piece.player) {
          moves.push({ row: piece.row, col: piece.col - 1 })
        }
      }
      // 向右移动
      if (piece.col < BOARD_SIZE.cols - 1) {
        const targetPiece = pieces.value.find(p => p.row === piece.row && p.col === piece.col + 1)
        if (!targetPiece || targetPiece.player !== piece.player) {
          moves.push({ row: piece.row, col: piece.col + 1 })
        }
      }
    }
  } else {
    // 黑方卒
    // 向下移动
    if (piece.row < BOARD_SIZE.rows - 1) {
      const targetPiece = pieces.value.find(p => p.row === piece.row + 1 && p.col === piece.col)
      if (!targetPiece || targetPiece.player !== piece.player) {
        moves.push({ row: piece.row + 1, col: piece.col })
      }
    }
    // 过河后可以左右移动
    if (piece.row > 4) {
      // 向左移动
      if (piece.col > 0) {
        const targetPiece = pieces.value.find(p => p.row === piece.row && p.col === piece.col - 1)
        if (!targetPiece || targetPiece.player !== piece.player) {
          moves.push({ row: piece.row, col: piece.col - 1 })
        }
      }
      // 向右移动
      if (piece.col < BOARD_SIZE.cols - 1) {
        const targetPiece = pieces.value.find(p => p.row === piece.row && p.col === piece.col + 1)
        if (!targetPiece || targetPiece.player !== piece.player) {
          moves.push({ row: piece.row, col: piece.col + 1 })
        }
      }
    }
  }

  return moves
}

// 检查是否将军
function checkForCheck(): boolean {
  // 找到对方的将/帅
  const king = pieces.value.find(p => 
    p.player === currentPlayer.value && (p.type === '将' || p.type === '帅')
  )
  if (!king) return false

  // 检查对手的所有棋子是否可以吃到将/帅
  return pieces.value.some(piece => {
    if (piece.player !== currentPlayer.value) {
      const moves = getValidMoves(piece)
      return moves.some(move => move.row === king.row && move.col === king.col)
    }
    return false
  })
}

// 悔棋
function undoMove() {
  if (moveHistory.value.length > 0) {
    pieces.value = JSON.parse(JSON.stringify(moveHistory.value.pop()!))
    currentPlayer.value = currentPlayer.value === 'red' ? 'black' : 'red'
    selectedPiece.value = null
    validMoves.value = []
    isCheck.value = checkForCheck()
    canUndo.value = moveHistory.value.length > 0
    redraw()
  }
}

// 开始新游戏
function startNewGame() {
  currentPlayer.value = 'red'
  gameOver.value = false
  selectedPiece.value = null
  validMoves.value = []
  moveHistory.value = []
  canUndo.value = false
  isCheck.value = false
  initializePieces()
  redraw()
}

// 重绘棋盘
function redraw() {
  const ctx = boardCanvas.value?.getContext('2d')
  if (!ctx) return

  drawBoard(ctx)
  drawPieces(ctx)
}

// 生命周期钩子
onMounted(() => {
  adjustBoardSize()
  if (boardCanvas.value && boardContainer.value) {
    boardCanvas.value.width = BOARD_WIDTH.value
    boardCanvas.value.height = BOARD_HEIGHT.value
    startNewGame()
  }
})

// 监听窗口大小变化
function handleResize() {
  adjustBoardSize()
  if (boardCanvas.value) {
    boardCanvas.value.width = BOARD_WIDTH.value
    boardCanvas.value.height = BOARD_HEIGHT.value
  }
  updateCanvas()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  // 添加触摸事件监听
  if (boardCanvas.value) {
    boardCanvas.value.addEventListener('touchstart', handleClick)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (boardCanvas.value) {
    boardCanvas.value.removeEventListener('touchstart', handleClick)
  }
})
</script>

<style scoped>
.container {
  min-height: calc(100vh - 64px);
  max-width: 100vw;
  overflow-x: hidden;
}

@media (max-width: 768px) {
  .container {
    padding: 0.5rem;
  }
}
</style> 
