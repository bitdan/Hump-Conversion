<template>
  <div class="health-viewer">
    <div class="hero-card">
      <div>
        <div class="eyebrow">Huawei Health</div>
        <h1 class="hero-title">健康数据目录浏览器</h1>
        <p class="hero-subtitle">
          选择导出的华为健康目录后，页面会批量读取全部 JSON，按类型聚合统计，并展示记录结构与原始内容。
        </p>
      </div>

      <div class="hero-actions">
        <input
            ref="folderInput"
            type="file"
            multiple
            class="hidden-input"
            @change="handleFolderPick"
            webkitdirectory
            directory
        >
        <v-btn color="primary" size="large" prepend-icon="mdi-folder-multiple" @click="openFolderPicker">
          选择健康目录
        </v-btn>
        <v-btn
            variant="tonal"
            color="secondary"
            prepend-icon="mdi-broom"
            :disabled="records.length === 0 && files.length === 0"
            @click="resetAll"
        >
          清空
        </v-btn>
      </div>
    </div>

    <v-alert
        v-if="loadMessage"
        :type="loadErrorCount > 0 ? 'warning' : 'success'"
        variant="tonal"
        class="mb-4"
    >
      {{ loadMessage }}
    </v-alert>

    <div class="panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">体脂体重趋势图</h2>
          <p class="panel-hint">点击指标切换显示。在图表区域按住横向拖动可缩放时间范围，双击恢复全范围。</p>
        </div>
        <div class="head-chips">
          <v-chip size="small" variant="tonal" color="primary">{{ filteredBodyCompositionEntries.length }} 条</v-chip>
          <v-chip size="small" variant="tonal" color="secondary">{{ formatTimestamp(activeTimeRange[0]) }} ~
            {{ formatTimestamp(activeTimeRange[1]) }}
          </v-chip>
        </div>
      </div>

      <div v-if="bodyFieldOptions.length === 0" class="empty-state">
        当前目录里没有识别到体脂/体重类数值数据。
      </div>

      <template v-else>
        <div class="metric-toolbar">
          <button
              v-for="option in bodyFieldOptions"
              :key="option.key"
              class="metric-pill"
              :class="{ active: selectedBodyMetrics.includes(option.key) }"
              @click="toggleBodyMetric(option.key)"
          >
            <span>{{ option.label }}</span>
            <small>{{ option.key }}</small>
          </button>
        </div>

        <div
            ref="chartShellRef"
            class="chart-shell"
            @mousedown="handleChartDragStart"
            @mousemove="handleChartDragMove"
            @mouseup="handleChartDragEnd"
            @mouseleave="handleChartDragEnd"
            @dblclick="resetTimeRange"
        >
          <canvas ref="bodyChartCanvas"/>
          <div v-if="dragOverlayStyle" class="drag-overlay" :style="dragOverlayStyle"></div>
          <div class="chart-tip">拖动缩放时间范围，双击重置</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js'
import {computed, nextTick, onBeforeUnmount, ref, watch} from 'vue'
import {getHealthTypeMetadata} from './huaweiHealthMetadata'

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Legend, Title, Tooltip)

interface SourceFileInfo {
  name: string
  size: number
}

interface RawHealthRecord {
  type?: number
  startTime?: number
  endTime?: number
  samplePoints?: Array<Record<string, unknown>>
  recordId?: string

  [key: string]: unknown
}

interface ParsedSamplePoint extends Record<string, unknown> {
  parsedValue?: unknown
  parsedFieldsMetadata?: unknown
  parsedFieldsModifyTime?: unknown
}

interface LoadedRecord {
  uid: string
  fileName: string
  type: number
  record: RawHealthRecord
  samplePoints: ParsedSamplePoint[]
  startTimeLabel: string
}

interface BodyCompositionPoint {
  uid: string
  type: number
  time: number
  timeLabel: string
  fileName: string
  values: Record<string, number>
}

const folderInput = ref<HTMLInputElement | null>(null)
const folderName = ref('')
const files = ref<SourceFileInfo[]>([])
const records = ref<LoadedRecord[]>([])
const loadMessage = ref('')
const loadErrorCount = ref(0)
const bodyChartCanvas = ref<HTMLCanvasElement | null>(null)
const chartShellRef = ref<HTMLDivElement | null>(null)
const selectedBodyMetrics = ref<string[]>([])
const selectedTimeRange = ref<[number, number]>([0, 0])
const dragStartX = ref<number | null>(null)
const dragCurrentX = ref<number | null>(null)
let bodyChartInstance: Chart | null = null

const bodyCompositionEntries = computed<BodyCompositionPoint[]>(() => {
  return records.value
      .filter(item => item.type === 8 || item.type === 10006)
      .map(item => {
        const firstPoint = item.samplePoints[0]
        const parsedValue = firstPoint?.parsedValue
        const values: Record<string, number> = {}

        if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
          for (const [key, rawValue] of Object.entries(parsedValue as Record<string, unknown>)) {
            if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
              values[key] = rawValue
            }
          }
        }

        return {
          uid: item.uid,
          type: item.type,
          time: typeof item.record.startTime === 'number' ? item.record.startTime : 0,
          timeLabel: item.startTimeLabel,
          fileName: item.fileName,
          values
        }
      })
      .filter(item => Object.keys(item.values).length > 0)
      .sort((a, b) => a.time - b.time)
})

const bodyFieldOptions = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of bodyCompositionEntries.value) {
    for (const key of Object.keys(entry.values)) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
      .map(([key, count]) => ({
        key,
        count,
        label: findFieldLabel(key)
      }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
})

const bodyTimeExtent = computed(() => {
  if (bodyCompositionEntries.value.length === 0) {
    return {min: 0, max: 0}
  }
  return {
    min: bodyCompositionEntries.value[0].time,
    max: bodyCompositionEntries.value[bodyCompositionEntries.value.length - 1].time
  }
})

const activeTimeRange = computed<[number, number]>(() => {
  const [start, end] = selectedTimeRange.value
  if (start <= 0 && end <= 0) {
    return [bodyTimeExtent.value.min, bodyTimeExtent.value.max]
  }
  return [Math.min(start, end), Math.max(start, end)]
})

const filteredBodyCompositionEntries = computed(() => {
  const [start, end] = activeTimeRange.value
  return bodyCompositionEntries.value.filter(item => item.time >= start && item.time <= end)
})

const dragOverlayStyle = computed(() => {
  if (dragStartX.value === null || dragCurrentX.value === null || !chartShellRef.value) {
    return null
  }
  const width = chartShellRef.value.clientWidth || 1
  const left = Math.max(0, Math.min(dragStartX.value, dragCurrentX.value))
  const overlayWidth = Math.abs(dragCurrentX.value - dragStartX.value)
  return {
    left: `${(left / width) * 100}%`,
    width: `${(overlayWidth / width) * 100}%`
  }
})

watch(bodyFieldOptions, (options) => {
  const availableKeys = new Set(options.map(item => item.key))
  const preferred = ['bodyWeight', 'bodyFatRate', 'bodyFat']
  const nextSelection = selectedBodyMetrics.value.filter(key => availableKeys.has(key))

  if (nextSelection.length > 0) {
    selectedBodyMetrics.value = nextSelection
    return
  }

  selectedBodyMetrics.value = preferred.filter(key => availableKeys.has(key))
  if (selectedBodyMetrics.value.length === 0 && options.length > 0) {
    selectedBodyMetrics.value = options.slice(0, Math.min(4, options.length)).map(item => item.key)
  }
}, {immediate: true})

watch(bodyTimeExtent, (extent) => {
  selectedTimeRange.value = [extent.min, extent.max]
}, {immediate: true})

watch([filteredBodyCompositionEntries, selectedBodyMetrics], async () => {
  await nextTick()
  renderBodyChart()
}, {deep: true})

onBeforeUnmount(() => {
  if (bodyChartInstance) {
    bodyChartInstance.destroy()
    bodyChartInstance = null
  }
})

function openFolderPicker() {
  folderInput.value?.click()
}

function toggleBodyMetric(key: string) {
  if (selectedBodyMetrics.value.includes(key)) {
    selectedBodyMetrics.value = selectedBodyMetrics.value.filter(item => item !== key)
    return
  }
  selectedBodyMetrics.value = [...selectedBodyMetrics.value, key]
}

function handleChartDragStart(event: MouseEvent) {
  if (filteredBodyCompositionEntries.value.length < 2 || !chartShellRef.value) return
  const rect = chartShellRef.value.getBoundingClientRect()
  dragStartX.value = event.clientX - rect.left
  dragCurrentX.value = dragStartX.value
}

function handleChartDragMove(event: MouseEvent) {
  if (dragStartX.value === null || !chartShellRef.value) return
  const rect = chartShellRef.value.getBoundingClientRect()
  dragCurrentX.value = Math.min(Math.max(0, event.clientX - rect.left), rect.width)
}

function handleChartDragEnd() {
  if (dragStartX.value === null || dragCurrentX.value === null || !chartShellRef.value) {
    dragStartX.value = null
    dragCurrentX.value = null
    return
  }

  const distance = Math.abs(dragCurrentX.value - dragStartX.value)
  const width = chartShellRef.value.clientWidth || 1
  if (distance < 12) {
    dragStartX.value = null
    dragCurrentX.value = null
    return
  }

  const fromRatio = Math.min(dragStartX.value, dragCurrentX.value) / width
  const toRatio = Math.max(dragStartX.value, dragCurrentX.value) / width
  const source = filteredBodyCompositionEntries.value
  const startIndex = Math.max(0, Math.floor(fromRatio * (source.length - 1)))
  const endIndex = Math.min(source.length - 1, Math.ceil(toRatio * (source.length - 1)))
  const startPoint = source[startIndex]
  const endPoint = source[endIndex]

  if (startPoint && endPoint && startPoint.time < endPoint.time) {
    selectedTimeRange.value = [startPoint.time, endPoint.time]
  }

  dragStartX.value = null
  dragCurrentX.value = null
}

async function handleFolderPick(event: Event) {
  const input = event.target as HTMLInputElement
  const pickedFiles = Array.from(input.files ?? [])
  if (pickedFiles.length === 0) return

  folderName.value = pickedFiles[0].webkitRelativePath.split('/')[0] || '已选目录'
  loadErrorCount.value = 0

  const sourceFiles: SourceFileInfo[] = []
  const loadedRecords: LoadedRecord[] = []

  for (const file of pickedFiles) {
    if (!file.name.toLowerCase().endsWith('.json')) continue

    sourceFiles.push({
      name: file.name,
      size: file.size
    })

    try {
      const text = await file.text()
      if (!text.trim()) continue

      const data = JSON.parse(text)
      if (!Array.isArray(data)) {
        loadErrorCount.value += 1
        continue
      }

      data.forEach((entry, index) => {
        const record = (entry ?? {}) as RawHealthRecord
        const samplePoints = Array.isArray(record.samplePoints) ? record.samplePoints : []
        const parsedSamplePoints = samplePoints.map(point => parseSamplePoint(point))
        const type = typeof record.type === 'number' ? record.type : -1

        loadedRecords.push({
          uid: `${file.name}-${index}-${record.recordId ?? 'unknown'}`,
          fileName: file.name,
          type,
          record,
          samplePoints: parsedSamplePoints,
          startTimeLabel: formatTimestamp(record.startTime)
        })
      })
    } catch {
      loadErrorCount.value += 1
    }
  }

  files.value = sourceFiles.sort((a, b) => a.name.localeCompare(b.name))
  records.value = loadedRecords.sort((a, b) => {
    const timeA = typeof a.record.startTime === 'number' ? a.record.startTime : 0
    const timeB = typeof b.record.startTime === 'number' ? b.record.startTime : 0
    return timeB - timeA
  })

  loadMessage.value = [
    `已读取 ${files.value.length} 个 JSON 文件`,
    `共 ${records.value.length} 条记录`,
    loadErrorCount.value > 0 ? `其中 ${loadErrorCount.value} 个文件解析失败或结构异常` : '全部文件解析成功'
  ].join('，')

  input.value = ''
}

function parseSamplePoint(point: Record<string, unknown>): ParsedSamplePoint {
  return {
    ...point,
    parsedValue: tryParseNestedJson(point.value),
    parsedFieldsMetadata: tryParseNestedJson(point.fieldsMetadata),
    parsedFieldsModifyTime: tryParseNestedJson(point.fieldsModifyTime)
  }
}

function tryParseNestedJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (!text || !(text.startsWith('{') || text.startsWith('['))) return value

  try {
    const parsed = JSON.parse(text)
    return recursivelyExpandStrings(parsed)
  } catch {
    return value
  }
}

function recursivelyExpandStrings(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => recursivelyExpandStrings(item))
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, recursivelyExpandStrings(item)])
    )
  }
  if (typeof value === 'string') {
    return tryParseNestedJson(value)
  }
  return value
}

function findFieldLabel(key: string) {
  const knownField = [8, 10006]
      .flatMap(type => getHealthTypeMetadata(type)?.fields ?? [])
      .find(field => field.key === key)
  return knownField?.label || key
}

function formatTimestamp(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(new Date(value))
}

function renderBodyChart() {
  if (!bodyChartCanvas.value) return

  if (bodyChartInstance) {
    bodyChartInstance.destroy()
    bodyChartInstance = null
  }

  const metricKeys = selectedBodyMetrics.value
  if (metricKeys.length === 0 || filteredBodyCompositionEntries.value.length === 0) return

  const colorPalette = ['#0f766e', '#2563eb', '#dc2626', '#ea580c', '#7c3aed', '#0891b2', '#65a30d', '#db2777']
  const labels = filteredBodyCompositionEntries.value.map(item => item.timeLabel)
  const scales = Object.fromEntries(metricKeys.map((key, index) => [key, {
    type: 'linear',
    display: true,
    position: index % 2 === 0 ? 'left' : 'right',
    grid: {
      drawOnChartArea: index === 0
    },
    ticks: {
      color: colorPalette[index % colorPalette.length]
    }
  }]))

  const datasets = metricKeys.map((key, index) => ({
    label: findFieldLabel(key),
    data: filteredBodyCompositionEntries.value.map(item => item.values[key] ?? null),
    borderColor: colorPalette[index % colorPalette.length],
    backgroundColor: `${colorPalette[index % colorPalette.length]}33`,
    pointRadius: 3,
    pointHoverRadius: 5,
    spanGaps: true,
    tension: 0.28,
    yAxisID: key
  }))

  bodyChartInstance = new Chart(bodyChartCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${context.parsed.y ?? '-'}`
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8
          }
        },
        ...scales
      }
    }
  })
}

function resetTimeRange() {
  selectedTimeRange.value = [bodyTimeExtent.value.min, bodyTimeExtent.value.max]
}

function resetAll() {
  folderName.value = ''
  files.value = []
  records.value = []
  loadMessage.value = ''
  loadErrorCount.value = 0
  selectedBodyMetrics.value = []
  selectedTimeRange.value = [0, 0]
}
</script>

<style scoped>
.health-viewer {
  min-height: 100vh;
  padding: 24px;
  background: radial-gradient(circle at top left, rgba(20, 184, 166, 0.18), transparent 28%),
  radial-gradient(circle at top right, rgba(59, 130, 246, 0.16), transparent 32%),
  linear-gradient(180deg, #f4fbfb 0%, #f8fafc 48%, #eff6ff 100%);
}

.hero-card,
.panel {
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(10px);
}

.hero-card {
  border-radius: 28px;
  padding: 28px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.eyebrow {
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-title {
  margin-top: 10px;
  font-size: 32px;
  line-height: 1.1;
  font-weight: 800;
  color: #0f172a;
}

.hero-subtitle {
  margin-top: 10px;
  max-width: 720px;
  font-size: 15px;
  line-height: 1.7;
  color: #475569;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hidden-input {
  display: none;
}

.panel {
  border-radius: 24px;
  padding: 18px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
  margin-bottom: 14px;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.panel-hint {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.metric-toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.metric-pill {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(248, 250, 252, 0.92);
  color: #0f172a;
  min-width: 120px;
}

.metric-pill small {
  color: #64748b;
}

.metric-pill.active {
  border-color: rgba(37, 99, 235, 0.5);
  background: rgba(219, 234, 254, 0.72);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.12);
}

.head-chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.chart-shell {
  position: relative;
  height: 420px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.9), rgba(255, 255, 255, 0.98));
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  user-select: none;
  cursor: col-resize;
}

.drag-overlay {
  position: absolute;
  top: 14px;
  bottom: 14px;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.16);
  border: 1px solid rgba(37, 99, 235, 0.4);
  pointer-events: none;
}

.chart-tip {
  position: absolute;
  right: 18px;
  bottom: 16px;
  font-size: 12px;
  color: #64748b;
  background: rgba(255, 255, 255, 0.88);
  padding: 4px 10px;
  border-radius: 999px;
}

.empty-state {
  border-radius: 18px;
  padding: 24px;
  text-align: center;
  color: #64748b;
  background: rgba(241, 245, 249, 0.72);
}

@media (max-width: 768px) {
  .health-viewer {
    padding: 14px;
  }

  .hero-card {
    padding: 20px;
    flex-direction: column;
  }

  .hero-title {
    font-size: 26px;
  }
}
</style>
