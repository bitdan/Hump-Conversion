<template>
  <ToolPageLayout max-width="max-w-4xl">
    <div class="case-converter">
      <v-text-field
          v-model="inputText"
          label="输入文本"
          placeholder="例如 userName、user_name、user-name"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
          autofocus
      >
        <template #append-inner>
          <v-chip size="small" color="primary" variant="tonal">
            {{ currentTypeLabel }}
          </v-chip>
        </template>
      </v-text-field>

      <v-alert
          v-if="!inputText"
          type="info"
          variant="tonal"
          density="comfortable"
          icon="mdi-lightbulb-outline"
      >
        输入一个变量名后，会自动生成驼峰、下划线、中划线和大小写格式。
      </v-alert>

      <div v-else class="result-grid">
        <v-card
            v-for="(result, index) in convertedResults"
            :key="result.label"
            class="result-card"
            :class="{ copied: copiedIndex === index }"
            variant="flat"
        >
          <div class="result-copy">
            <span>{{ result.label }}</span>
            <v-btn
                :icon="copiedIndex === index ? 'mdi-check' : 'mdi-content-copy'"
                :color="copiedIndex === index ? 'success' : undefined"
                variant="text"
                size="small"
                :aria-label="`复制${result.label}`"
                @click="copyToClipboard(result.value, index)"
            />
          </div>
          <code>{{ result.value }}</code>
        </v-card>
      </div>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'

type CaseType = 'camel' | 'underscore' | 'kebab' | 'lower' | 'upper' | 'empty'

interface ConvertResult {
  label: string
  value: string
}

const inputText = ref('')
const copiedIndex = ref(-1)

const typeLabels: Record<CaseType, string> = {
  camel: '驼峰格式',
  underscore: '下划线格式',
  kebab: '中划线格式',
  lower: '小写格式',
  upper: '大写格式',
  empty: '空'
}

const converters = {
  camelToUnderscore: (str: string) => str
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .replace(/([a-z\d])([A-Z])/g, '$1_$2')
      .toLowerCase(),
  camelToKebab: (str: string) => str
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .replace(/([a-z\d])([A-Z])/g, '$1-$2')
      .toLowerCase(),
  underscoreToCamel: (str: string) => str.toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
  kebabToCamel: (str: string) => str.toLowerCase().replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
  underscoreToKebab: (str: string) => str.replace(/_/g, '-'),
  kebabToUnderscore: (str: string) => str.replace(/-/g, '_'),
  toUpper: (str: string) => normalizeDelimited(str).toUpperCase(),
  toLower: (str: string) => normalizeDelimited(str).toLowerCase()
}

function normalizeDelimited(str: string) {
  if (/[A-Z]/.test(str) && !/[_-]/.test(str)) {
    return converters.camelToUnderscore(str)
  }
  return str
}

function detectType(str: string): CaseType {
  if (!str) return 'empty'
  if (str === str.toUpperCase() && str.includes('_')) return 'upper'
  if (str.includes('_')) return 'underscore'
  if (str.includes('-')) return 'kebab'
  if (/[A-Z]/.test(str)) return 'camel'
  return 'lower'
}

const currentType = computed(() => detectType(inputText.value))
const currentTypeLabel = computed(() => typeLabels[currentType.value] || '未知格式')

const convertedResults = computed<ConvertResult[]>(() => {
  const value = inputText.value.trim()
  if (!value) return []

  const resultsByType: Record<Exclude<CaseType, 'empty'>, ConvertResult[]> = {
    camel: [
      {label: '下划线格式', value: converters.camelToUnderscore(value)},
      {label: '中划线格式', value: converters.camelToKebab(value)},
      {label: '全大写格式', value: converters.toUpper(value)},
      {label: '全小写格式', value: converters.toLower(value)}
    ],
    underscore: [
      {label: '驼峰格式', value: converters.underscoreToCamel(value)},
      {label: '中划线格式', value: converters.underscoreToKebab(value)},
      {label: '全大写格式', value: converters.toUpper(value)},
      {label: '全小写格式', value: converters.toLower(value)}
    ],
    kebab: [
      {label: '驼峰格式', value: converters.kebabToCamel(value)},
      {label: '下划线格式', value: converters.kebabToUnderscore(value)},
      {label: '全大写格式', value: converters.toUpper(value)},
      {label: '全小写格式', value: converters.toLower(value)}
    ],
    upper: [
      {label: '驼峰格式', value: converters.underscoreToCamel(value)},
      {label: '中划线格式', value: converters.underscoreToKebab(value)},
      {label: '全小写格式', value: converters.toLower(value)}
    ],
    lower: [
      {label: '驼峰格式', value: converters.underscoreToCamel(value)},
      {label: '下划线格式', value: converters.kebabToUnderscore(value)},
      {label: '中划线格式', value: converters.underscoreToKebab(value)},
      {label: '全大写格式', value: converters.toUpper(value)}
    ]
  }

  const type = currentType.value
  if (type === 'empty') return []
  return resultsByType[type]
})

async function copyToClipboard(text: string, index: number) {
  try {
    await navigator.clipboard.writeText(text)
    copiedIndex.value = index
    window.setTimeout(() => {
      copiedIndex.value = -1
    }, 1600)
  } catch (err) {
    console.error('复制失败:', err)
  }
}
</script>

<style scoped>
.case-converter {
  display: grid;
  gap: 18px;
}

.result-grid {
  display: grid;
  gap: 12px;
}

.result-card {
  padding: 16px;
  border: 1px solid #dbe4ef;
  border-radius: 8px;
  background: #ffffff;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.result-card.copied {
  border-color: #22c55e;
  box-shadow: 0 12px 28px rgba(34, 197, 94, 0.12);
}

.result-copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.result-card code {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-family: Consolas, Monaco, monospace;
  font-size: 18px;
  overflow-wrap: anywhere;
}
</style>
