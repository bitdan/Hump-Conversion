<template>
  <div class="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
    <h2 class="text-2xl font-bold mb-4 text-gray-800">时间戳转换工具</h2>
    
    <!-- 输入区域 -->
    <div class="mb-6">
      <input
        v-model="inputValue"
        @input="handleInput"
        type="text"
        class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="请输入时间戳或标准时间"
      />
    </div>

    <!-- 时间格式展示 -->
    <div class="grid gap-4">
      <div
        v-for="(time, index) in timeFormats"
        :key="index"
        @click="selectTime(time.value)"
        class="p-3 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <div class="text-sm text-gray-600">{{ time.label }}</div>
        <div class="font-mono text-lg">{{ time.value }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const inputValue = ref('')
const currentTime = ref(Date.now())

// 更新当前时间
const updateCurrentTime = () => {
  currentTime.value = Date.now()
}

// 格式化日期
const formatDate = (timestamp, withMilliseconds = false) => {
  const date = new Date(timestamp)
  const pad = (num) => String(num).padStart(2, '0')
  
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  
  let result = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  
  if (withMilliseconds) {
    const ms = String(date.getMilliseconds()).padStart(3, '0')
    result += `.${ms}`
  }
  
  return result
}

// 计算不同格式的时间
const timeFormats = computed(() => {
  const timestamp = inputValue.value 
    ? parseTimestamp(inputValue.value) 
    : currentTime.value

  if (!timestamp) return []

  return [
    {
      label: '标准时间(秒)',
      value: formatDate(timestamp)
    },
    {
      label: 'Unix时间戳(秒)',
      value: Math.floor(timestamp / 1000).toString()
    },
    {
      label: '标准时间(毫秒)',
      value: formatDate(timestamp, true)
    },
    {
      label: 'Unix时间戳(毫秒)',
      value: timestamp.toString()
    }
  ]
})

// 解析输入的时间戳
const parseTimestamp = (input) => {
  // 移除所有空格
  input = input.replace(/\s/g, '')
  
  // 尝试解析不同格式的输入
  if (/^\d{10}$/.test(input)) {
    // 10位时间戳（秒）
    return parseInt(input) * 1000
  } else if (/^\d{13}$/.test(input)) {
    // 13位时间戳（毫秒）
    return parseInt(input)
  } else {
    // 尝试解析日期字符串
    const parsed = new Date(input).getTime()
    return isNaN(parsed) ? null : parsed
  }
}

// 选择时间格式
const selectTime = (value) => {
  inputValue.value = value
}

// 处理输入
const handleInput = () => {
  if (!inputValue.value) {
    updateCurrentTime()
  }
}

// 组件挂载时启动定时器
onMounted(() => {
  updateCurrentTime()
  // 每秒更新一次当前时间
  setInterval(updateCurrentTime, 1000)
})
</script>
