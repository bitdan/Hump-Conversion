<template>
  <ToolPageLayout max-width="max-w-7xl">
    <div class="generator-layout">
      <section class="generator-config solid-card">
        <v-tabs v-model="mode" color="primary" density="compact" grow>
          <v-tab value="random" prepend-icon="mdi-shuffle-variant">安全随机</v-tab>
          <v-tab value="template" prepend-icon="mdi-code-braces">模板生成</v-tab>
        </v-tabs>

        <v-divider />

        <v-window v-model="mode" class="generator-window">
          <v-window-item value="random">
            <div class="config-section">
              <div class="section-header">
                <h2>基础设置</h2>
              </div>

              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="randomLength"
                    label="随机字符长度"
                    type="number"
                    min="1"
                    max="4096"
                    suffix="字符"
                    density="compact"
                    variant="outlined"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="count"
                    label="生成数量"
                    type="number"
                    min="1"
                    max="1000"
                    suffix="条"
                    density="compact"
                    variant="outlined"
                    hide-details
                  />
                </v-col>
              </v-row>
            </div>

            <div class="config-section">
              <div class="section-header">
                <h2>字符集</h2>
                <v-chip color="info" size="small" variant="tonal">
                  crypto 安全随机
                </v-chip>
              </div>

              <div class="character-grid">
                <v-checkbox
                  v-model="includeNumbers"
                  label="数字 0-9"
                  color="primary"
                  density="compact"
                  hide-details
                />
                <v-checkbox
                  v-model="includeLowercase"
                  label="小写字母 a-z"
                  color="primary"
                  density="compact"
                  hide-details
                />
                <v-checkbox
                  v-model="includeUppercase"
                  label="大写字母 A-Z"
                  color="primary"
                  density="compact"
                  hide-details
                />
                <v-checkbox
                  v-model="includeSpecial"
                  label="特殊字符"
                  color="primary"
                  density="compact"
                  hide-details
                />
              </div>

              <v-text-field
                v-model="customCharacters"
                class="mt-3"
                label="自定义字符集（可选）"
                placeholder="例如：中文甲乙丙、ABC123"
                density="compact"
                variant="outlined"
                hint="自定义字符会与已选择的字符集合并"
                persistent-hint
                clearable
              />
            </div>

            <div class="config-section">
              <div class="section-header">
                <h2>规则约束</h2>
              </div>

              <div class="switch-list">
                <v-switch
                  v-model="requireEachSelected"
                  label="每种已选字符集至少出现一次"
                  color="primary"
                  density="compact"
                  hide-details
                />
                <v-switch
                  v-model="excludeAmbiguous"
                  label="排除易混淆字符（0/O、1/l/I 等）"
                  color="primary"
                  density="compact"
                  hide-details
                />
                <v-switch
                  v-model="preventConsecutiveDuplicates"
                  label="禁止相邻字符重复"
                  color="primary"
                  density="compact"
                  hide-details
                />
              </div>
            </div>

            <div class="config-section">
              <div class="section-header">
                <h2>组合格式</h2>
              </div>

              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="prefix"
                    label="前缀"
                    placeholder="例如：KEY-"
                    density="compact"
                    variant="outlined"
                    hide-details
                    clearable
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="suffix"
                    label="后缀"
                    placeholder="例如：-DEV"
                    density="compact"
                    variant="outlined"
                    hide-details
                    clearable
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="separator"
                    label="分隔符"
                    placeholder="例如：-"
                    density="compact"
                    variant="outlined"
                    hide-details
                    clearable
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="groupSize"
                    label="每组字符数"
                    type="number"
                    min="0"
                    max="4096"
                    density="compact"
                    variant="outlined"
                    hint="0 表示不分组"
                    persistent-hint
                  />
                </v-col>
              </v-row>
            </div>
          </v-window-item>

          <v-window-item value="template">
            <div class="config-section">
              <div class="section-header">
                <h2>生成模板</h2>
                <v-chip color="primary" size="small" variant="tonal">
                  支持多个标记组合
                </v-chip>
              </div>

              <v-textarea
                v-model="template"
                label="模板内容"
                placeholder="ORD-{date:yyyyMMdd}-{upper:4}-{number:6}"
                variant="outlined"
                rows="4"
                auto-grow
                hide-details
              />

              <div class="template-help">
                <span class="template-help__label">插入标记</span>
                <div class="chip-row">
                  <v-chip
                    v-for="token in templateTokens"
                    :key="token.value"
                    size="small"
                    variant="outlined"
                    @click="appendToken(token.value)"
                  >
                    {{ token.label }}
                  </v-chip>
                </div>
              </div>
            </div>

            <div class="config-section">
              <div class="section-header">
                <h2>常用模板</h2>
              </div>

              <div class="preset-list">
                <button
                  v-for="preset in templatePresets"
                  :key="preset.value"
                  type="button"
                  class="preset-item"
                  @click="applyTemplatePreset(preset.value)"
                >
                  <v-icon :icon="preset.icon" color="primary" size="20" />
                  <span>
                    <strong>{{ preset.label }}</strong>
                    <small>{{ preset.value }}</small>
                  </span>
                </button>
              </div>
            </div>

            <div class="config-section">
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="count"
                    label="生成数量"
                    type="number"
                    min="1"
                    max="1000"
                    suffix="条"
                    density="compact"
                    variant="outlined"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="customCharacters"
                    label="custom 标记字符集"
                    placeholder="例如：ABC123"
                    density="compact"
                    variant="outlined"
                    hide-details
                    clearable
                  />
                </v-col>
              </v-row>

              <v-alert
                class="mt-3"
                color="info"
                variant="tonal"
                density="compact"
                icon="mdi-information-outline"
              >
                日期格式支持 yyyy、MM、dd、HH、mm、ss；sequence 会按生成顺序自动递增。
              </v-alert>
            </div>
          </v-window-item>
        </v-window>

        <div class="generate-action">
          <v-btn
            color="primary"
            size="large"
            block
            prepend-icon="mdi-auto-fix"
            @click="generate"
          >
            {{ mode === 'random' ? '生成安全随机字符串' : '根据模板生成' }}
          </v-btn>
        </div>
      </section>

      <section class="generator-results solid-card">
        <div class="results-header">
          <div>
            <h2>生成结果</h2>
            <p>{{ generatedStrings.length ? `共 ${generatedStrings.length} 条` : '等待生成' }}</p>
          </div>
          <div class="results-actions">
            <v-btn
              variant="text"
              size="small"
              prepend-icon="mdi-delete-outline"
              :disabled="!generatedStrings.length"
              @click="clearResults"
            >
              清空
            </v-btn>
            <v-btn
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="mdi-content-copy"
              :disabled="!generatedStrings.length"
              @click="copyAll"
            >
              复制全部
            </v-btn>
          </div>
        </div>

        <v-divider />

        <v-virtual-scroll
          v-if="generatedStrings.length"
          :items="generatedStrings"
          :height="resultsHeight"
          :item-height="64"
          class="result-list"
        >
          <template #default="{ item, index }">
            <div class="result-row">
              <span class="result-index">{{ index + 1 }}</span>
              <code>{{ item }}</code>
              <v-btn
                icon="mdi-content-copy"
                variant="text"
                color="primary"
                size="small"
                :aria-label="`复制第 ${index + 1} 条结果`"
                @click="copyString(item)"
              />
            </div>
          </template>
        </v-virtual-scroll>

        <div v-else class="empty-state results-empty">
          <div class="empty-state-icon">
            <v-icon icon="mdi-text-box-plus-outline" size="32" />
          </div>
          <h3>还没有生成结果</h3>
          <p>设置左侧规则后点击生成，结果会显示在这里。</p>
        </div>
      </section>
    </div>

    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      :timeout="2500"
      location="top"
    >
      {{ snackbarText }}
    </v-snackbar>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'
import {
  generateFromTemplate,
  generateRandomStrings
} from '@/utils/stringGenerator'

type GeneratorMode = 'random' | 'template'

const mode = ref<GeneratorMode>('random')
const randomLength = ref(16)
const count = ref(5)
const generatedStrings = ref<string[]>([])
const includeNumbers = ref(true)
const includeLowercase = ref(true)
const includeUppercase = ref(true)
const includeSpecial = ref(true)
const customCharacters = ref('')
const requireEachSelected = ref(true)
const excludeAmbiguous = ref(false)
const preventConsecutiveDuplicates = ref(false)
const prefix = ref('')
const suffix = ref('')
const separator = ref('')
const groupSize = ref(0)
const template = ref('ORD-{date:yyyyMMdd}-{upper:4}-{number:6}')
const showSnackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const resultsHeight = computed(() => Math.min(640, Math.max(360, generatedStrings.value.length * 64)))

const templateTokens = [
  { label: '数字', value: '{number:6}' },
  { label: '小写', value: '{lower:6}' },
  { label: '大写', value: '{upper:6}' },
  { label: '字母数字', value: '{alphanumeric:8}' },
  { label: '十六进制', value: '{hex:12}' },
  { label: '日期', value: '{date:yyyyMMdd}' },
  { label: '序号', value: '{sequence:4}' },
  { label: 'UUID', value: '{uuid}' },
  { label: '时间戳', value: '{timestamp}' },
  { label: '自定义', value: '{custom:6}' }
]

const templatePresets = [
  {
    label: '订单编号',
    value: 'ORD-{date:yyyyMMdd}-{upper:4}-{number:6}',
    icon: 'mdi-receipt-text-outline'
  },
  {
    label: '测试邮箱',
    value: 'user_{lower:8}_{sequence:3}@example.com',
    icon: 'mdi-email-outline'
  },
  {
    label: 'API Key',
    value: 'AK-{hex:8}-{hex:16}-{hex:8}',
    icon: 'mdi-key-outline'
  },
  {
    label: 'UUID',
    value: '{uuid}',
    icon: 'mdi-identifier'
  }
]

function generate() {
  try {
    generatedStrings.value = mode.value === 'random'
      ? generateRandomStrings({
        length: Number(randomLength.value),
        count: Number(count.value),
        includeNumbers: includeNumbers.value,
        includeLowercase: includeLowercase.value,
        includeUppercase: includeUppercase.value,
        includeSpecial: includeSpecial.value,
        customCharacters: customCharacters.value,
        excludeAmbiguous: excludeAmbiguous.value,
        requireEachSelected: requireEachSelected.value,
        preventConsecutiveDuplicates: preventConsecutiveDuplicates.value,
        prefix: prefix.value,
        suffix: suffix.value,
        separator: separator.value,
        groupSize: Number(groupSize.value)
      })
      : generateFromTemplate({
        template: template.value,
        count: Number(count.value),
        customCharacters: customCharacters.value
      })

    showMessage(`已生成 ${generatedStrings.value.length} 条字符串`, 'success')
  } catch (error) {
    showMessage(error instanceof Error ? error.message : '生成失败，请检查设置', 'error')
  }
}

function appendToken(token: string) {
  template.value += token
}

function applyTemplatePreset(value: string) {
  template.value = value
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.appendChild(textArea)
  textArea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textArea)
  if (!copied) {
    throw new Error('复制失败')
  }
}

async function copyString(value: string) {
  try {
    await writeClipboard(value)
    showMessage('已复制当前结果', 'success')
  } catch {
    showMessage('复制失败，请手动选择复制', 'error')
  }
}

async function copyAll() {
  try {
    await writeClipboard(generatedStrings.value.join('\n'))
    showMessage(`已复制 ${generatedStrings.value.length} 条结果`, 'success')
  } catch {
    showMessage('复制失败，请手动选择复制', 'error')
  }
}

function clearResults() {
  generatedStrings.value = []
}

function showMessage(message: string, color: 'success' | 'error') {
  snackbarText.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}
</script>

<style scoped>
.generator-layout {
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) minmax(440px, 1.1fr);
  gap: var(--space-section);
  align-items: start;
}

.generator-config,
.generator-results {
  overflow: hidden;
}

.generator-window {
  padding: var(--space-card);
}

.config-section + .config-section {
  margin-top: var(--space-section);
  padding-top: var(--space-section);
  border-top: 1px solid var(--color-border-light);
}

.section-header {
  margin-bottom: var(--space-element);
}

.section-header h2,
.results-header h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 1rem;
  font-weight: 650;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px var(--space-element);
}

.switch-list {
  display: grid;
  gap: 4px;
}

.template-help {
  margin-top: var(--space-element);
}

.template-help__label {
  display: block;
  margin-bottom: var(--space-tight);
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.preset-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-tight);
}

.preset-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-tight);
  min-width: 0;
  padding: var(--space-element);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-element);
  background: var(--color-surface);
  color: var(--color-text);
  line-height: 1.4;
  text-align: left;
}

.preset-item:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.preset-item span {
  display: grid;
  min-width: 0;
}

.preset-item strong {
  font-size: 0.875rem;
}

.preset-item small {
  margin-top: 2px;
  overflow: hidden;
  color: var(--color-text-muted);
  font-family: monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.generate-action {
  padding: 0 var(--space-card) var(--space-card);
}

.results-header {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-element);
  padding: var(--space-card);
}

.results-header p {
  margin: 3px 0 0;
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.results-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.result-list {
  padding: var(--space-tight);
}

.result-row {
  min-height: 56px;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 36px;
  align-items: center;
  gap: var(--space-tight);
  padding: var(--space-tight) var(--space-element);
  border-bottom: 1px solid var(--color-border-light);
}

.result-index {
  color: var(--color-text-subtle);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.result-row code {
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-size: 0.875rem;
  user-select: all;
}

.results-empty {
  min-height: 480px;
}

.results-empty h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1rem;
}

.results-empty p {
  margin: var(--space-tight) 0 0;
  font-size: 0.875rem;
}

@media (max-width: 1100px) {
  .generator-layout {
    grid-template-columns: 1fr;
  }

  .results-empty {
    min-height: 280px;
  }
}

@media (max-width: 600px) {
  .generator-layout {
    gap: var(--space-element);
  }

  .character-grid,
  .preset-list {
    grid-template-columns: 1fr;
  }

  .results-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
