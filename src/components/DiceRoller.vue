<template>
    <div class="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4">
      <div class="max-w-2xl mx-auto">
        <!-- 标题区域 -->
        <div class="text-center mb-12">
          <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            投色子
          </h1>
        </div>
  
        <!-- 骰子区域 -->
        <div class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8">
          <div class="flex flex-col items-center">
            <!-- 骰子容器 -->
            <div 
              class="scene mb-8"
              @click="rollDice"
            >
              <div 
                class="dice"
                :class="{ 'rolling': isRolling }"
                :style="diceStyle"
              >
                <div class="face front">
                  <span class="dot"></span>
                </div>
                <div class="face back">
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                </div>
                <div class="face right">
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                </div>
                <div class="face left">
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                </div>
                <div class="face top">
                  <span class="dot"></span>
                  <span class="dot"></span>
                </div>
                <div class="face bottom">
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                  <span class="dot"></span>
                </div>
              </div>
            </div>
  
            <!-- 控制按钮 -->
            <v-btn
              color="primary"
              size="large"
              @click="rollDice"
              :loading="isRolling"
              :disabled="isRolling"
            >
              投掷骰子
            </v-btn>
  
            <!-- 结果显示 -->
            <div class="mt-6 text-2xl font-bold text-indigo-600" v-if="currentNumber && !isRolling">
              点数: {{ currentNumber }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed } from 'vue'
  
  const isRolling = ref(false)
  const currentNumber = ref<number | null>(null)
  const rotations = ref({ x: 0, y: 0, z: 0 })
  
  // 骰子旋转样式
  const diceStyle = computed(() => ({
    transform: `rotateX(${rotations.value.x}deg) rotateY(${rotations.value.y}deg) rotateZ(${rotations.value.z}deg)`
  }))
  
  // 获取随机数
  const getRandomNumber = () => Math.floor(Math.random() * 6) + 1
  
  // 根据点数获取旋转角度
  const getRotationForNumber = (number: number) => {
    const rotations = {
      1: { x: 0, y: 0, z: 0 },          // 前面显示1点
      6: { x: 0, y: 90, z: 0 },         // 左面显示6点
      2: { x: -90, y: 0, z: 0 },        // 上面显示2点
      5: { x: 90, y: 0, z: 0 },         // 下面显示5点
      4: { x: 0, y: -90, z: 0 },        // 右面显示4点
      3: { x: 180, y: 0, z: 0 }         // 后面显示3点
    }
    return rotations[number as keyof typeof rotations]
  }
  
  // 投掷骰子
  const rollDice = async () => {
    if (isRolling.value) return
  
    isRolling.value = true
    currentNumber.value = null
  
    // 减少动画时间和旋转圈数
    const spins = 3     // 从2改为3,增加旋转圈数使动画更生动
    const duration = 1000 // 从2000ms改为1000ms
    const startTime = Date.now()
  
    // 生成随机结果(提前生成,避免动画结束时才生成导致的延迟)
    const result = getRandomNumber()
  
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
  
      // 使用更快的缓动函数
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 2)
      const easedProgress = easeOut(progress)
  
      // 增加随机性,使旋转更自然
      rotations.value = {
        x: easedProgress * spins * 360 + Math.random() * 30,
        y: easedProgress * spins * 360 + Math.random() * 30,
        z: easedProgress * spins * 180
      }
  
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // 动画结束,设置最终角度和结果
        currentNumber.value = result
        rotations.value = getRotationForNumber(result)
        isRolling.value = false
      }
    }
  
    requestAnimationFrame(animate)
  }
  </script>
  
  <style scoped>
  .scene {
    width: 120px;  /* 从200px改为120px */
    height: 120px;
    perspective: 400px; /* 从600px改为400px,使3D效果更明显 */
    cursor: pointer;
  }
  
  .dice {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.1s ease;
  }
  
  .rolling {
    transition: transform 1s cubic-bezier(0.25, 0.1, 0.25, 1); /* 从2s改为1s */
  }
  
  .face {
    position: absolute;
    width: 100%;
    height: 100%;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    display: grid;
    grid-template: repeat(3, 1fr) / repeat(3, 1fr);
    gap: 2px;     /* 从4px改为2px */
    padding: 6px; /* 从8px改为6px */
  }
  
  .dot {
    background: #4f46e5;
    border-radius: 50%;
    margin: 2px;  /* 从4px改为2px */
  }
  
  /* 定位每个面 */
  .front  { transform: translateZ(60px); }  /* 从100px改为60px */
  .back   { transform: rotateY(180deg) translateZ(60px); }
  .right  { transform: rotateY(90deg) translateZ(60px); }
  .left   { transform: rotateY(-90deg) translateZ(60px); }
  .top    { transform: rotateX(90deg) translateZ(60px); }
  .bottom { transform: rotateX(-90deg) translateZ(60px); }
  
  /* 点数布局 */
  /* 1点 (前面) */
  .front .dot {
    grid-column: 2;
    grid-row: 2;
  }
  
  /* 2点 (上面) */
  .top .dot:nth-child(1) { grid-area: 1 / 1; }
  .top .dot:nth-child(2) { grid-area: 3 / 3; }
  
  /* 3点 (后面) */
  .back .dot:nth-child(1) { grid-area: 1 / 1; }
  .back .dot:nth-child(2) { grid-area: 2 / 2; }
  .back .dot:nth-child(3) { grid-area: 3 / 3; }
  
  /* 4点 (右面) */
  .right .dot:nth-child(1) { grid-area: 1 / 1; }
  .right .dot:nth-child(2) { grid-area: 1 / 3; }
  .right .dot:nth-child(3) { grid-area: 3 / 1; }
  .right .dot:nth-child(4) { grid-area: 3 / 3; }
  
  /* 5点 (下面) */
  .bottom .dot:nth-child(1) { grid-area: 1 / 1; }
  .bottom .dot:nth-child(2) { grid-area: 1 / 3; }
  .bottom .dot:nth-child(3) { grid-area: 2 / 2; }
  .bottom .dot:nth-child(4) { grid-area: 3 / 1; }
  .bottom .dot:nth-child(5) { grid-area: 3 / 3; }
  
  /* 6点 (左面) */
  .left .dot:nth-child(1) { grid-area: 1 / 1; }
  .left .dot:nth-child(2) { grid-area: 1 / 3; }
  .left .dot:nth-child(3) { grid-area: 2 / 1; }
  .left .dot:nth-child(4) { grid-area: 2 / 3; }
  .left .dot:nth-child(5) { grid-area: 3 / 1; }
  .left .dot:nth-child(6) { grid-area: 3 / 3; }
  
  /* 悬停效果 */
  .scene:hover .dice {
    transform: rotate3d(1, 1, 1, 10deg);
  }
  </style>