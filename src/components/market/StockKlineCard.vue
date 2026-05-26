<template>
  <v-card class="kline-card" variant="flat">
    <div class="kline-header">
      <div>
        <div class="kline-title">
          <h2>{{ snapshot?.name || '个股K线' }}</h2>
          <span v-if="snapshot?.code">{{ snapshot.code }}</span>
        </div>
        <p>{{ snapshot?.date || '--' }} · {{ periodLabel }} · 均线 / 成交量 / MACD</p>
      </div>
      <div v-if="summary" class="price-block" :class="priceTone">
        <strong>{{ summary.latest_price.toFixed(2) }}</strong>
        <span>{{ changeText }}</span>
      </div>
    </div>

    <v-alert v-if="error" type="warning" density="comfortable" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <div v-if="loading" class="kline-placeholder">
      <v-progress-circular indeterminate color="primary"/>
      <span>加载K线中...</span>
    </div>

    <template v-else-if="snapshot && snapshot.bars.length">
      <div class="summary-grid">
        <div v-for="item in metricCards" :key="item.label" class="metric-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>

      <div class="chip-row">
        <v-chip v-for="tag in snapshot.technical_tags" :key="tag" size="small" color="primary" variant="tonal">
          {{ tag }}
        </v-chip>
      </div>

      <div v-if="snapshot.intraday_signals.length" class="signal-grid">
        <article v-for="signal in snapshot.intraday_signals" :key="signal.signal_type" class="signal-card">
          <div class="signal-head">
            <div>
              <h3>{{ signal.title }}</h3>
              <p>{{ signal.phase }} · {{ formatObservedAt(signal.observed_at) }}</p>
            </div>
            <v-chip color="red" variant="tonal">{{ signal.signal_score.toFixed(1) }}</v-chip>
          </div>
          <div class="chip-row compact-row">
            <v-chip v-for="reason in signal.reasons" :key="reason" size="x-small" color="green" variant="tonal">
              {{ reason }}
            </v-chip>
            <v-chip v-for="risk in signal.risks" :key="risk" size="x-small" color="orange" variant="tonal">
              {{ risk }}
            </v-chip>
          </div>
        </article>
      </div>

      <div class="chart-shell">
        <div ref="chartContainer" class="trading-chart"></div>
        <div class="chart-date-footer">
          <span>{{ visibleRangeLabel }}</span>
        </div>
      </div>

      <div class="legend-row">
        <span v-if="isTimelineChart" class="legend-chip price-line">价格</span>
        <span v-if="isTimelineChart" class="legend-chip average-line">均价</span>
        <span v-if="!isTimelineChart" class="legend-chip candle-up">阳K</span>
        <span v-if="!isTimelineChart" class="legend-chip candle-down">阴K</span>
        <span v-if="!isTimelineChart" class="legend-chip ma5">MA5</span>
        <span v-if="!isTimelineChart" class="legend-chip ma10">MA10</span>
        <span v-if="!isTimelineChart" class="legend-chip ma20">MA20</span>
        <span v-if="!isTimelineChart" class="legend-chip ma60">MA60</span>
        <span class="legend-chip volume">VOL</span>
        <span v-if="!isTimelineChart" class="legend-chip dif">DIF</span>
        <span v-if="!isTimelineChart" class="legend-chip dea">DEA</span>
        <span v-if="!isTimelineChart" class="legend-chip macd">MACD</span>
      </div>
    </template>

    <div v-else class="kline-placeholder">
      <v-icon icon="mdi-chart-candlestick" size="40"/>
      <span>暂无K线数据</span>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {CandlestickSeries, ColorType, createChart, HistogramSeries, LineSeries} from 'lightweight-charts'
import type {StockKlineBar, StockKlineSnapshot, StockKlineSummary} from '@/api/marketReview'

const props = defineProps<{
  snapshot: StockKlineSnapshot | null
  loading?: boolean
  error?: string
}>()

const chartWidth = 872
const left = 56
const right = 928
const priceTop = 24
const priceBottom = 286
const volumeTop = 326
const volumeBottom = 390
const macdTop = 420
const macdBottom = 516
const minVisibleBars = 16

const rawBars = computed(() => props.snapshot?.bars || [])
const chartContainer = ref<HTMLElement | null>(null)
let chart: any = null
let resizeObserver: ResizeObserver | null = null
const visibleCount = ref(80)
const windowEnd = ref(0)
const dragging = ref(false)
const dragStartX = ref(0)
const dragStartEnd = ref(0)
const hoverIndex = ref<number | null>(null)
const fullCount = computed(() => rawBars.value.length)
const normalizedVisibleCount = computed(() => {
  if (!fullCount.value) return minVisibleBars
  return Math.max(minVisibleBars, Math.min(visibleCount.value, fullCount.value))
})
const windowStart = computed(() => Math.max(0, windowEnd.value - normalizedVisibleCount.value))
const maxWindowStart = computed(() => Math.max(fullCount.value - normalizedVisibleCount.value, 0))
const canPan = computed(() => fullCount.value > normalizedVisibleCount.value)
const bars = computed(() => rawBars.value.slice(windowStart.value, windowEnd.value))
const summary = computed<StockKlineSummary | null>(() => props.snapshot?.summary || null)
const isTimelineChart = computed(() => ['1', 'five_day'].includes(props.snapshot?.period || ''))
const periodLabel = computed(() => {
  const period = props.snapshot?.period || 'day'
  const labels: Record<string, string> = {
    '1': '分时',
    five_day: '五日K',
    day: '日K',
    week: '周K',
    year: '年K',
    '120': '120分钟',
    '60': '60分钟',
    '30': '30分钟',
    '15': '15分钟',
    '5': '5分钟'
  }
  if (labels[period]) return labels[period]
  if (period === 'day') return '日K'
  return `${period}分钟`
})

watch(() => props.snapshot, async () => {
  await renderTradingChart()
}, {deep: true})

onMounted(async () => {
  await renderTradingChart()
  if (chartContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      if (!chart || !chartContainer.value) return
      chart.applyOptions({width: chartContainer.value.clientWidth})
    })
    resizeObserver.observe(chartContainer.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  destroyChart()
})

async function renderTradingChart() {
  await nextTick()
  if (!chartContainer.value || !props.snapshot?.bars.length) {
    destroyChart()
    return
  }
  destroyChart()
  const container = chartContainer.value
  chart = createChart(container, {
    width: container.clientWidth,
    height: container.clientHeight || 560,
    autoSize: true,
    layout: {
      background: {type: ColorType.Solid, color: '#ffffff'},
      textColor: '#475569',
      fontSize: 12
    },
    grid: {
      vertLines: {color: '#edf2f7'},
      horzLines: {color: '#edf2f7'}
    },
    rightPriceScale: {
      borderColor: '#cbd5e1',
      scaleMargins: {top: 0.08, bottom: 0.28}
    },
    timeScale: {
      visible: true,
      borderColor: '#cbd5e1',
      timeVisible: isTimelineChart.value || props.snapshot.period !== 'day',
      secondsVisible: false,
      rightOffset: 4,
      barSpacing: isTimelineChart.value ? 6 : 8,
      minBarSpacing: 3,
      tickMarkFormatter: formatChartTick
    },
    crosshair: {
      mode: 1,
      vertLine: {color: '#64748b', labelBackgroundColor: '#334155'},
      horzLine: {color: '#64748b', labelBackgroundColor: '#334155'}
    }
  })
  if (isTimelineChart.value) {
    renderTimelineSeries()
  } else {
    renderCandlestickSeries()
  }
  chart.timeScale().fitContent()
}

function destroyChart() {
  if (!chart) return
  chart.remove()
  chart = null
}

function renderTimelineSeries() {
  const bars = rawBars.value
  const priceLine = chart.addSeries(LineSeries, {
    color: '#2563eb',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: true
  })
  priceLine.setData(bars.map(item => ({
    time: chartTime(item),
    value: item.close_price
  })))

  const averageLine = chart.addSeries(LineSeries, {
    color: '#f59e0b',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false
  })
  let amount = 0
  let volume = 0
  averageLine.setData(bars.map(item => {
    amount += item.amount || item.close_price * (item.volume || 0)
    volume += item.volume || 0
    return {
      time: chartTime(item),
      value: volume > 0 ? amount / volume : item.close_price
    }
  }))

  addVolumeSeries(bars)
}

function renderCandlestickSeries() {
  const bars = rawBars.value
  const candles = chart.addSeries(CandlestickSeries, {
    upColor: '#dc2626',
    downColor: '#16a34a',
    borderUpColor: '#dc2626',
    borderDownColor: '#16a34a',
    wickUpColor: '#dc2626',
    wickDownColor: '#16a34a',
    priceLineVisible: false
  })
  candles.setData(bars.map(item => ({
    time: chartTime(item),
    open: item.open_price,
    high: item.high_price,
    low: item.low_price,
    close: item.close_price
  })))

  addMaLine('ma5', '#f59e0b')
  addMaLine('ma10', '#7c3aed')
  addMaLine('ma20', '#2563eb')
  addMaLine('ma60', '#111827')
  addVolumeSeries(bars)
}

function addMaLine(key: 'ma5' | 'ma10' | 'ma20' | 'ma60', color: string) {
  const data = rawBars.value
      .filter(item => item[key] != null)
      .map(item => ({time: chartTime(item), value: item[key] as number}))
  if (!data.length) return
  const series = chart.addSeries(LineSeries, {
    color,
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false
  })
  series.setData(data)
}

function addVolumeSeries(bars: StockKlineBar[]) {
  const volumeSeries = chart.addSeries(HistogramSeries, {
    color: 'rgba(100, 116, 139, 0.45)',
    priceFormat: {type: 'volume'},
    priceLineVisible: false,
    lastValueVisible: false
  }, 1)
  volumeSeries.priceScale().applyOptions({
    scaleMargins: {top: 0.08, bottom: 0.12}
  })
  volumeSeries.setData(bars.map(item => ({
    time: chartTime(item),
    value: item.volume || 0,
    color: item.close_price >= item.open_price ? 'rgba(220, 38, 38, 0.55)' : 'rgba(22, 163, 74, 0.55)'
  })))
  const panes = chart.panes?.()
  if (panes?.[1]?.setHeight) {
    panes[1].setHeight(120)
  }
}

function chartTime(item: StockKlineBar) {
  if (item.trade_date.length > 10) {
    return Math.floor(new Date(item.trade_date.replace(' ', 'T')).getTime() / 1000) as any
  }
  return item.trade_date as any
}

function formatChartTick(time: any) {
  if (typeof time === 'number') {
    const date = new Date(time * 1000)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return isTimelineChart.value || props.snapshot?.period !== 'day' ? `${month}/${day} ${hour}:${minute}` : `${month}/${day}`
  }
  if (typeof time === 'string') {
    return formatAxisLabel(time)
  }
  if (time && typeof time === 'object' && 'month' in time && 'day' in time) {
    return `${String(time.month).padStart(2, '0')}/${String(time.day).padStart(2, '0')}`
  }
  return ''
}

const priceTone = computed(() => {
  const change = summary.value?.change_percent || 0
  if (change > 0) return 'up'
  if (change < 0) return 'down'
  return 'flat'
})

const changeText = computed(() => {
  const changeAmount = summary.value?.change_amount
  const changePercent = summary.value?.change_percent
  if (changeAmount == null || changePercent == null) return '--'
  const sign = changeAmount > 0 ? '+' : ''
  return `${sign}${changeAmount.toFixed(2)} / ${sign}${changePercent.toFixed(2)}%`
})

const metricCards = computed(() => {
  const data = summary.value
  if (!data) return []
  return [
    {label: '开盘', value: data.open_price.toFixed(2)},
    {label: '最高', value: data.high_price.toFixed(2)},
    {label: '最低', value: data.low_price.toFixed(2)},
    {label: '成交量', value: formatVolume(data.volume)},
    {label: '成交额', value: formatAmount(data.amount)},
    {label: '换手率', value: data.turnover_rate != null ? `${data.turnover_rate.toFixed(2)}%` : '--'},
  ]
})

const priceRange = computed(() => {
  if (!bars.value.length) {
    return {min: 0, max: 1}
  }
  const values = bars.value.flatMap((item) => {
    const list = [item.high_price, item.low_price]
    for (const value of [item.ma5, item.ma10, item.ma20, item.ma30, item.ma60]) {
      if (value != null) list.push(value)
    }
    return list
  })
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = Math.max((max - min) * 0.08, 0.6)
  return {min: min - padding, max: max + padding}
})

const volumeMax = computed(() => Math.max(...bars.value.map((item) => item.volume || 0), 1))
const macdRange = computed(() => {
  if (!bars.value.length) {
    return {min: -1, max: 1}
  }
  const values = bars.value.flatMap((item) => [item.macd || 0, item.dif || 0, item.dea || 0])
  const absolute = Math.max(...values.map((value) => Math.abs(value)), 0.1)
  const padding = Math.max(absolute * 0.28, 0.02)
  return {min: -absolute - padding, max: absolute + padding}
})

const barStep = computed(() => chartWidth / Math.max(bars.value.length, 1))
const barWidth = computed(() => Math.max(4, Math.min(10, barStep.value * 0.64)))

function priceY(value: number) {
  const range = priceRange.value
  const ratio = (value - range.min) / Math.max(range.max - range.min, 0.0001)
  return priceBottom - ratio * (priceBottom - priceTop)
}

function volumeY(value: number) {
  return volumeBottom - (value / volumeMax.value) * (volumeBottom - volumeTop)
}

function macdY(value: number) {
  const range = macdRange.value
  const ratio = (value - range.min) / Math.max(range.max - range.min, 0.0001)
  return macdBottom - ratio * (macdBottom - macdTop)
}

const candles = computed(() => bars.value.map((item, index) => {
  const x = left + barStep.value * index + barStep.value / 2
  const openY = priceY(item.open_price)
  const closeY = priceY(item.close_price)
  return {
    date: item.trade_date,
    x,
    highY: priceY(item.high_price),
    lowY: priceY(item.low_price),
    bodyY: Math.min(openY, closeY),
    bodyHeight: Math.max(Math.abs(openY - closeY), 1.8),
    bodyWidth: barWidth.value,
    tone: item.close_price >= item.open_price ? 'up' : 'down'
  }
}))

const maLines = computed(() => {
  const configs = [
    {label: 'MA5', key: 'ma5', color: '#f59e0b'},
    {label: 'MA10', key: 'ma10', color: '#7c3aed'},
    {label: 'MA20', key: 'ma20', color: '#2563eb'},
    {label: 'MA30', key: 'ma30', color: '#0f766e'},
    {label: 'MA60', key: 'ma60', color: '#111827'},
  ] as const
  return configs.map((config) => ({
    label: config.label,
    color: config.color,
    points: bars.value
        .map((item, index) => {
          const value = item[config.key]
          if (value == null) return ''
          const x = left + barStep.value * index + barStep.value / 2
          return `${x},${priceY(value)}`
        })
        .filter(Boolean)
        .join(' ')
  })).filter((item) => item.points)
})

const volumeBars = computed(() => bars.value.map((item, index) => {
  const x = left + barStep.value * index + barStep.value / 2
  const y = volumeY(item.volume || 0)
  return {
    date: item.trade_date,
    x,
    y,
    width: barWidth.value,
    height: Math.max(volumeBottom - y, 1.4),
    tone: item.close_price >= item.open_price ? 'up' : 'down'
  }
}))

const macdBars = computed(() => bars.value.map((item, index) => {
  const x = left + barStep.value * index + barStep.value / 2
  const zeroY = macdZeroY.value
  const valueY = macdY(item.macd || 0)
  return {
    date: item.trade_date,
    x,
    y: Math.min(zeroY, valueY),
    width: barWidth.value,
    height: Math.max(Math.abs(zeroY - valueY), 1.4),
    tone: (item.macd || 0) >= 0 ? 'up' : 'down'
  }
}))

const difLine = computed(() => buildIndicatorLine('dif'))
const deaLine = computed(() => buildIndicatorLine('dea'))

function buildIndicatorLine(key: 'dif' | 'dea') {
  return bars.value
      .map((item, index) => {
        const value = item[key]
        if (value == null) return ''
        const x = left + barStep.value * index + barStep.value / 2
        return `${x},${macdY(value)}`
      })
      .filter(Boolean)
      .join(' ')
}

const axisLabels = computed(() => {
  if (!bars.value.length) return []
  const points = [0, Math.floor((bars.value.length - 1) * 0.33), Math.floor((bars.value.length - 1) * 0.66), bars.value.length - 1]
  return [...new Set(points)].map((index) => ({
    key: `${index}-${bars.value[index].trade_date}`,
    text: formatAxisLabel(bars.value[index].trade_date),
    x: left + barStep.value * index + barStep.value / 2
  }))
})

const signalMarkers = computed(() => {
  const markers: Array<{ key: string; x: number; y: number; label: string; tone: string }> = []
  bars.value.forEach((item, index) => {
    const x = left + barStep.value * index + barStep.value / 2
    if (item.is_reseal_bar) {
      markers.push({key: `reseal-${item.trade_date}`, x, y: Math.max(priceY(item.high_price) - 8, 42), label: '回封', tone: 'reseal'})
    } else if (item.is_breakout_bar) {
      markers.push({key: `breakout-${item.trade_date}`, x, y: Math.max(priceY(item.high_price) - 8, 42), label: '触板', tone: 'breakout'})
    }
  })
  for (const signal of props.snapshot?.intraday_signals || []) {
    const index = bars.value.findIndex(item => item.trade_date === signal.observed_at)
    if (index < 0) continue
    const item = bars.value[index]
    markers.push({
      key: `${signal.signal_type}-${signal.observed_at}`,
      x: left + barStep.value * index + barStep.value / 2,
      y: Math.max(priceY(item.high_price) - 32, 42),
      label: signal.title.slice(0, 3),
      tone: signal.signal_type === 'weak_to_strong' ? 'strong' : 'signal'
    })
  }
  return markers
})

const priceGridLines = computed(() => buildGrid(priceRange.value.min, priceRange.value.max, priceTop, priceBottom))
const volumeGridLines = computed(() => buildGrid(0, volumeMax.value, volumeTop, volumeBottom, false))
const macdGridLines = computed(() => buildGrid(macdRange.value.min, macdRange.value.max, macdTop, macdBottom, false))
const macdZeroY = computed(() => macdY(0))
const hoveredBar = computed(() => {
  if (hoverIndex.value == null) return null
  return bars.value[hoverIndex.value] || null
})
const hoveredPoint = computed(() => {
  const item = hoveredBar.value
  if (hoverIndex.value == null || !item) return null
  const x = left + barStep.value * hoverIndex.value + barStep.value / 2
  return {
    x,
    closeY: priceY(item.close_price)
  }
})
const hoveredTooltip = computed(() => {
  const item = hoveredBar.value
  if (!item) return null
  const change = item.change_percent
  return {
    date: formatAxisLabel(item.trade_date),
    open: item.open_price.toFixed(2),
    high: item.high_price.toFixed(2),
    low: item.low_price.toFixed(2),
    close: item.close_price.toFixed(2),
    volume: formatVolume(item.volume),
    amount: formatAmount(item.amount),
    turnover: item.turnover_rate != null ? `${item.turnover_rate.toFixed(2)}%` : '--',
    macd: item.macd != null ? item.macd.toFixed(3) : '--',
    change: change == null ? '--' : `${change > 0 ? '+' : ''}${change.toFixed(2)}%`,
    tone: change == null || change === 0 ? 'flat' : change > 0 ? 'up' : 'down'
  }
})
const tooltipStyle = computed(() => {
  const point = hoveredPoint.value
  if (!point) return {}
  const x = Math.max(140, Math.min(point.x, 820))
  const y = Math.max(96, Math.min(point.closeY, 430))
  return {
    left: `${(x / 960) * 100}%`,
    top: `${(y / 560) * 100}%`
  }
})
const visibleRangeLabel = computed(() => {
  if (!bars.value.length) return '无数据'
  const first = formatAxisLabel(bars.value[0].trade_date)
  const last = formatAxisLabel(bars.value[bars.value.length - 1].trade_date)
  return `${first} - ${last} · ${bars.value.length}/${fullCount.value}根`
})

watch(rawBars, (next) => {
  visibleCount.value = Math.min(Math.max(80, minVisibleBars), Math.max(next.length, minVisibleBars))
  windowEnd.value = next.length
}, {immediate: true})

function buildGrid(min: number, max: number, top: number, bottom: number, withValue = true) {
  return Array.from({length: 4}, (_, index) => {
    const ratio = index / 3
    return {
      y: bottom - ratio * (bottom - top),
      value: withValue ? min + ratio * (max - min) : 0
    }
  })
}

function formatVolume(value: number) {
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万`
  return value.toFixed(0)
}

function formatAmount(value: number) {
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万`
  return value.toFixed(0)
}

function formatAxisLabel(value: string) {
  if (value.length > 10) {
    return `${value.slice(5, 10)} ${value.slice(11, 16)}`
  }
  return value.slice(5).replace('-', '/')
}

function formatObservedAt(value: string) {
  if (!value) return '--'
  if (value.length > 10) return value.slice(11, 16)
  return value
}

function clampWindowEnd(nextEnd: number, count = normalizedVisibleCount.value) {
  if (!fullCount.value) {
    windowEnd.value = 0
    return
  }
  const minEnd = Math.min(count, fullCount.value)
  windowEnd.value = Math.max(minEnd, Math.min(nextEnd, fullCount.value))
}

function setVisibleCount(nextCount: number) {
  if (!fullCount.value) return
  const next = Math.max(minVisibleBars, Math.min(nextCount, fullCount.value))
  visibleCount.value = next
  clampWindowEnd(fullCount.value, next)
}

function zoomIn() {
  setVisibleCount(Math.round(normalizedVisibleCount.value * 0.75))
}

function zoomOut() {
  setVisibleCount(Math.round(normalizedVisibleCount.value * 1.35))
}

function resetZoom() {
  visibleCount.value = Math.max(fullCount.value, minVisibleBars)
  windowEnd.value = fullCount.value
}

function handleWheel(event: WheelEvent) {
  if (!fullCount.value) return
  if (event.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

function handleRangeInput(event: Event) {
  const target = event.target as HTMLInputElement
  const start = Number(target.value || 0)
  clampWindowEnd(start + normalizedVisibleCount.value)
}

function handlePointerDown(event: PointerEvent) {
  if (!canPan.value) return
  dragging.value = true
  dragStartX.value = event.clientX
  dragStartEnd.value = windowEnd.value
  ;(event.currentTarget as SVGElement).setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  updateHoverIndex(event)
  if (!dragging.value || !canPan.value) return
  const deltaX = event.clientX - dragStartX.value
  const step = chartWidth / Math.max(normalizedVisibleCount.value, 1)
  const deltaBars = Math.round(deltaX / step)
  clampWindowEnd(dragStartEnd.value - deltaBars)
}

function updateHoverIndex(event: PointerEvent) {
  if (!bars.value.length) {
    hoverIndex.value = null
    return
  }
  const rect = (event.currentTarget as SVGElement).getBoundingClientRect()
  const svgX = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 960
  if (svgX < left || svgX > right) {
    hoverIndex.value = null
    return
  }
  const index = Math.max(0, Math.min(Math.floor((svgX - left) / barStep.value), bars.value.length - 1))
  hoverIndex.value = index
}

function handlePointerUp(event: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  try {
    ;(event.currentTarget as SVGElement).releasePointerCapture(event.pointerId)
  } catch {
    // Pointer may already be released when leaving the SVG.
  }
}

function handlePointerLeave(event: PointerEvent) {
  hoverIndex.value = null
  handlePointerUp(event)
}
</script>

<style scoped>
.kline-card {
  border: 1px solid #dbe4f0;
  border-radius: 16px;
  padding: 18px;
  background:
      radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 28%),
      linear-gradient(180deg, #ffffff, #f8fbff);
}

.kline-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.kline-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.kline-title h2 {
  margin: 0;
  font-size: 24px;
}

.kline-title span,
.kline-header p {
  margin: 0;
  color: #64748b;
}

.price-block {
  min-width: 150px;
  padding: 12px 14px;
  border-radius: 14px;
  text-align: right;
  background: #f8fafc;
}

.price-block strong {
  display: block;
  font-size: 28px;
  line-height: 1;
}

.price-block.up strong,
.price-block.up span {
  color: #dc2626;
}

.price-block.down strong,
.price-block.down span {
  color: #059669;
}

.price-block.flat strong,
.price-block.flat span {
  color: #1f2937;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(82px, 1fr));
  gap: 6px;
  margin-bottom: 10px;
}

.metric-card {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
  padding: 7px 9px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.86);
}

.metric-card span {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 11px;
  line-height: 1.2;
}

.metric-card strong {
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.compact-row {
  margin-bottom: 0;
}

.signal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.signal-card {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: rgba(241, 245, 249, 0.7);
}

.signal-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.signal-head h3 {
  margin: 0 0 4px;
  font-size: 16px;
}

.signal-head p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
}

.chart-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  margin-bottom: 18px;
  padding: 8px;
}

.trading-chart {
  width: 100%;
  height: clamp(500px, 60vh, 620px);
  min-height: 460px;
}

.chart-date-footer {
  display: flex;
  justify-content: flex-end;
  min-height: 28px;
  padding: 7px 8px 0;
  border-top: 1px solid #edf2f7;
  background: #ffffff;
  color: #64748b;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}

.grid-line {
  stroke: #dbe4f0;
  stroke-width: 1;
}

.muted-line {
  stroke-dasharray: 3 5;
}

.zero-line {
  stroke: #94a3b8;
  stroke-width: 1.2;
}

.axis-text {
  fill: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.axis-line {
  stroke: #dbe4f0;
  stroke-width: 1;
}

.signal-marker-line {
  stroke-width: 1;
  stroke-dasharray: 3 5;
  opacity: 0.55;
  pointer-events: none;
}

.signal-marker-line.reseal,
.signal-marker-line.signal {
  stroke: #dc2626;
}

.signal-marker-line.breakout {
  stroke: #f59e0b;
}

.signal-marker-line.strong {
  stroke: #2563eb;
}

.signal-marker-bg {
  fill: #ffffff;
  stroke-width: 1.2;
  pointer-events: none;
}

.signal-marker-bg.reseal,
.signal-marker-bg.signal {
  stroke: #dc2626;
}

.signal-marker-bg.breakout {
  stroke: #f59e0b;
}

.signal-marker-bg.strong {
  stroke: #2563eb;
}

.signal-marker-text {
  fill: #0f172a;
  font-size: 11px;
  font-weight: 700;
  pointer-events: none;
}

.crosshair-line {
  stroke: #334155;
  stroke-dasharray: 4 5;
  stroke-width: 1;
  opacity: 0.6;
  pointer-events: none;
}

.crosshair-dot {
  fill: #ffffff;
  stroke: #2563eb;
  stroke-width: 2;
  pointer-events: none;
}

.chart-tooltip {
  position: absolute;
  z-index: 2;
  width: 210px;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
  color: #0f172a;
  font-size: 12px;
  pointer-events: none;
  transform: translate(-50%, -108%);
}

.tooltip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.tooltip-head strong,
.tooltip-grid strong {
  font-variant-numeric: tabular-nums;
}

.tooltip-head .up {
  color: #dc2626;
}

.tooltip-head .down {
  color: #16a34a;
}

.tooltip-head .flat {
  color: #475569;
}

.tooltip-grid {
  display: grid;
  grid-template-columns: 28px 1fr 32px 1fr;
  gap: 5px 8px;
}

.tooltip-grid span {
  color: #64748b;
}

.tooltip-grid strong {
  text-align: right;
}

.wick-line {
  stroke-width: 1.4;
}

.wick-line.up,
.candle-body.up,
.volume-bar.up,
.macd-bar.up {
  stroke: #dc2626;
  fill: #dc2626;
}

.wick-line.down,
.candle-body.down,
.volume-bar.down,
.macd-bar.down {
  stroke: #16a34a;
  fill: #16a34a;
}

.ma-line,
.indicator-line {
  fill: none;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.legend-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: #f8fafc;
  color: #334155;
}

.legend-chip::before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: currentColor;
}

.legend-chip.ma5 {
  color: #f59e0b;
}

.legend-chip.price-line {
  color: #2563eb;
}

.legend-chip.average-line {
  color: #f59e0b;
}

.legend-chip.candle-up {
  color: #dc2626;
}

.legend-chip.candle-down {
  color: #16a34a;
}

.legend-chip.ma10 {
  color: #7c3aed;
}

.legend-chip.ma20 {
  color: #2563eb;
}

.legend-chip.ma30 {
  color: #0f766e;
}

.legend-chip.ma60 {
  color: #111827;
}

.legend-chip.volume {
  color: #64748b;
}

.legend-chip.dif {
  color: #f59e0b;
}

.legend-chip.dea {
  color: #2563eb;
}

.legend-chip.macd {
  color: #dc2626;
}

.kline-placeholder {
  min-height: 280px;
  display: grid;
  place-items: center;
  gap: 12px;
  color: #64748b;
}

@media (max-width: 960px) {
  .kline-header {
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .chart-svg {
    height: clamp(360px, 56vh, 500px);
    min-height: 340px;
  }
}

@media (max-width: 600px) {
  .kline-card {
    padding: 12px;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-card {
    padding: 6px 8px;
  }

  .trading-chart {
    height: clamp(420px, 60vh, 520px);
    min-height: 380px;
  }
}
</style>
