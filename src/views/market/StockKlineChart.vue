<template>
  <div class="chart-shell">
    <div ref="chartContainer" class="trading-chart"></div>
    <div class="chart-axis-row">
      <span
          v-for="label in axisLabels"
          :key="label.key"
          class="chart-axis-label"
      >
        {{ label.text }}
      </span>
    </div>
    <div class="chart-range-footer">{{ rangeLabel }}</div>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {CandlestickSeries, ColorType, createChart, HistogramSeries, LineSeries} from 'lightweight-charts'
import type {StockKlineBar} from '@/api/marketReview'

const props = defineProps<{
  bars: StockKlineBar[]
  period: string
}>()

const chartContainer = ref<HTMLElement | null>(null)
let chart: any = null
let resizeObserver: ResizeObserver | null = null

const isTimelineChart = computed(() => ['1', 'five_day'].includes(props.period))

const axisLabels = computed(() => {
  if (!props.bars.length) return []
  const points = [
    0,
    Math.floor((props.bars.length - 1) * 0.25),
    Math.floor((props.bars.length - 1) * 0.5),
    Math.floor((props.bars.length - 1) * 0.75),
    props.bars.length - 1
  ]
  return [...new Set(points)].map(index => ({
    key: `${index}-${props.bars[index].trade_date}`,
    text: formatAxisLabel(props.bars[index].trade_date)
  }))
})

const rangeLabel = computed(() => {
  if (!props.bars.length) return '无数据'
  const first = formatAxisLabel(props.bars[0].trade_date)
  const last = formatAxisLabel(props.bars[props.bars.length - 1].trade_date)
  return `${first} - ${last} · ${props.bars.length}根`
})

watch(() => [props.bars, props.period], renderChart, {deep: true})

onMounted(async () => {
  await renderChart()
  if (chartContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      if (!chart || !chartContainer.value) return
      chart.applyOptions({width: chartContainer.value.clientWidth})
      chart.timeScale().fitContent()
    })
    resizeObserver.observe(chartContainer.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  destroyChart()
})

async function renderChart() {
  await nextTick()
  if (!chartContainer.value || !props.bars.length) {
    destroyChart()
    return
  }

  destroyChart()
  const container = chartContainer.value
  chart = createChart(container, {
    width: container.clientWidth,
    height: container.clientHeight || 520,
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
    leftPriceScale: {
      visible: true,
      borderColor: '#cbd5e1',
      scaleMargins: {top: 0.08, bottom: 0.28}
    },
    rightPriceScale: {
      visible: true,
      borderColor: '#cbd5e1',
      scaleMargins: {top: 0.08, bottom: 0.28}
    },
    timeScale: {
      visible: true,
      borderVisible: true,
      borderColor: '#cbd5e1',
      timeVisible: isTimelineChart.value || props.period !== 'day',
      secondsVisible: false,
      rightOffset: 4,
      barSpacing: isTimelineChart.value ? 6 : 8,
      minBarSpacing: 3,
      ticksVisible: true,
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
  const priceLine = chart.addSeries(LineSeries, {
    color: '#2563eb',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: true,
    priceScaleId: 'left'
  })
  priceLine.setData(props.bars.map(item => ({
    time: chartTime(item),
    value: item.close_price
  })))

  const averageLine = chart.addSeries(LineSeries, {
    color: '#f59e0b',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
    priceScaleId: 'left'
  })
  let amount = 0
  let volume = 0
  averageLine.setData(props.bars.map(item => {
    amount += item.amount || item.close_price * (item.volume || 0)
    volume += item.volume || 0
    return {
      time: chartTime(item),
      value: volume > 0 ? amount / volume : item.close_price
    }
  }))

  addPercentScaleSeries()
  addVolumeSeries()
}

function renderCandlestickSeries() {
  const candles = chart.addSeries(CandlestickSeries, {
    upColor: '#dc2626',
    downColor: '#16a34a',
    borderUpColor: '#dc2626',
    borderDownColor: '#16a34a',
    wickUpColor: '#dc2626',
    wickDownColor: '#16a34a',
    priceLineVisible: false,
    priceScaleId: 'left'
  })
  candles.setData(props.bars.map(item => ({
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
  addPercentScaleSeries()
  addVolumeSeries()
}

function addMaLine(key: 'ma5' | 'ma10' | 'ma20' | 'ma60', color: string) {
  const data = props.bars
      .filter(item => item[key] != null)
      .map(item => ({time: chartTime(item), value: item[key] as number}))
  if (!data.length) return
  const series = chart.addSeries(LineSeries, {
    color,
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
    priceScaleId: 'left'
  })
  series.setData(data)
}

function addPercentScaleSeries() {
  const basePrice = getPercentBasePrice()
  if (!basePrice) return
  const series = chart.addSeries(LineSeries, {
    color: 'rgba(37, 99, 235, 0)',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
    priceScaleId: 'right',
    priceFormat: {
      type: 'custom',
      formatter: (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
    }
  })
  series.setData(props.bars.map(item => ({
    time: chartTime(item),
    value: ((item.close_price - basePrice) / basePrice) * 100
  })))
}

function getPercentBasePrice() {
  const first = props.bars[0]
  if (!first) return 0
  const previousClose = first.change_amount != null ? first.close_price - first.change_amount : 0
  return previousClose || first.open_price || first.close_price || 0
}

function addVolumeSeries() {
  const volumeSeries = chart.addSeries(HistogramSeries, {
    priceFormat: {type: 'volume'},
    priceLineVisible: false,
    lastValueVisible: false
  }, 1)
  volumeSeries.priceScale().applyOptions({
    scaleMargins: {top: 0.08, bottom: 0.12}
  })
  volumeSeries.setData(props.bars.map(item => ({
    time: chartTime(item),
    value: item.volume || 0,
    color: item.close_price >= item.open_price ? 'rgba(220, 38, 38, 0.55)' : 'rgba(22, 163, 74, 0.55)'
  })))
  const panes = chart.panes?.()
  if (panes?.[1]?.setHeight) {
    panes[1].setHeight(118)
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
    return isTimelineChart.value || props.period !== 'day' ? `${month}/${day} ${hour}:${minute}` : `${month}/${day}`
  }
  if (typeof time === 'string') {
    return formatAxisLabel(time)
  }
  if (time && typeof time === 'object' && 'month' in time && 'day' in time) {
    return `${String(time.month).padStart(2, '0')}/${String(time.day).padStart(2, '0')}`
  }
  return ''
}

function formatAxisLabel(value: string) {
  if (value.length > 10) {
    return `${value.slice(5, 10)} ${value.slice(11, 16)}`
  }
  return value.slice(5).replace('-', '/')
}
</script>

<style scoped>
.chart-shell {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;
}

.trading-chart {
  width: 100%;
  height: clamp(460px, 58vh, 560px);
  min-height: 440px;
}

.chart-axis-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  min-height: 30px;
  padding: 7px 12px 4px;
  border-top: 1px solid #dbe4f0;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.chart-axis-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-axis-label:first-child {
  text-align: left;
}

.chart-axis-label:not(:first-child):not(:last-child) {
  text-align: center;
}

.chart-axis-label:last-child {
  text-align: right;
}

.chart-range-footer {
  min-height: 24px;
  padding: 2px 12px 7px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

@media (max-width: 600px) {
  .trading-chart {
    height: clamp(380px, 58vh, 480px);
    min-height: 360px;
  }

  .chart-axis-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .chart-axis-label:nth-child(2),
  .chart-axis-label:nth-child(4) {
    display: none;
  }
}
</style>
