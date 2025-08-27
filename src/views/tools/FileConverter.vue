<script setup lang="ts">
import { ref, watch } from 'vue'
import { FileConverter } from '../../utils/fileConverter'

interface FormatOption {
  value: string
  label: string
}

const inputContent = ref<string>('')
const outputContent = ref<string>('')
const error = ref<string>('')
const isLoading = ref<boolean>(false)
const selectedInputFormat = ref<string>('')
const detectedInputFormat = ref<string>('')
const selectedOutputFormat = ref<string>('json')
const isValidInput = ref<boolean>(false)

const formatOptions: FormatOption[] = [
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
  { value: 'properties', label: 'Properties' }
]

function getEffectiveInputFormat(): string {
  return selectedInputFormat.value || detectedInputFormat.value || ''
}

// 验证输入内容格式（优先使用手动选择，否则使用自动检测）
function validateInputFormat() {
  const content = inputContent.value.trim()
  // 自动检测
  detectedInputFormat.value = content ? FileConverter.detectFormat(content) : ''

  const effective = getEffectiveInputFormat()
  if (!content || !effective) {
    isValidInput.value = false
    return
  }

  try {
    switch (effective) {
      case 'json':
        JSON.parse(content)
        isValidInput.value = true
        break
      case 'xml':
        isValidInput.value = content.startsWith('<?xml') || (content.startsWith('<') && content.endsWith('>'))
        break
      case 'yaml':
        isValidInput.value = content.includes(':') && (content.includes('  ') || content.includes('- '))
        break
      case 'properties':
        const lines = content.split('\n')
        isValidInput.value = lines.some(line => {
          const trimmed = line.trim()
          return trimmed && !trimmed.startsWith('#') && (trimmed.includes('=') || trimmed.includes(':'))
        })
        break
      default:
        isValidInput.value = false
    }
  } catch {
    isValidInput.value = false
  }
}

async function handleConvert() {
  error.value = ''
  isLoading.value = true
  
  try {
    const fromFormat = getEffectiveInputFormat()
    if (!fromFormat) {
      throw new Error('无法识别输入格式，请选择输入格式或提供可识别的内容')
    }

    if (!isValidInput.value) {
      throw new Error('输入内容格式无效，请检查输入或更改格式选择')
    }

    const result = await FileConverter.convert({
      content: inputContent.value,
      fromFormat,
      toFormat: selectedOutputFormat.value
    })
    outputContent.value = result
  } catch (e) {
    error.value = e instanceof Error ? e.message : '转换失败'
  } finally {
    isLoading.value = false
  }
}

// 监听输入内容或输入格式变化，验证并自动转换
watch([inputContent, selectedInputFormat], async () => {
  validateInputFormat()
  if (isValidInput.value && inputContent.value.trim()) {
    await handleConvert()
  } else {
    outputContent.value = ''
  }
})

// 监听输出格式变化，如果输入有效则重新转换
watch(selectedOutputFormat, async () => {
  if (isValidInput.value && inputContent.value.trim()) {
    await handleConvert()
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
        <div class="grid md:grid-cols-2 gap-6">
          <!-- 输入格式选择（可选） -->
          <div>
            <div class="text-sm font-medium text-gray-600 mb-2">输入格式（可选，未选择将自动识别）</div>
            <v-select
              v-model="selectedInputFormat"
              :items="formatOptions"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="comfortable"
              hide-details
              placeholder="选择输入格式（可不选）"
              class="bg-white rounded-lg"
            />
          </div>

          <!-- 输出格式选择 -->
          <div>
            <div class="text-sm font-medium text-gray-600 mb-2">目标格式</div>
            <v-select
              v-model="selectedOutputFormat"
              :items="formatOptions"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="comfortable"
              hide-details
              placeholder="选择输出格式"
              class="bg-white rounded-lg"
            />
          </div>
        </div>

        <!-- 自动检测提示 -->
        <div v-if="!selectedInputFormat && detectedInputFormat && inputContent.trim()" class="mt-3">
          <div class="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
            <v-icon icon="mdi-information" size="small" />
            自动识别：{{ formatOptions.find(f => f.value === detectedInputFormat)?.label }}
          </div>
        </div>

        <!-- 格式验证提示 -->
        <div v-if="getEffectiveInputFormat() && inputContent.trim()" class="mt-3">
          <v-alert
            :type="isValidInput ? 'success' : 'error'"
            variant="tonal"
            density="compact"
            class="mb-0"
          >
            <template v-slot:prepend>
              <v-icon :icon="isValidInput ? 'mdi-check-circle' : 'mdi-alert-circle'" />
            </template>
            {{ isValidInput ? '输入格式验证通过' : '输入格式验证失败，请检查输入内容或切换格式' }}
          </v-alert>
        </div>
      </div>

      <!-- 输入输出区域 -->
      <div class="grid md:grid-cols-2 gap-4">
        <div>
          <div class="text-sm font-medium text-gray-600 mb-2">输入内容</div>
          <v-textarea
            v-model="inputContent"
            variant="outlined"
            :placeholder="
              selectedInputFormat
                ? `在此粘贴${formatOptions.find(f => f.value === selectedInputFormat)?.label}格式的内容...`
                : (detectedInputFormat
                    ? `检测到 ${formatOptions.find(f => f.value === detectedInputFormat)?.label}，粘贴内容将自动转换...`
                    : '粘贴内容或选择输入格式，系统会自动识别')
            "
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