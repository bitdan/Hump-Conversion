<template>
  <div class="container mx-auto p-5">
    <div class="flex flex-col items-center">
      <h1 class="text-4xl font-bold mb-8 bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
        2048
      </h1>

      <!-- 游戏控制区 -->
      <div class="flex gap-4 mb-6">
        <v-btn 
          color="success" 
          @click="startNewGame" 
          class="px-6"
        >
          新游戏
        </v-btn>
        <v-btn 
          color="warning" 
          @click="undoMove" 
          :disabled="!canUndo"
          class="px-6"
        >
          撤销
        </v-btn>
      </div>

      <!-- 分数显示 -->
      <div class="flex gap-4 mb-6">
        <div class="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white px-6 py-2 rounded-full shadow-lg">
          分数: {{ score }}
        </div>
        <div class="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 text-white px-6 py-2 rounded-full shadow-lg">
          最高分: {{ bestScore }}
        </div>
      </div>

      <!-- 游戏结束提示 -->
      <div 
        v-if="gameOver" 
        class="mb-4 text-2xl font-bold text-red-500 animate-pulse"
      >
        游戏结束
      </div>

      <!-- 游戏网格 -->
      <div 
        class="grid grid-cols-4 gap-3 bg-gradient-to-br from-amber-100 to-orange-100 p-4 rounded-xl shadow-xl"
        :style="{ width: `${GRID_SIZE * 100 + 24}px` }"
      >
        <div 
          v-for="(cell, index) in board" 
          :key="index"
          class="relative w-24 h-24 rounded-lg shadow-inner transition-all duration-200"
          :class="getCellBackground(cell)"
        >
          <div 
            v-if="cell > 0"
            class="absolute inset-0 flex items-center justify-center text-4xl font-bold transition-all duration-200"
            :class="getCellTextColor(cell)"
          >
            {{ cell }}
          </div>
        </div>
      </div>

      <!-- 移动端控制按钮 -->
      <div class="mt-8 grid grid-cols-3 gap-3 md:hidden">
        <div></div>
        <v-btn 
          color="primary" 
          @click="move('up')"
          class="rounded-xl shadow-lg"
        >
          ↑
        </v-btn>
        <div></div>
        <v-btn 
          color="primary" 
          @click="move('left')"
          class="rounded-xl shadow-lg"
        >
          ←
        </v-btn>
        <v-btn 
          color="primary" 
          @click="move('down')"
          class="rounded-xl shadow-lg"
        >
          ↓
        </v-btn>
        <v-btn 
          color="primary" 
          @click="move('right')"
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
const GRID_SIZE = 4
const WINNING_SCORE = 2048

// 游戏状态
const board = ref<number[]>(Array(16).fill(0))
const score = ref(0)
const bestScore = ref(0)
const gameOver = ref(false)
const canUndo = ref(false)
const previousBoard = ref<number[]>([])
const previousScore = ref(0)

// 从localStorage加载最高分
onMounted(() => {
  const savedBestScore = localStorage.getItem('2048_best_score')
  if (savedBestScore) {
    bestScore.value = parseInt(savedBestScore)
  }
  
  window.addEventListener('keydown', handleKeydown)
  startNewGame()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// 开始新游戏
function startNewGame() {
  board.value = Array(16).fill(0)
  score.value = 0
  gameOver.value = false
  canUndo.value = false
  addNewTile()
  addNewTile()
}

// 添加新的数字块
function addNewTile() {
  const emptyCells = board.value
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => cell === 0)
    
  if (emptyCells.length === 0) return
  
  const { index } = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  board.value[index] = Math.random() < 0.9 ? 2 : 4
}

// 移动处理
function move(direction: 'up' | 'down' | 'left' | 'right') {
  if (gameOver.value) return

  // 保存当前状态用于撤销
  previousBoard.value = [...board.value]
  previousScore.value = score.value
  
  let moved = false
  const newBoard = [...board.value]
  
  // 根据方向重排数组
  const lines = getLines(direction)
  
  lines.forEach(line => {
    const result = mergeLine(line.map(i => newBoard[i]))
    if (result.merged) {
      moved = true
      result.line.forEach((value, index) => {
        newBoard[line[index]] = value
      })
      score.value += result.score
    }
  })
  
  if (moved) {
    board.value = newBoard
    addNewTile()
    canUndo.value = true
    
    // 更新最高分
    if (score.value > bestScore.value) {
      bestScore.value = score.value
      localStorage.setItem('2048_best_score', bestScore.value.toString())
    }
    
    // 检查游戏是否结束
    if (!canMove()) {
      gameOver.value = true
    }
  }
}

// 获取移动方向的行或列
function getLines(direction: 'up' | 'down' | 'left' | 'right'): number[][] {
  const lines: number[][] = []
  
  if (direction === 'left' || direction === 'right') {
    // 水平方向
    for (let row = 0; row < GRID_SIZE; row++) {
      const line = []
      for (let col = 0; col < GRID_SIZE; col++) {
        line.push(row * GRID_SIZE + col)
      }
      if (direction === 'right') line.reverse()
      lines.push(line)
    }
  } else {
    // 垂直方向
    for (let col = 0; col < GRID_SIZE; col++) {
      const line = []
      for (let row = 0; row < GRID_SIZE; row++) {
        line.push(row * GRID_SIZE + col)
      }
      if (direction === 'down') line.reverse()
      lines.push(line)
    }
  }
  
  return lines
}

// 合并一行或一列
function mergeLine(line: number[]): { line: number[], merged: boolean, score: number } {
  const newLine = line.filter(cell => cell !== 0)
  let merged = false
  let score = 0
  
  for (let i = 0; i < newLine.length - 1; i++) {
    if (newLine[i] === newLine[i + 1]) {
      newLine[i] *= 2
      score += newLine[i]
      newLine.splice(i + 1, 1)
      merged = true
    }
  }
  
  while (newLine.length < GRID_SIZE) {
    newLine.push(0)
  }
  
  return {
    line: newLine,
    merged: merged || newLine.join() !== line.join(),
    score
  }
}

// 检查是否还能移动
function canMove(): boolean {
  // 检查是否有空格
  if (board.value.includes(0)) return true
  
  // 检查是否有相邻的相同数字
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const current = board.value[i * GRID_SIZE + j]
      
      // 检查右侧
      if (j < GRID_SIZE - 1 && current === board.value[i * GRID_SIZE + j + 1]) {
        return true
      }
      
      // 检查下方
      if (i < GRID_SIZE - 1 && current === board.value[(i + 1) * GRID_SIZE + j]) {
        return true
      }
    }
  }
  
  return false
}

// 撤销移动
function undoMove() {
  if (!canUndo.value) return
  
  board.value = [...previousBoard.value]
  score.value = previousScore.value
  canUndo.value = false
}

// 键盘控制
function handleKeydown(event: KeyboardEvent) {
  if (gameOver.value) return
  
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      move('up')
      break
    case 'ArrowDown':
      event.preventDefault()
      move('down')
      break
    case 'ArrowLeft':
      event.preventDefault()
      move('left')
      break
    case 'ArrowRight':
      event.preventDefault()
      move('right')
      break
  }
}

// 样式相关
function getCellBackground(value: number): string {
  const backgrounds: Record<number, string> = {
    0: 'bg-gray-200',
    2: 'bg-amber-100',
    4: 'bg-amber-200',
    8: 'bg-orange-300',
    16: 'bg-orange-400',
    32: 'bg-orange-500',
    64: 'bg-orange-600',
    128: 'bg-amber-500',
    256: 'bg-amber-600',
    512: 'bg-yellow-500',
    1024: 'bg-yellow-600',
    2048: 'bg-yellow-400'
  }
  return backgrounds[value] || 'bg-yellow-300'
}

function getCellTextColor(value: number): string {
  return value <= 4 ? 'text-gray-700' : 'text-white'
}
</script>

<style scoped>
.grid {
  touch-action: none;
}
</style> 