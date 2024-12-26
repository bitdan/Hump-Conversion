<template>
  <div class="container">
    <h1>驼峰转换工具</h1>
    <div class="input-group">
      <input
          type="text"
          v-model="inputText"
          placeholder="输入文本，自动识别格式并转换"
      >
      <span class="type-indicator">当前格式：{{ currentTypeLabel }}</span>
    </div>
    <div class="results">
      <div
          v-for="(result, index) in convertedResults"
          :key="index"
          class="result-item"
          :class="{ copied: copiedIndex === index }"
          @click="copyToClipboard(result.value, index)"
      >
        <div class="type-label">{{ result.label }}</div>
        <div>{{ result.value }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

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
  // 原有转换函数
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
          { label: '下划线格式', value: converters.camelToUnderscore(inputText.value) },
          { label: '中划线格式', value: converters.camelToKebab(inputText.value) },
          { label: '全大写格式', value: converters.toUpper(inputText.value) },
          { label: '全小写格式', value: converters.toLower(inputText.value) }
      )
      break
    case 'underscore':
      results.push(
          { label: '驼峰格式', value: converters.underscoreToCamel(inputText.value) },
          { label: '中划线格式', value: converters.underscoreToKebab(inputText.value) },
          { label: '全大写格式', value: converters.toUpper(inputText.value) },
          { label: '全小写格式', value: converters.toLower(inputText.value) }
      )
      break
    case 'kebab':
      results.push(
          { label: '驼峰格式', value: converters.kebabToCamel(inputText.value) },
          { label: '下划线格式', value: converters.kebabToUnderscore(inputText.value) },
          { label: '全大写格式', value: converters.toUpper(inputText.value) },
          { label: '全小写格式', value: converters.toLower(inputText.value) }
      )
      break
    case 'upper':
      results.push(
          { label: '驼峰格式', value: converters.kebabToCamel(inputText.value) },
          { label: '中划线格式', value: converters.underscoreToKebab(inputText.value) },
          { label: '下划线格式', value: converters.kebabToUnderscore(inputText.value) },
          { label: '全小写格式', value: converters.toLower(inputText.value) }
      )
      break
    case 'lower':
      results.push(
          { label: '驼峰格式', value: converters.underscoreToCamel(inputText.value) },
          { label: '下划线格式', value: converters.kebabToUnderscore(inputText.value) },
          { label: '中划线格式', value: converters.underscoreToKebab(inputText.value) },
          { label: '全大写格式', value: converters.toUpper(inputText.value) },
          { label: '全小写格式', value: converters.toLower(inputText.value) }
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

<style scoped>
/* 样式保持不变 */
.container {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 20px auto;
  padding: 0 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.input-group {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
}

input {
  flex: 1;
  padding: 8px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.type-indicator {
  min-width: 100px;
  color: #666;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 20px;
}

.result-item {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background-color: #ffffff;
}

.result-item:hover {
  background-color: #f5f5f5;
  border-color: #ccc;
}

.result-item.copied {
  background-color: #e8f5e9;
  border-color: #81c784;
}

.result-item.copied::after {
  content: '已复制';
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #4caf50;
  font-size: 0.9em;
}

.type-label {
  color: #666;
  font-size: 0.9em;
  margin-bottom: 4px;
}

h1 {
  color: #333;
  padding: 20px 0;
  margin: 0;
  font-size: 24px;
}
</style>
