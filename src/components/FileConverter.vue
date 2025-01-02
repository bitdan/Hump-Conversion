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
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center py-8 px-4">
    <div class="w-full max-w-4xl bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          文件格式转换
        </h1>
      </div>

      <!-- 转换选项 -->
      <div class="bg-white/80 rounded-xl p-6 mb-6">
        <div class="grid grid-cols-2 gap-4">
          <v-select
            v-model="sourceFormat"
            :items="formats"
            label="源格式"
            variant="outlined"
            density="comfortable"
            class="bg-white rounded-lg"
          />
          <v-select
            v-model="targetFormat"
            :items="formats"
            label="目标格式"
            variant="outlined"
            density="comfortable"
            class="bg-white rounded-lg"
          />
        </div>
      </div>

      <!-- 输入输出区域 -->
      <div class="grid md:grid-cols-2 gap-6">
        <v-textarea
          v-model="inputContent"
          variant="outlined"
          placeholder="在此粘贴要转换的内容，将自动识别格式..."
          class="font-mono bg-white/80 rounded-xl"
          rows="20"
          hide-details
        />
        
        <v-textarea
          v-model="outputContent"
          variant="outlined"
          readonly
          placeholder="转换结果将显示在这里..."
          class="font-mono bg-white/80 rounded-xl"
          rows="20"
          hide-details
        />
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