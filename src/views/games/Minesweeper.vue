<template>
  <ToolPageLayout :card="false" max-width="max-w-4xl">
    <div class="max-w-4xl mx-auto">
      <!-- 标题区域 -->
      <div class="text-center mb-6">
        <div class="flex justify-center items-center gap-8">
          <p class="text-gray-600">
            <v-icon icon="mdi-clock-outline" class="text-blue-500" />
            用时: {{ formatTime(time) }}
          </p>
          <p class="text-gray-600">
            <v-icon icon="mdi-flag" class="text-red-500" />
            剩余雷数: {{ remainingMines }}
          </p>
        </div>
      </div>

      <!-- 游戏控制区 -->
      <div class="flex flex-col items-center gap-4 mb-6">
        <div class="flex gap-2">
          <v-btn-group>
            <v-btn
              v-for="difficulty in difficulties.slice(0, 3)"
              :key="difficulty.name"
              :color="currentDifficulty === difficulty ? 'primary' : ''"
              @click="selectDifficulty(difficulty)"
              class="px-6"
              :class="currentDifficulty === difficulty ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' : ''"
            >
              {{ difficulty.name }}
            </v-btn>
          </v-btn-group>
        </div>

        <div class="flex items-center gap-2">
          <v-btn
            :color="currentDifficulty.name === '自定义' ? 'primary' : ''"
            @click="selectDifficulty(difficulties[3])"
            class="px-4"
          >
            自定义
          </v-btn>
          <v-btn
            v-if="isPlaying"
            color="error"
            @click="startGame"
            class="px-4"
          >
            重新开始
          </v-btn>
        </div>
      </div>

      <!-- 自定义难度设置 -->
      <div v-if="currentDifficulty.name === '自定义'" class="flex justify-center gap-4 mb-6">
        <v-text-field
          v-model="customConfig.rows"
          type="number"
          label="行数"
          :rules="[v => v > 0 || '行数必须大于0']"
          :disabled="isPlaying"
        />
        <v-text-field
          v-model="customConfig.cols"
          type="number"
          label="列数"
          :rules="[v => v > 0 || '列数必须大于0']"
          :disabled="isPlaying"
        />
        <v-text-field
          v-model="customConfig.mines"
          type="number"
          label="地雷数"
          :rules="[
            v => v > 0 || '地雷数必须大于0',
            v => v < customConfig.rows * customConfig.cols || '地雷数不能大于格子总数'
          ]"
          :disabled="isPlaying"
        />
      </div>

      <!-- 游戏画布 -->
      <div class="flex justify-center">
        <div 
          class="grid bg-white rounded-lg shadow-xl p-3"
          :style="{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: '2px',
            backgroundColor: '#ccc'
          }"
        >
          <div
            v-for="(cell, index) in board"
            :key="index"
            class="aspect-square flex items-center justify-center text-sm font-bold cursor-pointer select-none"
            :class="getCellClass(cell)"
            @click="handleClick(index)"
            @contextmenu.prevent="handleRightClick(index)"
          >
            {{ getCellContent(cell) }}
          </div>
        </div>
      </div>

      <!-- 游戏结束弹窗 -->
      <v-dialog v-model="showGameOverDialog" persistent max-width="300">
        <v-card>
          <v-card-title class="text-center">
            {{ gameWon ? '恭喜获胜!' : '游戏结束' }}
          </v-card-title>
          <v-card-text class="text-center">
            用时: {{ formatTime(time) }}
          </v-card-text>
          <v-card-actions class="justify-center">
            <v-btn color="primary" @click="startGame">
              重新开始
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'

// 难度配置
const difficulties = [
  { name: '初级', rows: 9, cols: 9, mines: 10 },
  { name: '中级', rows: 16, cols: 16, mines: 40 },
  { name: '高级', rows: 16, cols: 30, mines: 99 },
  { name: '自定义', rows: 9, cols: 9, mines: 10 }
]

// 自定义配置
const customConfig = ref({
  rows: 9,
  cols: 9,
  mines: 10
})

// 游戏状态
const currentDifficulty = ref(difficulties[0])
const isPlaying = ref(false)
const gameOver = ref(false)
const gameWon = ref(false)
const showGameOverDialog = ref(false)
const time = ref(0)
const board = ref<number[]>([])
const mineLocations = ref<Set<number>>(new Set())
const flaggedCells = ref<Set<number>>(new Set())
const revealedCells = ref<Set<number>>(new Set())
let timerInterval: number | null = null

// 计算属性
const rows = computed(() => currentDifficulty.value.name === '自定义' ? 
  customConfig.value.rows : currentDifficulty.value.rows)
const cols = computed(() => currentDifficulty.value.name === '自定义' ? 
  customConfig.value.cols : currentDifficulty.value.cols)
const totalMines = computed(() => currentDifficulty.value.name === '自定义' ? 
  customConfig.value.mines : currentDifficulty.value.mines)
const remainingMines = computed(() => totalMines.value - flaggedCells.value.size)

// 设置难度
function selectDifficulty(difficulty: typeof difficulties[0]) {
  currentDifficulty.value = difficulty
  if (difficulty.name !== '自定义') {
    startGame()
  }
}

// 开始游戏
function startGame() {
  // 重置游戏状态
  isPlaying.value = true
  gameOver.value = false
  gameWon.value = false
  showGameOverDialog.value = false
  time.value = 0
  board.value = Array(rows.value * cols.value).fill(0)
  mineLocations.value = new Set()
  flaggedCells.value = new Set()
  revealedCells.value = new Set()

  // 生成地雷
  while (mineLocations.value.size < totalMines.value) {
    const position = Math.floor(Math.random() * (rows.value * cols.value))
    mineLocations.value.add(position)
  }

  // 计算每个格子周围的地雷数
  for (let i = 0; i < board.value.length; i++) {
    if (mineLocations.value.has(i)) {
      board.value[i] = -1 // 地雷标记为-1
    } else {
      board.value[i] = countAdjacentMines(i)
    }
  }

  // 启动计时器
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = window.setInterval(() => {
    time.value++
  }, 1000)
}

// 计算相邻地雷数
function countAdjacentMines(index: number): number {
  const row = Math.floor(index / cols.value)
  const col = index % cols.value
  let count = 0

  // 检查周围8个方向
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue
      
      const newRow = row + i
      const newCol = col + j
      
      if (newRow >= 0 && newRow < rows.value && 
          newCol >= 0 && newCol < cols.value) {
        const newIndex = newRow * cols.value + newCol
        if (mineLocations.value.has(newIndex)) {
          count++
        }
      }
    }
  }

  return count
}

// 处理左键点击
function handleClick(index: number) {
  if (!isPlaying.value || gameOver.value || flaggedCells.value.has(index)) return

  if (mineLocations.value.has(index)) {
    // 点到地雷,游戏结束
    gameOver.value = true
    showGameOverDialog.value = true
    revealAll()
    stopTimer()
  } else {
    // 展开空白区域
    revealCell(index)
    
    // 检查是否获胜
    if (revealedCells.value.size === board.value.length - mineLocations.value.size) {
      gameWon.value = true
      gameOver.value = true
      showGameOverDialog.value = true
      revealAll()
      stopTimer()
    }
  }
}

// 处理右键点击(插旗)
function handleRightClick(index: number) {
  if (!isPlaying.value || gameOver.value || revealedCells.value.has(index)) return

  if (flaggedCells.value.has(index)) {
    flaggedCells.value.delete(index)
  } else if (remainingMines.value > 0) {
    flaggedCells.value.add(index)
  }
}

// 展开空白区域
function revealCell(index: number) {
  if (revealedCells.value.has(index)) return
  
  revealedCells.value.add(index)
  
  // 如果是空白格子(周围没有地雷),则展开周围的格子
  if (board.value[index] === 0) {
    const row = Math.floor(index / cols.value)
    const col = index % cols.value
    
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue
        
        const newRow = row + i
        const newCol = col + j
        
        if (newRow >= 0 && newRow < rows.value && 
            newCol >= 0 && newCol < cols.value) {
          const newIndex = newRow * cols.value + newCol
          if (!flaggedCells.value.has(newIndex)) {
            revealCell(newIndex)
          }
        }
      }
    }
  }
}

// 展示所有格子
function revealAll() {
  for (let i = 0; i < board.value.length; i++) {
    revealedCells.value.add(i)
  }
}

// 停止计时器
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

// 格式化时间
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// 获取格子样式
function getCellClass(value: number) {
  const index = board.value.indexOf(value)
  const baseClasses = 'w-8 h-8 rounded transition-colors duration-200 shadow-sm'
  
  if (!revealedCells.value.has(index)) {
    return `${baseClasses} bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 ${
      flaggedCells.value.has(index) ? 'from-yellow-100 to-yellow-200' : ''
    }`
  }
  
  if (value === -1) {
    return `${baseClasses} bg-gradient-to-br from-red-400 to-red-600 text-white`
  }
  
  const colors = [
    'text-transparent',
    'text-blue-500',
    'text-green-500',
    'text-red-500',
    'text-purple-500',
    'text-yellow-600',
    'text-pink-500',
    'text-gray-700',
    'text-gray-900'
  ]
  
  return `${baseClasses} bg-gradient-to-br from-white to-gray-50 ${colors[value]}`
}

// 获取格子内容
function getCellContent(value: number) {
  const index = board.value.indexOf(value)
  
  if (!revealedCells.value.has(index)) {
    return flaggedCells.value.has(index) ? '🚩' : ''
  }
  
  if (value === -1) {
    return '💣'
  }
  
  return value === 0 ? '' : value
}

// 组件卸载时清理
onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script> 
