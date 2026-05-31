<template>
  <ToolPageLayout max-width="max-w-4xl">
    <!-- 输入区域 -->
      <div class="space-y-4 mb-8">
        <div class="flex gap-4 items-center">
          <v-text-field
            v-model="inputText"
            placeholder="输入文本，自动识别格式并转换"
            variant="outlined"
            class="flex-1 bg-white/80 rounded-xl"
            hide-details
          />
          <span class="text-gray-600 font-medium">当前格式：{{ currentTypeLabel }}</span>
        </div>
      </div>

      <!-- 转换结果 -->
      <div class="grid gap-4">
        <div
          v-for="(result, index) in convertedResults"
          :key="index"
          class="glass-card p-6 transition-all duration-300 hover:shadow-card-hover relative group"
          :class="{ 'ring-2 ring-blue-500 bg-blue-50': copiedIndex === index }"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-600 mb-2">{{ result.label }}</div>
              <div class="font-mono text-lg text-gray-800 break-all">{{ result.value }}</div>
            </div>
            <button
                @click="copyToClipboard(result.value, index)"
                class="flex-shrink-0 p-2 rounded-lg transition-all duration-200 hover:bg-blue-100 group-hover:bg-blue-50"
                :class="{ 'bg-blue-100 text-blue-600': copiedIndex === index }"
            >
              <svg
                  v-if="copiedIndex !== index"
                  class="w-5 h-5 text-gray-400 hover:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
              >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <svg
                  v-else
                  class="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
              >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
  </ToolPageLayout>
</template>

<script setup>
import {computed, ref} from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'

const inputText = ref('')
const copiedIndex = ref(-1)

// 类型标签映射
const typeLabels = {
  camel: '驼峰格式',
  underscore: '下划线格式',
  kebab: '中划线格式',
  lower: '小写格式',
  upper: '大写格式',
  empty: '空'
}

// 转换函数
const converters = {
  camelToUnderscore: (str) => {
    return str
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .replace(/([a-z\d])([A-Z])/g, '$1_$2')
        .toLowerCase()
  },
  camelToKebab: (str) => {
    return str
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .replace(/([a-z\d])([A-Z])/g, '$1-$2')
        .toLowerCase()
  },
  underscoreToCamel: (str) => {
    return str.toLowerCase()
        .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  },
  kebabToCamel: (str) => {
    return str.toLowerCase()
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
  },
  underscoreToKebab: (str) => str.replace(/_/g, '-'),
  kebabToUnderscore: (str) => str.replace(/-/g, '_'),

  // 新增大小写转换函数
  toUpper: (str) => {
    // 如果是驼峰、下划线或中划线格式，先转换为对应的分隔形式
    let processed = str
    if (/[A-Z]/.test(str) && !/[_-]/.test(str)) {
      processed = converters.camelToUnderscore(str)
    }
    return processed.toUpperCase()
  },
  toLower: (str) => {
    // 如果是驼峰、下划线或中划线格式，先转换为对应的分隔形式
    let processed = str
    if (/[A-Z]/.test(str) && !/[_-]/.test(str)) {
      processed = converters.camelToUnderscore(str)
    }
    return processed.toLowerCase()
  }
}

// 检测输入文本的类型
const detectType = (str) => {
  if (!str) return 'empty'
  // 全大写检测
  if (str === str.toUpperCase() && str.includes('_')) return 'upper'
  // 全小写检测
  if (str === str.toLowerCase() && !str.includes('_') && !str.includes('-')) return 'lower'
  // 其他检测
  if (/[A-Z]/.test(str) && !/[_-]/.test(str)) return 'camel'
  if (str.includes('_')) return 'underscore'
  if (str.includes('-')) return 'kebab'
  return 'lower'
}

// 计算当前类型
const currentType = computed(() => detectType(inputText.value))
const currentTypeLabel = computed(() => typeLabels[currentType.value] || '未知格式')

// 计算转换结果
const convertedResults = computed(() => {
  if (!inputText.value || currentType.value === 'empty') return []

  const results = []
  switch (currentType.value) {
    case 'camel':
      results.push(
          {label: '下划线格式', value: converters.camelToUnderscore(inputText.value)},
          {label: '中划线格式', value: converters.camelToKebab(inputText.value)},
          {label: '全大写格式', value: converters.toUpper(inputText.value)},
          {label: '全小写格式', value: converters.toLower(inputText.value)}
      )
      break
    case 'underscore':
      results.push(
          {label: '驼峰格式', value: converters.underscoreToCamel(inputText.value)},
          {label: '中划线格式', value: converters.underscoreToKebab(inputText.value)},
          {label: '全大写格式', value: converters.toUpper(inputText.value)},
          {label: '全小写格式', value: converters.toLower(inputText.value)}
      )
      break
    case 'kebab':
      results.push(
          {label: '驼峰格式', value: converters.kebabToCamel(inputText.value)},
          {label: '下划线格式', value: converters.kebabToUnderscore(inputText.value)},
          {label: '全大写格式', value: converters.toUpper(inputText.value)},
          {label: '全小写格式', value: converters.toLower(inputText.value)}
      )
      break
    case 'upper':
      results.push(
          {label: '驼峰格式', value: converters.kebabToCamel(inputText.value)},
          {label: '中划线格式', value: converters.underscoreToKebab(inputText.value)},
          {label: '下划线格式', value: converters.kebabToUnderscore(inputText.value)},
          {label: '全小写格式', value: converters.toLower(inputText.value)}
      )
      break
    case 'lower':
      results.push(
          {label: '驼峰格式', value: converters.underscoreToCamel(inputText.value)},
          {label: '下划线格式', value: converters.kebabToUnderscore(inputText.value)},
          {label: '中划线格式', value: converters.underscoreToKebab(inputText.value)},
          {label: '全大写格式', value: converters.toUpper(inputText.value)},
          {label: '全小写格式', value: converters.toLower(inputText.value)}
      )
      break
  }
  return results
})

// 复制到剪贴板
const copyToClipboard = async (text, index) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedIndex.value = index
    setTimeout(() => {
      copiedIndex.value = -1
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}
</script>
