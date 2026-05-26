<template>
  <v-card class="kline-card" variant="flat">
    <div class="kline-header">
      <div>
        <div class="kline-title">
          <h2>{{ snapshot?.name || '个股K线' }}</h2>
          <span v-if="snapshot?.code">{{ snapshot.code }}</span>
        </div>
        <p>{{ snapshot?.date || '--' }} · {{ periodLabel }} · 均线 / 成交量</p>
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

      <StockKlineChart :bars="snapshot.bars" :period="snapshot.period"/>

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
      </div>
    </template>

    <div v-else class="kline-placeholder">
      <v-icon icon="mdi-chart-candlestick" size="40"/>
      <span>暂无K线数据</span>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import StockKlineChart from '@/components/market/StockKlineChart.vue'
import type {StockKlineSnapshot, StockKlineSummary} from '@/api/marketReview'

const props = defineProps<{
  snapshot: StockKlineSnapshot | null
  loading?: boolean
  error?: string
}>()

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
  return labels[period] || `${period}分钟`
})

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

function formatObservedAt(value: string) {
  if (!value) return '--'
  if (value.length > 10) return value.slice(11, 16)
  return value
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

.legend-chip.ma5,
.legend-chip.average-line {
  color: #f59e0b;
}

.legend-chip.price-line,
.legend-chip.ma20 {
  color: #2563eb;
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

.legend-chip.ma60 {
  color: #111827;
}

.legend-chip.volume {
  color: #64748b;
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
}
</style>
