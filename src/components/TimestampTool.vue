<template>
  <div class="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
    <!-- 时区选择 -->
    <div class="mb-6">
      <select v-model="timezone" class="w-full p-2 border rounded">
        <option value="UTC+08:00">UTC+08:00 Asia/Shanghai - 上海</option>
        <!-- 可以添加更多时区选项 -->
      </select>
    </div>

    <!-- 时间输入 -->
    <div class="mb-6">
      <div class="flex space-x-4">
        <input 
          type="datetime-local"
          step="1"
          v-model="dateTimeInput"
          class="flex-1 p-2 border rounded"
        >
        <button 
          @click="clearInput"
          class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          清空
        </button>
      </div>
    </div>

    <!-- 转换结果 -->
    <div class="space-y-4">
      <!-- 秒级时间戳 -->
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer"
           @click="selectTime('second')">
        <div class="font-mono">
          <span class="text-gray-600 text-sm">秒：</span>
          {{ currentSecondTimestamp }}
        </div>
        <div class="flex items-center space-x-2">
          <span v-if="selectedTime === 'second'" class="text-green-500">已选中</span>
          <button 
            @click.stop="copyText(currentSecondTimestamp)"
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            复制
          </button>
        </div>
      </div>

      <!-- 毫秒级时间戳 -->
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer"
           @click="selectTime('millisecond')">
        <div class="font-mono">
          <span class="text-gray-600 text-sm">毫秒：</span>
          {{ currentMillisecondTimestamp }}
        </div>
        <div class="flex items-center space-x-2">
          <span v-if="selectedTime === 'millisecond'" class="text-green-500">已选中</span>
          <button 
            @click.stop="copyText(currentMillisecondTimestamp)"
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            复制
          </button>
        </div>
      </div>

      <!-- 纳秒级时间戳 -->
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer"
           @click="selectTime('nanosecond')">
        <div class="font-mono">
          <span class="text-gray-600 text-sm">纳秒：</span>
          {{ currentNanosecondTimestamp }}
        </div>
        <div class="flex items-center space-x-2">
          <span v-if="selectedTime === 'nanosecond'" class="text-green-500">已选中</span>
          <button 
            @click.stop="copyText(currentNanosecondTimestamp)"
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            复制
          </button>
        </div>
      </div>

      <!-- 标准时间格式 -->
      <div class="mt-4">
        <table class="w-full">
          <thead>
            <tr>
              <th class="text-left p-2">格式</th>
              <th class="text-left p-2">值</th>
              <th class="text-right p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(time, format) in currentStandardTimes" :key="format" 
                class="border-t hover:bg-gray-50 cursor-pointer"
                @click="selectTimeFormat(format)">
              <td class="p-2">{{ format }}</td>
              <td class="p-2 font-mono">{{ time }}</td>
              <td class="p-2 text-right">
                <div class="flex items-center justify-end space-x-2">
                  <span v-if="selectedFormat === format" class="text-green-500">已选中</span>
                  <button 
                    @click.stop="copyText(time)"
                    class="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    复制
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const timezone = ref('UTC+08:00')
const dateTimeInput = ref(formatDateTime(new Date()))
const selectedTime = ref(null)
const selectedFormat = ref(null)
const currentTime = ref(new Date())

// 每秒更新当前时间
setInterval(() => {
  currentTime.value = new Date()
}, 1000)

// 格式化日期时间为input所需格式
function formatDateTime(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

// 实时计算属性
const currentSecondTimestamp = computed(() => {
  return Math.floor(currentTime.value.getTime() / 1000)
})

const currentMillisecondTimestamp = computed(() => {
  return currentTime.value.getTime()
})

const currentNanosecondTimestamp = computed(() => {
  return currentTime.value.getTime() + '000000'
})

const currentStandardTimes = computed(() => {
  const date = currentTime.value
  return {
    '标准时间(秒)': date.toLocaleString(),
    'Unix时间戳(秒)': Math.floor(date.getTime() / 1000),
    '标准时间(毫秒)': date.toLocaleString() + '.' + String(date.getMilliseconds()).padStart(3, '0'),
    'Unix时间戳(毫秒)': date.getTime()
  }
})

// 选择时间类型
const selectTime = (type) => {
  selectedTime.value = type
  selectedFormat.value = null
  dateTimeInput.value = formatDateTime(currentTime.value)
}

// 选择时间格式
const selectTimeFormat = (format) => {
  selectedFormat.value = format
  selectedTime.value = null
  dateTimeInput.value = formatDateTime(currentTime.value)
}

// 方法
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text.toString())
    alert('复制成功')
  } catch (err) {
    alert('复制失败')
  }
}

const clearInput = () => {
  dateTimeInput.value = ''
  selectedTime.value = null
  selectedFormat.value = null
}

</script> 