<template>
  <div class="container mx-auto p-5 bg-white rounded-lg shadow-md">
    <h1 class="text-2xl text-gray-800 py-5">驼峰转换工具</h1>
    <div class="flex gap-3 items-center mb-5">
      <input
          type="text"
          v-model="inputText"
          placeholder="输入文本，自动识别格式并转换"
          class="flex-1 p-2 text-lg border border-gray-300 rounded-md"
      />
      <span class="text-gray-500">当前格式：{{ currentTypeLabel }}</span>
    </div>
    <div class="space-y-3 pb-5">
      <div
          v-for="(result, index) in convertedResults"
          :key="index"
          class="p-3 border border-gray-300 rounded-md cursor-pointer transition-all relative hover:bg-gray-100"
          :class="{ 'bg-green-100 border-green-400': copiedIndex === index }"
          @click="copyToClipboard(result.value, index)"
      >
        <div class="text-sm text-gray-500 mb-2">{{ result.label }}</div>
        <div>{{ result.value }}</div>
        <span
            v-if="copiedIndex === index"
            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500 text-sm"
        >已复制</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, computed} from 'vue'

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
