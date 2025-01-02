<script setup lang="ts">
import { ref, watch } from 'vue'
import { FileConverter } from '../utils/fileConverter'

interface FormatOption {
  value: string
  label: string
}

const inputContent = ref<string>('')
const outputContent = ref<string>('')
const error = ref<string>('')
const isLoading = ref<boolean>(false)
const detectedFormat = ref<string>('')
const selectedOutputFormat = ref<string>('json')

const formatOptions: FormatOption[] = [
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
  { value: 'properties', label: 'Properties' }
]

async function handleConvert() {
  error.value = ''
  isLoading.value = true
  
  try {
    if (!detectedFormat.value) {
      throw new Error('无法识别输入格式')
    }

    const result = await FileConverter.convert({
      content: inputContent.value,
      fromFormat: detectedFormat.value,
      toFormat: selectedOutputFormat.value
    })
    outputContent.value = result
  } catch (e) {
    error.value = e instanceof Error ? e.message : '转换失败'
  } finally {
    isLoading.value = false
  }
}

// 监听输入内容变化，自动检测格式并转换
watch([inputContent, selectedOutputFormat], async ([newContent]) => {
  detectedFormat.value = FileConverter.detectFormat(newContent)
  if (detectedFormat.value && newContent) {
    await handleConvert()
  } else {
    outputContent.value = ''
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col py-4 px-4">
    <div class="w-full max-w-[90rem] mx-auto bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6">
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          文件格式转换
        </h1>
      </div>

      <!-- 格式选择区域 -->
      <div class="bg-white/80 rounded-xl p-4 mb-4">
        <div class="flex items-center gap-6">
          <!-- 检测到的输入格式 -->
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-600 mb-2">检测到的格式</div>
            <div class="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium">
              {{ detectedFormat ? formatOptions.find(f => f.value === detectedFormat)?.label : '未检测到格式' }}
            </div>
          </div>

          <!-- 输出格式选择 -->
          <div class="flex-1">
            <div class="text-sm font-medium text-gray-600 mb-2">目标格式</div>
            <v-select
              v-model="selectedOutputFormat"
              :items="formatOptions"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="comfortable"
              hide-details
              class="bg-white rounded-lg"
            />
          </div>
        </div>
      </div>

      <!-- 输入输出区域 -->
      <div class="grid md:grid-cols-2 gap-4">
        <div>
          <div class="text-sm font-medium text-gray-600 mb-2">输入内容</div>
          <v-textarea
            v-model="inputContent"
            variant="outlined"
            placeholder="在此粘贴要转换的内容，将自动识别格式..."
            class="font-mono bg-white/80 rounded-xl"
            :rows="30"
            auto-grow
            hide-details
          />
        </div>
        
        <div>
          <div class="text-sm font-medium text-gray-600 mb-2">转换结果</div>
          <v-textarea
            v-model="outputContent"
            variant="outlined"
            readonly
            placeholder="转换结果将显示在这里..."
            class="font-mono bg-white/80 rounded-xl"
            :rows="30"
            auto-grow
            hide-details
          />
        </div>
      </div>

      <!-- 错误提示 -->
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mt-4"
      >
        {{ error }}
      </v-alert>
    </div>

    <!-- 加载动画 -->
    <div v-if="isLoading" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>
  </div>
</template>

<style scoped>
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
</style> 