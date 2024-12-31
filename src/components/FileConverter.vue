<script setup lang="ts">
import { ref } from 'vue'
import { convertFile } from '../utils/fileConverter'

interface FormatOption {
  value: string
  label: string
}

const inputFormat = ref<string>('xml')
const outputFormat = ref<string>('yaml')
const inputContent = ref<string>('')
const outputContent = ref<string>('')
const error = ref<string>('')
const isLoading = ref<boolean>(false)

const formatOptions: FormatOption[] = [
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
  { value: 'properties', label: 'properties' }
]

async function handleConvert() {
  error.value = ''
  isLoading.value = true
  
  try {
    const result = await convertFile({
      content: inputContent.value,
      fromFormat: inputFormat.value,
      toFormat: outputFormat.value
    })
    outputContent.value = result
  } catch (e) {
    error.value = e instanceof Error ? e.message : '转换失败'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto p-4 space-y-6">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 mb-2">输入格式</label>
        <v-select
          v-model="inputFormat"
          :items="formatOptions"
          item-title="label"
          item-value="value"
          variant="outlined"
          density="comfortable"
        />
      </div>
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 mb-2">输出格式</label>
        <v-select
          v-model="outputFormat"
          :items="formatOptions"
          item-title="label"
          item-value="value"
          variant="outlined"
          density="comfortable"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">输入内容</label>
        <v-textarea
          v-model="inputContent"
          rows="10"
          variant="outlined"
          placeholder="在此粘贴要转换的内容..."
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">输出内容</label>
        <v-textarea
          v-model="outputContent"
          rows="10"
          variant="outlined"
          readonly
          placeholder="转换结果将显示在这里..."
        />
      </div>
    </div>

    <div class="flex justify-center">
      <v-btn
        color="primary"
        :loading="isLoading"
        :disabled="!inputContent"
        @click="handleConvert"
      >
        转换
      </v-btn>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mt-4"
    >
      {{ error }}
    </v-alert>
  </div>
</template> 