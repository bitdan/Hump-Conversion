<template>
  <div class="cron-page">
    <div class="cron-shell">
      <header class="cron-header">
        <div>
          <div class="eyebrow">Backend Ops Tool</div>
          <h1>Cron 表达式助手</h1>
          <p>生成 Cron、反解析字段含义，并预览本地时区下的后续执行时间。</p>
        </div>
        <v-chip color="primary" variant="tonal" prepend-icon="mdi-clock-check-outline">
          {{ cronModeLabel }}
        </v-chip>
      </header>

      <section class="toolbar-band">
        <v-text-field
            v-model="cronExpression"
            label="Cron 表达式"
            variant="outlined"
            density="comfortable"
            hide-details
            class="cron-input"
            placeholder="例如：0 */5 * * * ?"
            prepend-inner-icon="mdi-timer-cog-outline"
            @update:model-value="syncBuilderFromExpression"
        />
        <div class="toolbar-actions">
          <v-btn color="primary" prepend-icon="mdi-content-copy" :disabled="!isExpressionValid" @click="copyExpression">
            复制
          </v-btn>
          <v-btn variant="tonal" prepend-icon="mdi-restore" @click="resetExpression">
            重置
          </v-btn>
        </div>
      </section>

      <v-alert v-if="validationErrors.length" type="error" variant="tonal" density="comfortable" class="mb-4">
        {{ validationErrors[0] }}
      </v-alert>

      <div class="content-grid">
        <div class="left-column">
          <section class="panel builder-panel">
            <div class="panel-title">
              <v-icon icon="mdi-hammer-wrench"/>
              <span>生成 Cron</span>
            </div>

            <v-tabs v-model="builderType" density="comfortable" color="primary" class="mb-5"
                    @update:model-value="applyBuilder">
              <v-tab value="interval">间隔</v-tab>
              <v-tab value="daily">每天</v-tab>
              <v-tab value="weekly">每周</v-tab>
              <v-tab value="monthly">每月</v-tab>
              <v-tab value="custom">自定义</v-tab>
            </v-tabs>

            <div v-if="builderType === 'interval'" class="builder-form">
              <v-select
                  v-model="intervalUnit"
                  :items="intervalUnits"
                  label="间隔单位"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @update:model-value="applyBuilder"
              />
              <v-text-field
                  v-model="intervalValue"
                  label="间隔值"
                  type="number"
                  :min="1"
                  :max="intervalUnit === 'minute' ? 59 : 23"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @update:model-value="applyBuilder"
              />
            </div>

            <div v-else-if="builderType === 'daily'" class="builder-form">
              <v-text-field
                  v-model="dailyTime"
                  label="执行时间"
                  type="time"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @update:model-value="applyBuilder"
              />
            </div>

            <div v-else-if="builderType === 'weekly'" class="builder-form">
              <v-select
                  v-model="weeklyDays"
                  :items="weekOptions"
                  label="星期"
                  multiple
                  chips
                  closable-chips
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @update:model-value="applyBuilder"
              />
              <v-text-field
                  v-model="weeklyTime"
                  label="执行时间"
                  type="time"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @update:model-value="applyBuilder"
              />
            </div>

            <div v-else-if="builderType === 'monthly'" class="builder-form">
              <v-text-field
                  v-model="monthlyDay"
                  label="每月日期"
                  type="number"
                  :min="1"
                  :max="31"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @update:model-value="applyBuilder"
              />
              <v-text-field
                  v-model="monthlyTime"
                  label="执行时间"
                  type="time"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @update:model-value="applyBuilder"
              />
            </div>

            <div v-else class="field-grid">
              <v-text-field v-model="customFields.second" label="秒" variant="outlined" density="comfortable"
                            hide-details @update:model-value="applyBuilder"/>
              <v-text-field v-model="customFields.minute" label="分" variant="outlined" density="comfortable"
                            hide-details @update:model-value="applyBuilder"/>
              <v-text-field v-model="customFields.hour" label="时" variant="outlined" density="comfortable" hide-details
                            @update:model-value="applyBuilder"/>
              <v-text-field v-model="customFields.dayOfMonth" label="日" variant="outlined" density="comfortable"
                            hide-details @update:model-value="applyBuilder"/>
              <v-text-field v-model="customFields.month" label="月" variant="outlined" density="comfortable"
                            hide-details @update:model-value="applyBuilder"/>
              <v-text-field v-model="customFields.dayOfWeek" label="周" variant="outlined" density="comfortable"
                            hide-details @update:model-value="applyBuilder"/>
            </div>

            <div class="preset-row">
              <v-btn
                  v-for="preset in presets"
                  :key="preset.expression"
                  variant="tonal"
                  size="small"
                  @click="usePreset(preset.expression)"
              >
                {{ preset.label }}
              </v-btn>
            </div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <v-icon icon="mdi-text-box-search-outline"/>
              <span>反解析 Cron</span>
            </div>
            <div class="meaning-list">
              <div v-for="item in fieldMeanings" :key="item.label" class="meaning-row">
                <div class="meaning-label">{{ item.label }}</div>
                <div>
                  <div class="meaning-value">{{ item.value }}</div>
                  <div class="meaning-text">{{ item.meaning }}</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section class="panel preview-panel">
          <div class="panel-title">
            <v-icon icon="mdi-calendar-clock"/>
            <span>下次执行时间预览</span>
          </div>
          <div class="preview-config">
            <v-text-field
                v-model="startTimeText"
                label="从此时间之后开始"
                type="datetime-local"
                variant="outlined"
                density="comfortable"
                hide-details
            />
            <v-select
                v-model="previewCount"
                :items="[5, 10, 20]"
                label="数量"
                variant="outlined"
                density="comfortable"
                hide-details
            />
          </div>
          <div v-if="nextRuns.length" class="run-list">
            <div v-for="(run, index) in nextRuns" :key="run.getTime()" class="run-row">
              <span class="run-index">{{ index + 1 }}</span>
              <span class="run-time">{{ formatDateTime(run) }}</span>
            </div>
          </div>
          <v-alert v-else type="info" variant="tonal" density="comfortable">
            当前表达式暂未计算出执行时间。
          </v-alert>
        </section>
      </div>
    </div>

    <v-snackbar v-model="snackbarVisible" :color="snackbarColor" timeout="2000" location="top">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import {computed, reactive, ref} from 'vue'

type BuilderType = 'interval' | 'daily' | 'weekly' | 'monthly' | 'custom'
type ParsedField = { raw: string; values: Set<number> | null; wildcard: boolean }

const cronExpression = ref('0 */5 * * * ?')
const builderType = ref<BuilderType>('interval')
const intervalUnit = ref<'minute' | 'hour'>('minute')
const intervalValue = ref(5)
const dailyTime = ref('09:00')
const weeklyDays = ref<number[]>([1])
const weeklyTime = ref('09:00')
const monthlyDay = ref(1)
const monthlyTime = ref('09:00')
const previewCount = ref(10)
const startTimeText = ref(toDateTimeInputValue(new Date()))
const snackbarVisible = ref(false)
const snackbarText = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const customFields = reactive({
  second: '0',
  minute: '*/5',
  hour: '*',
  dayOfMonth: '*',
  month: '*',
  dayOfWeek: '?'
})

const intervalUnits = [
  {title: '分钟', value: 'minute'},
  {title: '小时', value: 'hour'}
]

const weekOptions = [
  {title: '周日', value: 0},
  {title: '周一', value: 1},
  {title: '周二', value: 2},
  {title: '周三', value: 3},
  {title: '周四', value: 4},
  {title: '周五', value: 5},
  {title: '周六', value: 6}
]

const presets = [
  {label: '每 5 分钟', expression: '0 */5 * * * ?'},
  {label: '每小时整点', expression: '0 0 * * * ?'},
  {label: '每天 9 点', expression: '0 0 9 * * ?'},
  {label: '工作日 9 点', expression: '0 0 9 ? * 1-5'},
  {label: '每月 1 日', expression: '0 0 0 1 * ?'}
]

const parsedExpression = computed(() => parseCronExpression(cronExpression.value))
const validationErrors = computed(() => parsedExpression.value.errors)
const isExpressionValid = computed(() => validationErrors.value.length === 0)
const cronModeLabel = computed(() => parsedExpression.value.hasSeconds ? '6 位 Quartz 风格' : '5 位 Unix 风格')

const fieldMeanings = computed(() => {
  const parsed = parsedExpression.value
  if (parsed.errors.length) {
    return [
      {label: '表达式', value: cronExpression.value, meaning: '请先修正表达式格式或字段范围。'}
    ]
  }
  return parsed.fields.map(field => ({
    label: field.label,
    value: field.raw,
    meaning: describeField(field.raw, field.min, field.max, field.unit, field.names)
  }))
})

const nextRuns = computed(() => {
  const parsed = parsedExpression.value
  if (parsed.errors.length) return []
  const start = new Date(startTimeText.value)
  if (Number.isNaN(start.getTime())) return []
  return getNextRuns(parsed, start, previewCount.value)
})

function applyBuilder() {
  if (builderType.value === 'interval') {
    const value = clampNumber(intervalValue.value, 1, intervalUnit.value === 'minute' ? 59 : 23)
    intervalValue.value = value
    cronExpression.value = intervalUnit.value === 'minute'
        ? `0 */${value} * * * ?`
        : `0 0 */${value} * * ?`
    return
  }

  if (builderType.value === 'daily') {
    const {hour, minute} = parseTimeValue(dailyTime.value)
    cronExpression.value = `0 ${minute} ${hour} * * ?`
    return
  }

  if (builderType.value === 'weekly') {
    const {hour, minute} = parseTimeValue(weeklyTime.value)
    const days = weeklyDays.value.length ? [...weeklyDays.value].sort((a, b) => a - b).join(',') : '*'
    cronExpression.value = `0 ${minute} ${hour} ? * ${days}`
    return
  }

  if (builderType.value === 'monthly') {
    const {hour, minute} = parseTimeValue(monthlyTime.value)
    cronExpression.value = `0 ${minute} ${hour} ${clampNumber(monthlyDay.value, 1, 31)} * ?`
    return
  }

  cronExpression.value = [
    customFields.second || '0',
    customFields.minute || '*',
    customFields.hour || '*',
    customFields.dayOfMonth || '*',
    customFields.month || '*',
    customFields.dayOfWeek || '?'
  ].join(' ')
}

function syncBuilderFromExpression() {
  const parsed = parsedExpression.value
  if (parsed.errors.length || !parsed.hasSeconds) return
  const values = parsed.fields.map(field => field.raw)
  customFields.second = values[0]
  customFields.minute = values[1]
  customFields.hour = values[2]
  customFields.dayOfMonth = values[3]
  customFields.month = values[4]
  customFields.dayOfWeek = values[5]
}

function usePreset(expression: string) {
  cronExpression.value = expression
  syncBuilderFromExpression()
}

function resetExpression() {
  builderType.value = 'interval'
  intervalUnit.value = 'minute'
  intervalValue.value = 5
  cronExpression.value = '0 */5 * * * ?'
  syncBuilderFromExpression()
}

async function copyExpression() {
  try {
    await navigator.clipboard.writeText(cronExpression.value)
    showSnackbar('Cron 表达式已复制', 'success')
  } catch (error) {
    showSnackbar('复制失败，请手动复制', 'error')
  }
}

function parseCronExpression(expression: string) {
  const parts = expression.trim().split(/\s+/).filter(Boolean)
  const errors: string[] = []
  const hasSeconds = parts.length === 6

  if (parts.length !== 5 && parts.length !== 6) {
    return {errors: ['Cron 表达式需要 5 位或 6 位字段。'], hasSeconds, fields: [] as any[]}
  }

  const rawFields = hasSeconds ? parts : ['0', ...parts]
  const defs = [
    {key: 'second', label: '秒', min: 0, max: 59, unit: '秒'},
    {key: 'minute', label: '分', min: 0, max: 59, unit: '分钟'},
    {key: 'hour', label: '时', min: 0, max: 23, unit: '小时'},
    {key: 'dayOfMonth', label: '日', min: 1, max: 31, unit: '日'},
    {key: 'month', label: '月', min: 1, max: 12, unit: '月', names: monthNames},
    {key: 'dayOfWeek', label: '周', min: 0, max: 7, unit: '星期', names: dayNames}
  ]

  const fields = defs.map((def, index) => {
    const raw = rawFields[index]
    const parsed = parseField(raw, def.min, def.max, def.names)
    if (parsed.error) errors.push(`${def.label}字段：${parsed.error}`)
    return {...def, raw, parsed: parsed.field}
  })

  return {errors, hasSeconds, fields}
}

function parseField(rawValue: string, min: number, max: number, names?: Record<string, number>): {
  field: ParsedField;
  error?: string
} {
  const raw = rawValue.toUpperCase()
  if (raw === '*' || raw === '?') {
    return {field: {raw: rawValue, values: null, wildcard: true}}
  }

  const values = new Set<number>()
  for (const segment of raw.split(',')) {
    if (!segment) return {field: {raw: rawValue, values, wildcard: false}, error: '存在空片段'}
    const [rangePart, stepPart] = segment.split('/')
    const step = stepPart ? Number(stepPart) : 1
    if (!Number.isInteger(step) || step < 1) {
      return {field: {raw: rawValue, values, wildcard: false}, error: '步长必须是正整数'}
    }

    const range = parseRange(rangePart, min, max, names)
    if (range.error) return {field: {raw: rawValue, values, wildcard: false}, error: range.error}
    for (let value = range.start; value <= range.end; value += step) {
      values.add(max === 7 && value === 7 ? 0 : value)
    }
  }

  if (!values.size) return {field: {raw: rawValue, values, wildcard: false}, error: '没有可匹配的值'}
  return {field: {raw: rawValue, values, wildcard: false}}
}

function parseRange(raw: string, min: number, max: number, names?: Record<string, number>) {
  if (raw === '*') return {start: min, end: max}
  if (raw.includes('-')) {
    const [startRaw, endRaw] = raw.split('-')
    const start = parseNamedNumber(startRaw, names)
    const end = parseNamedNumber(endRaw, names)
    if (!isInRange(start, min, max) || !isInRange(end, min, max)) return {
      start: min,
      end: max,
      error: `范围必须在 ${min}-${max} 内`
    }
    if (start > end) return {start, end, error: '范围起始值不能大于结束值'}
    return {start, end}
  }
  const value = parseNamedNumber(raw, names)
  if (!isInRange(value, min, max)) return {start: min, end: max, error: `值必须在 ${min}-${max} 内`}
  return {start: value, end: value}
}

function parseNamedNumber(raw: string, names?: Record<string, number>) {
  const normalized = raw.toUpperCase()
  if (names && normalized in names) return names[normalized]
  return Number(normalized)
}

function isInRange(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max
}

function describeField(raw: string, min: number, max: number, unit: string, names?: Record<string, number>) {
  const value = raw.toUpperCase()
  if (value === '*') return `每${unit}都会触发`
  if (value === '?') return '不指定，用于日和星期字段避免冲突'
  if (value.includes(',')) return `在 ${raw} 这些${unit}触发`
  if (value.includes('/')) {
    const [base, step] = value.split('/')
    return base === '*' ? `每 ${step} 个${unit}触发一次` : `从 ${base} 开始每 ${step} 个${unit}触发一次`
  }
  if (value.includes('-')) return `在 ${raw} 这个${unit}范围内触发`
  const namedLabel = names ? Object.entries(names).find(([, numberValue]) => numberValue === Number(value))?.[0] : ''
  return `当${unit}为 ${namedLabel || raw} 时触发`
}

function getNextRuns(parsed: ReturnType<typeof parseCronExpression>, start: Date, count: number) {
  const runs: Date[] = []
  const cursor = new Date(start.getTime() + 1000)
  if (!parsed.hasSeconds) {
    cursor.setSeconds(0, 0)
    cursor.setMinutes(cursor.getMinutes() + 1)
  } else {
    cursor.setMilliseconds(0)
  }

  const stepMs = parsed.hasSeconds ? 1000 : 60 * 1000
  const maxIterations = parsed.hasSeconds ? 366 * 24 * 60 * 60 : 366 * 24 * 60

  for (let i = 0; i < maxIterations && runs.length < count; i += 1) {
    if (matchesCron(parsed, cursor)) {
      runs.push(new Date(cursor))
    }
    cursor.setTime(cursor.getTime() + stepMs)
  }
  return runs
}

function matchesCron(parsed: ReturnType<typeof parseCronExpression>, date: Date) {
  const values = [
    date.getSeconds(),
    date.getMinutes(),
    date.getHours(),
    date.getDate(),
    date.getMonth() + 1,
    date.getDay()
  ]
  return parsed.fields.every((field, index) => {
    const parsedField = field.parsed
    return parsedField.wildcard || !parsedField.values || parsedField.values.has(values[index])
  })
}

function parseTimeValue(value: string) {
  const [hourRaw = '0', minuteRaw = '0'] = value.split(':')
  return {
    hour: clampNumber(Number(hourRaw), 0, 23),
    minute: clampNumber(Number(minuteRaw), 0, 59)
  }
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

function toDateTimeInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function showSnackbar(message: string, color: 'success' | 'error') {
  snackbarText.value = message
  snackbarColor.value = color
  snackbarVisible.value = true
}

const monthNames = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12
}

const dayNames = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6
}
</script>

<style scoped>
.cron-page {
  min-height: 100vh;
  background: #f6f8fb;
  color: #172033;
  padding: 24px;
}

.cron-shell {
  max-width: 1280px;
  margin: 0 auto;
}

.cron-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.eyebrow {
  color: #2563eb;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.cron-header h1 {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 6px;
}

.cron-header p {
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
}

.toolbar-band {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.cron-input :deep(input) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 420px);
  gap: 16px;
  align-items: start;
}

.left-column {
  display: grid;
  gap: 16px;
}

.panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 18px;
}

.preview-panel {
  position: sticky;
  top: 16px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 750;
  font-size: 1.02rem;
  margin-bottom: 16px;
}

.builder-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.meaning-list,
.run-list {
  display: grid;
  gap: 10px;
}

.meaning-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #edf2f7;
}

.meaning-row:last-child {
  border-bottom: 0;
}

.meaning-label {
  color: #475569;
  font-weight: 700;
}

.meaning-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  color: #0f172a;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.meaning-text {
  color: #64748b;
  margin-top: 2px;
  font-size: 0.9rem;
}

.preview-config {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px;
  gap: 12px;
  margin-bottom: 14px;
}

.run-row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.run-index {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 700;
  font-size: 0.85rem;
}

.run-time {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  color: #0f172a;
}

@media (max-width: 960px) {
  .cron-page {
    padding: 16px;
  }

  .cron-header,
  .toolbar-band {
    grid-template-columns: 1fr;
  }

  .cron-header {
    display: grid;
  }

  .content-grid,
  .builder-form,
  .field-grid,
  .preview-config {
    grid-template-columns: 1fr;
  }

  .preview-panel {
    position: static;
  }

  .toolbar-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
