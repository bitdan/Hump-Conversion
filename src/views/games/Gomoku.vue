<template>
  <div class="flex flex-col items-center justify-center">
    <h1 class="text-4xl font-bold mb-8">五子棋</h1>

    <!-- 游戏模式选择 -->
    <div v-if="!isPlaying" class="mb-8 space-y-4">
      <button
        @click="createRoom"
        class="w-48 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
      >
        创建房间
      </button>
      <button
        @click="showJoinDialog = true"
        class="w-48 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none"
      >
        加入房间
      </button>
    </div>

    <!-- 加入房间对话框 -->
    <v-dialog v-model="showJoinDialog" max-width="400px">
      <v-card>
        <v-card-title>加入房间</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="roomCode"
            label="请输入房间码"
            :rules="[v => !!v || '请输入房间码']"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="showJoinDialog = false">取消</v-btn>
          <v-btn color="primary" @click="joinRoom">加入</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 等待对手加入提示 -->
    <div v-if="isWaiting" class="mb-4 text-xl">
      <p>等待对手加入...</p>
      <p class="text-gray-600">房间码: {{ currentRoomCode }}</p>
    </div>

    <!-- 游戏状态 -->
    <div v-if="isPlaying" class="mb-4 text-xl">
      <p v-if="winner">获胜者: {{ winner === 'black' ? '黑棋' : '白棋' }}</p>
      <p v-else>
        {{ isMyTurn ? '轮到你下棋' : '等待对手下棋' }}
        ({{ currentPlayer === 'black' ? '黑棋' : '白棋' }})
      </p>
    </div>

    <!-- 棋盘 -->
    <div v-show="isPlaying || isWaiting">
      <!-- 原有的棋盘代码 -->
    </div>

    <!-- 操作按钮 -->
    <div v-if="isPlaying" class="mt-8 space-x-4">
      <button
        @click="surrender"
        class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none"
      >
        认输
      </button>
      <button
        @click="requestDraw"
        class="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:outline-none"
      >
        求和
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import axios from 'axios'

// 棋盘配置
const boardSize = 560 // 棋盘大小
const gridSize = 15  // 15x15的交叉点
const cellSize = boardSize / (gridSize - 1) // 格子大小

// 游戏状态
const board = ref(Array(gridSize).fill(null).map(() => Array(gridSize).fill(null)))
const currentPlayer = ref<'black' | 'white'>('black')
const winner = ref<'black' | 'white' | null>(null)
const lastMove = ref<{x: number, y: number} | null>(null)

// 新增的状态
const isPlaying = ref(false)
const isWaiting = ref(false)
const showJoinDialog = ref(false)
const roomCode = ref('')
const currentRoomCode = ref('')
const playerColor = ref<'black' | 'white' | null>(null)
const roomId = ref<number | null>(null)

const userStore = useUserStore()
const { ws, connect, disconnect, send } = useWebSocket()
const router = useRouter()

// 确保用户已登录
if (!userStore.isLoggedIn) {
  router.push('/login')
}

// 计算当前是否轮到自己
const isMyTurn = computed(() => {
  return playerColor.value === currentPlayer.value
})

// 创建房间
async function createRoom() {
  if (!userStore.isLoggedIn) {
    alert('请先登录')
    router.push('/login')
    return
  }

  try {
    console.log('Creating room with token:', userStore.token)
    
    // 确保 token 存在且有效
    if (!userStore.token) {
      throw new Error('未找到登录凭证，请重新登录')
    }

    const response = await axios.post('/api/games/gomoku/create-room', {}, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
        'Accept': 'application/json'
      }
    })
    
    console.log('Response:', response.data)
    
    roomId.value = response.data.roomId
    currentRoomCode.value = response.data.roomCode
    playerColor.value = 'black'
    isWaiting.value = true
    
    connect(`/ws/game/${response.data.roomId}`)
  } catch (error) {
    if (error.response?.status === 401) {
      const errorMessage = error.response.data?.error || '登录已过期'
      alert(errorMessage + '，请重新登录')
      userStore.clearToken()
      router.push('/login')
      return
    }
    console.error('创建房间失败:', error.response?.data || error.message)
    alert(error.response?.data?.error || '创建房间失败')
  }
}

// 加入房间
async function joinRoom() {
  try {
    const response = await fetch('/api/games/gomoku/join-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({ roomCode: roomCode.value }),
    })
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || '加入房间失败')
    }
    
    roomId.value = data.roomId
    playerColor.value = 'white'
    isPlaying.value = true
    showJoinDialog.value = false
    
    connect(`/ws/game/${data.roomId}`)
  } catch (error) {
    console.error('加入房间失败:', error)
    alert(error.message)
  }
}

// 处理落子
function makeMove(x: number, y: number) {
  if (!isMyTurn.value || winner.value || board.value[y][x]) return
  
  // 发送落子消息
  send({
    type: 'move',
    data: { x, y, player: playerColor.value }
  })
}

// 认输
function surrender() {
  send({
    type: 'surrender',
    data: { player: playerColor.value }
  })
}

// 请求求和
function requestDraw() {
  send({
    type: 'draw_request',
    data: { player: playerColor.value }
  })
}

// WebSocket消息处理
function setupWebSocketHandlers() {
  if (!ws.value) return
  
  ws.value.onmessage = (event) => {
    const message = JSON.parse(event.data)
    
    switch (message.type) {
      case 'game_start':
        isWaiting.value = false
        isPlaying.value = true
        break
        
      case 'move':
        const { x, y, player } = message.data
        board.value[y][x] = player
        lastMove.value = { x, y }
        currentPlayer.value = currentPlayer.value === 'black' ? 'white' : 'black'
        
        if (checkWinner(x, y, player)) {
          winner.value = player
          endGame()
        }
        break
        
      case 'game_over':
        winner.value = message.data.winner
        break
        
      case 'draw_request':
        if (confirm('对手请求求和,是否同意?')) {
          send({
            type: 'draw_response',
            data: { accepted: true }
          })
        } else {
          send({
            type: 'draw_response',
            data: { accepted: false }
          })
        }
        break
    }
  }
}

// 在连接成功后设置WebSocket处理程序
watch(() => ws.value, (newWs) => {
  if (newWs) {
    setupWebSocketHandlers()
  }
})

// 游戏结束处理
async function endGame() {
  if (!roomId.value) return
  
  try {
    await fetch(`/api/games/gomoku/${roomId.value}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        winner: winner.value,
        moves: JSON.stringify(board.value)
      })
    })
  } catch (error) {
    console.error('更新游戏状态失败:', error)
  }
}

// 组件卸载时断开WebSocket连接
onUnmounted(() => {
  disconnect()
})

// 检查是否获胜
function checkWinner(x: number, y: number, player: 'black' | 'white'): boolean {
  const directions = [
    [1, 0],   // 水平
    [0, 1],   // 垂直
    [1, 1],   // 右下斜
    [1, -1]   // 右上斜
  ]

  for (const [dx, dy] of directions) {
    let count = 1
    
    // 正向检查
    for (let i = 1; i < 5; i++) {
      const newX = x + dx * i
      const newY = y + dy * i
      if (
        newX < 0 || newX >= gridSize ||
        newY < 0 || newY >= gridSize ||
        board.value[newY][newX] !== player
      ) {
        break
      }
      count++
    }
    
    // 反向检查
    for (let i = 1; i < 5; i++) {
      const newX = x - dx * i
      const newY = y - dy * i
      if (
        newX < 0 || newX >= gridSize ||
        newY < 0 || newY >= gridSize ||
        board.value[newY][newX] !== player
      ) {
        break
      }
      count++
    }

    if (count >= 5) {
      return true
    }
  }

  return false
}
</script>
