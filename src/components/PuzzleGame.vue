<template>
    <div class="container mx-auto p-5 bg-white rounded-lg shadow-md">
      <div class="flex flex-col items-center">
        <h1 class="text-2xl text-gray-800 py-5">拼图游戏</h1>
        
        <!-- 游戏控制区 -->
        <div class="mb-6 space-x-4">
          <v-dialog v-model="showImageSelector" max-width="500px">
            <template v-slot:activator="{ props }">
              <v-btn
                color="primary"
                v-bind="props"
                :loading="isLoading"
              >
                选择图片
              </v-btn>
            </template>
            
            <v-card>
              <v-card-title class="text-h6 pb-2">
                选择拼图图片
              </v-card-title>
              
              <v-card-text>
                <div class="grid grid-cols-2 gap-4">
                  <div
                    v-for="(image, index) in availableImages"
                    :key="index"
                    class="relative cursor-pointer rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                    :class="{'ring-2 ring-blue-500': selectedImageIndex === index}"
                    @click="selectImage(index)"
                  >
                    <img
                      :src="image.url"
                      class="w-full h-40 object-cover"
                      :alt="image.name"
                    />
                    <div class="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm">
                      {{ image.name }}
                    </div>
                  </div>
                </div>
              </v-card-text>
              
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn
                  color="primary"
                  @click="confirmImageSelection"
                  :disabled="selectedImageIndex === -1"
                >
                  确认选择
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
          <v-btn
            color="success"
            @click="startGame"
            :disabled="!selectedImage || isPlaying"
          >
            开始游戏
          </v-btn>
          <v-btn
            color="error"
            @click="resetGame"
            :disabled="!isPlaying"
          >
            重置
          </v-btn>
        </div>
  
        <!-- 难度选择 -->
        <div class="mb-6" v-if="!isPlaying">
          <v-select
            v-model="difficulty"
            :items="difficulties"
            label="选择难度"
            class="w-48"
          ></v-select>
        </div>
  
        <!-- 游戏状态 -->
        <div v-if="isPlaying" class="mb-4 text-lg">
          <p>移动次数: {{ moves }}</p>
          <p>用时: {{ formatTime(timeElapsed) }}</p>
        </div>
  
        <!-- 游戏区域 -->
        <div class="relative" ref="gameContainer">
          <v-stage
            v-if="isPlaying"
            :config="stageConfig"
          >
            <v-layer ref="layer">
              <v-image
                v-for="piece in pieces"
                :key="piece.id"
                :config="{
                  ...piece,
                  draggable: true,
                  onDragend: () => handleDragEnd(piece)
                }"
              />
            </v-layer>
          </v-stage>
  
          <!-- 预览图 -->
          <div v-else-if="selectedImage" class="max-w-md">
            <img 
              :src="selectedImage" 
              class="w-full h-auto rounded-lg shadow-md"
              alt="预览图"
            />
          </div>
  
          <!-- 游戏完成提示 -->
          <v-dialog v-model="showComplete" width="300">
            <v-card>
              <v-card-text class="text-center py-4">
                <h3 class="text-xl font-bold mb-2">恭喜完成!</h3>
                <p>移动次数: {{ moves }}</p>
                <p>用时: {{ formatTime(timeElapsed) }}</p>
              </v-card-text>
              <v-card-actions class="justify-center pb-4">
                <v-btn color="primary" @click="resetGame">
                  再玩一次
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import html2canvas from 'html2canvas'
  
  // 状态变量
  const selectedImage = ref<string>('')
  const isLoading = ref(false)
  const isPlaying = ref(false)
  const pieces = ref<any[]>([])
  const moves = ref(0)
  const timeElapsed = ref(0)
  const timer = ref<number | null>(null)
  const showComplete = ref(false)
  const gameContainer = ref<HTMLElement | null>(null)
  const layer = ref<any>(null)
  const fileInput = ref<HTMLInputElement | null>(null)
  
  // 难度设置
  const difficulty = ref(3)
  const difficulties = [
    { title: '简单 (3x3)', value: 3 },
    { title: '中等 (4x4)', value: 4 },
    { title: '困难 (5x5)', value: 5 }
  ]
  
  // 舞台配置
  const stageConfig = computed(() => ({
    width: 600,
    height: 600
  }))
  
  // 获取所有图片
  const puzzleImages = import.meta.glob('/public/puzzle/*.{jpg,jpeg,png}', {
    eager: true,
    import: 'default'
  }) as Record<string, string>
  
  // 图片选择相关状态
  const showImageSelector = ref(false)
  const availableImages = ref<{ name: string; url: string }[]>([])
  const selectedImageIndex = ref(-1)
  
  // 加载可用图片
  async function loadAvailableImages() {
    isLoading.value = true
    try {
      // 处理图片路径
      availableImages.value = Object.entries(puzzleImages).map(([path, url]) => ({
        name: path.split('/').pop() || path,
        url: url
      }))
    } catch (error) {
      console.error('加载图片列表失败:', error)
    } finally {
      isLoading.value = false
    }
  }
  
  // 选择图片
  function selectImage(index: number) {
    selectedImageIndex.value = index
  }
  
  // 确认图片选择
  function confirmImageSelection() {
    if (selectedImageIndex.value !== -1) {
      selectedImage.value = availableImages.value[selectedImageIndex.value].url
      showImageSelector.value = false
    }
  }
  
  // 开始游戏
  async function startGame() {
    if (!selectedImage.value) return
  
    isPlaying.value = true
    moves.value = 0
    timeElapsed.value = 0
    startTimer()
  
    const image = new Image()
    image.src = selectedImage.value
    await new Promise(resolve => { image.onload = resolve })
  
    const gridSize = difficulty.value
    const pieceWidth = stageConfig.value.width / gridSize
    const pieceHeight = stageConfig.value.height / gridSize
  
    // 创建拼图块
    const newPieces: any[] = []
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        newPieces.push({
          id: `${row}-${col}`,
          image: image,
          x: Math.random() * (stageConfig.value.width - pieceWidth),
          y: Math.random() * (stageConfig.value.height - pieceHeight),
          width: pieceWidth,
          height: pieceHeight,
          crop: {
            x: col * (image.width / gridSize),
            y: row * (image.height / gridSize),
            width: image.width / gridSize,
            height: image.height / gridSize
          },
          originalPos: {
            x: col * pieceWidth,
            y: row * pieceHeight
          }
        })
      }
    }
  
    pieces.value = newPieces
  }
  
  // 处理拖动结束
  function handleDragEnd(piece: any) {
    moves.value++
    
    const pieceWidth = stageConfig.value.width / difficulty.value
    const pieceHeight = stageConfig.value.height / difficulty.value
    const tolerance = 20 // 吸附容差
  
    // 检查是否接近正确位置
    if (
      Math.abs(piece.x - piece.originalPos.x) < tolerance &&
      Math.abs(piece.y - piece.originalPos.y) < tolerance
    ) {
      // 吸附到正确位置
      piece.x = piece.originalPos.x
      piece.y = piece.originalPos.y
      layer.value.draw()
    }
  
    // 检查是否完成
    checkCompletion()
  }
  
  // 检查是否完成拼图
  function checkCompletion() {
    const isComplete = pieces.value.every(piece => 
      piece.x === piece.originalPos.x && 
      piece.y === piece.originalPos.y
    )
  
    if (isComplete) {
      stopTimer()
      showComplete.value = true
    }
  }
  
  // 重置游戏
  function resetGame() {
    isPlaying.value = false
    pieces.value = []
    moves.value = 0
    timeElapsed.value = 0
    showComplete.value = false
    stopTimer()
  }
  
  // 计时器相关函数
  function startTimer() {
    stopTimer()
    timer.value = window.setInterval(() => {
      timeElapsed.value++
    }, 1000)
  }
  
  function stopTimer() {
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }
  
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // 生命周期钩子
  onMounted(() => {
    loadAvailableImages()
  })
  
  onUnmounted(() => {
    stopTimer()
    // 不再需要清理 URL，因为使用的是 Vite 的资源 URL
  })
  </script>
  
  <style scoped>
  .konvajs-content {
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
  }
  </style>