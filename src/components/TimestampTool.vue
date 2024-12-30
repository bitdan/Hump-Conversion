<template>
  <div class="max-w-6xl mx-auto p-6">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">时间戳转换工具</h2>
    
    <!-- 输入区域 -->
    <div class="mb-6">
      <!-- 当前输入格式显示 -->
      <div class="mb-2 flex items-center text-gray-600">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>当前输入格式：</span>
        <span class="ml-2 font-medium text-blue-600">
          {{ currentInputFormat || '请输入或选择时间格式' }}
        </span>
      </div>
      <input
        v-model="inputValue"
        @input="handleInput"
        type="text"
        class="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
        placeholder="请输入时间戳或标准时间"
      />
    </div>

    <!-- 两列布局 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 左侧：当前时间 -->
      <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 shadow-lg">
        <div class="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          实时时间
        </div>
        <div class="space-y-3">
          <div
            v-for="(time, index) in timeFormats"
            :key="'current-' + index"
            @click="selectTime(time)"
            class="p-4 bg-white rounded-lg hover:bg-blue-50 cursor-pointer transition-colors border border-indigo-100"
          >
            <div class="text-sm text-indigo-600 font-medium mb-1">{{ time.label }}</div>
            <div class="font-mono text-lg text-gray-800">{{ time.value }}</div>
          </div>
        </div>
      </div>

      <!-- 右侧：转换结果 -->
      <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-6 shadow-lg">
        <div class="text-lg font-semibold text-teal-800 mb-4 flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          转换结果
        </div>
        <div v-if="convertedFormats.length > 0" class="space-y-3">
          <div
            v-for="(time, index) in convertedFormats"
            :key="'converted-' + index"
            @click="selectTime(time)"
            class="p-4 bg-white rounded-lg hover:bg-teal-50 cursor-pointer transition-colors border border-teal-100"
          >
            <div class="text-sm text-teal-600 font-medium mb-1">{{ time.label }}</div>
            <div class="font-mono text-lg text-gray-800">{{ time.value }}</div>
          </div>
        </div>
        <div v-else class="p-4 bg-white rounded-lg text-gray-500 border border-teal-100">
          请输入或选择一个时间格式进行转换
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const inputValue = ref('')
const currentTime = ref(Date.now())
const selectedFormat = ref(null)

// 计算当前输入格式
const currentInputFormat = computed(() => {
  if (!inputValue.value) return null
  
  const input = inputValue.value.trim()
  
  if (/^\d{10}$/.test(input)) {
    return 'Unix时间戳(秒)'
  } else if (/^\d{13}$/.test(input)) {
    return 'Unix时间戳(毫秒)'
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(input)) {
    return '标准时间(毫秒)'
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input)) {
    return '标准时间(秒)'
  }
  return '未识别的格式'
})

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

// 计算当前时间的所有格式
const timeFormats = computed(() => {
  const timestamp = currentTime.value
  return getTimeFormats(timestamp)
})

// 计算转换后的格式
const convertedFormats = computed(() => {
  if (!inputValue.value) return []
  
  const timestamp = parseTimestamp(inputValue.value)
  if (!timestamp) return []

  return getTimeFormats(timestamp)
})

// 获取时间的所有格式
const getTimeFormats = (timestamp) => {
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
}

// 解析输入的时间戳或日期字符串
const parseTimestamp = (input) => {
  // 移除末尾的空格
  input = input.trim()
  
  // 尝试解析不同格式的输入
  if (/^\d{10}$/.test(input)) {
    // 10位时间戳（秒）
    return parseInt(input) * 1000
  } else if (/^\d{13}$/.test(input)) {
    // 13位时间戳（毫秒）
    return parseInt(input)
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input)) {
    // 标准时间格式 YYYY-MM-DD HH:mm:ss
    return new Date(input.replace(' ', 'T')).getTime()
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(input)) {
    // 标准时间格式（带毫秒） YYYY-MM-DD HH:mm:ss.SSS
    return new Date(input.replace(' ', 'T')).getTime()
  } else {
    // 尝试其他可能的日期格式
    const parsed = new Date(input).getTime()
    return isNaN(parsed) ? null : parsed
  }
}

// 选择时间格式
const selectTime = (time) => {
  inputValue.value = time.value
  selectedFormat.value = time.label
}

// 处理输入
const handleInput = () => {
  if (!inputValue.value) {
    selectedFormat.value = null
  }
}

// 组件挂载时启动定时器
onMounted(() => {
  updateCurrentTime()
  // 每秒更新一次当前时间
  setInterval(updateCurrentTime, 1000)
})
</script>