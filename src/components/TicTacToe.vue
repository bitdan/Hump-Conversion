<template>
  <div class="flex flex-col items-center justify-center">
    <h1 class="text-4xl font-bold mb-8">井字棋</h1>
    
    <div class="mb-4 text-xl">
      <p v-if="winner">获胜者: {{ winner }}</p>
      <p v-else-if="isDraw">平局!</p>
      <p v-else>当前玩家: {{ currentPlayer }}</p>
    </div>

    <div class="grid grid-cols-3 gap-2 bg-white p-4 rounded-lg shadow-lg">
      <button
        v-for="(cell, index) in board"
        :key="index"
        @click="makeMove(index)"
        :disabled="cell !== null || winner || isDraw"
        class="w-20 h-20 text-4xl font-bold bg-gray-50 hover:bg-gray-100 border rounded-lg focus:outline-none disabled:opacity-75"
      >
        {{ cell }}
      </button>
    </div>

    <button
      @click="resetGame"
      class="mt-8 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
    >
      重新开始
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 初始化棋盘
const board = ref(Array(9).fill(null))
const currentPlayer = ref('X')
const winner = ref(null)

// 检查是否获胜的组合
const winningCombinations = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // 横向
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // 纵向
  [0, 4, 8], [2, 4, 6] // 对角线
]

// 检查是否平局
const isDraw = computed(() => {
  return !winner.value && board.value.every(cell => cell !== null)
})

// 检查是否获胜
const checkWinner = () => {
  for (const combination of winningCombinations) {
    const [a, b, c] = combination
    if (
      board.value[a] &&
      board.value[a] === board.value[b] &&
      board.value[a] === board.value[c]
    ) {
      winner.value = board.value[a]
      return
    }
  }
}

// 落子
const makeMove = (index) => {
  if (board.value[index] === null && !winner.value) {
    board.value[index] = currentPlayer.value
    checkWinner()
    currentPlayer.value = currentPlayer.value === 'X' ? 'O' : 'X'
  }
}

// 重置游戏
const resetGame = () => {
  board.value = Array(9).fill(null)
  currentPlayer.value = 'X'
  winner.value = null
}
</script> 