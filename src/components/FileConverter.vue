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
  <div class="max-w-7xl mx-auto p-4">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <span v-if="detectedFormat" class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
          输入格式: {{ formatOptions.find(f => f.value === detectedFormat)?.label }}
        </span>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">输出格式:</span>
          <v-select
            v-model="selectedOutputFormat"
            :items="formatOptions"
            item-title="label"
            item-value="value"
            variant="outlined"
            density="comfortable"
            hide-details
            class="w-32"
          />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <!-- 左侧输入 -->
      <div>
        <v-textarea
          v-model="inputContent"
          rows="25"
          variant="outlined"
          placeholder="在此粘贴要转换的内容，将自动识别格式..."
          class="font-mono"
          hide-details
        />
      </div>

      <!-- 右侧输出 -->
      <div>
        <v-textarea
          v-model="outputContent"
          rows="25"
          variant="outlined"
          readonly
          placeholder="转换结果将显示在这里..."
          class="font-mono"
          hide-details
        />
      </div>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mt-4"
    >
      {{ error }}
    </v-alert>

    <div v-if="isLoading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      ></v-progress-circular>
    </div>
  </div>
</template>

<style scoped>
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
</style> 