<template>
  <div>
    <v-alert
        v-if="radarError"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mb-4"
        title="市场雷达暂时不可用"
    >
      {{ radarError }}
    </v-alert>

    <v-card class="radar-card" variant="flat">
      <div class="section-header radar-header">
        <div>
          <h2>市场雷达</h2>
          <p>先看市场环境和板块热度，再从强板块里筛候选股。</p>
        </div>
        <v-chip color="primary" variant="tonal" size="small">
          {{ radar?.date || queryDate }}
        </v-chip>
      </div>

      <div class="brief-card radar-brief">
        <div v-for="item in radarBrief" :key="item.label" class="brief-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>

      <div v-if="radarLoading" class="empty-state radar-loading">
        <v-progress-circular indeterminate color="primary"/>
        <span>正在生成市场雷达...</span>
      </div>

      <template v-else>
        <div class="radar-layout">
          <section class="radar-sector-panel">
            <div class="section-header compact">
              <h2>板块热度</h2>
            </div>
            <div class="radar-sector-list">
              <button
                  v-for="sector in radarSectors"
                  :key="sector.sector_name"
                  class="radar-sector-item"
                  :class="{active: selectedSector === sector.sector_name}"
                  type="button"
                  @click="$emit('select-sector', sector)"
              >
                <div class="sector-rank-row">
                  <strong>{{ sector.sector_name }}</strong>
                  <span>{{ sector.heat_score.toFixed(1) }}</span>
                </div>
                <v-progress-linear :model-value="Math.min(sector.heat_score, 100)" color="primary" rounded/>
                <div class="sector-meta-row">
                  <span>{{ formatPercent(sector.change_percent) }}</span>
                  <span>{{ sector.rise_count }}/{{ sector.stock_count }} 上涨</span>
                  <span>{{ formatMoney(sector.total_amount) }}</span>
                </div>
                <div class="chip-row">
                  <v-chip
                      v-for="stock in sector.core_stocks"
                      :key="stock"
                      size="x-small"
                      variant="outlined"
                  >
                    {{ stock }}
                  </v-chip>
                  <v-chip
                      v-for="reason in sector.reasons"
                      :key="reason"
                      size="x-small"
                      color="green"
                      variant="tonal"
                  >
                    {{ reason }}
                  </v-chip>
                </div>
              </button>
            </div>
          </section>

          <section class="radar-candidate-panel">
            <div class="table-toolbar">
              <span class="watch-count">候选 {{ selectedRadarCandidates.length }} 只</span>
              <v-chip
                  v-if="selectedSector"
                  color="primary"
                  variant="tonal"
                  size="small"
                  closable
                  @click:close="$emit('clear-sector')"
              >
                板块：{{ selectedSector }}
              </v-chip>
            </div>
            <v-data-table
                :headers="radarCandidateHeaders"
                :items="selectedRadarCandidates"
                :loading="radarLoading"
                no-data-text="当前雷达暂无候选股"
                density="compact"
                item-value="code"
                fixed-header
                height="560"
            >
              <template #item.name="{ item }">
                <button class="stock-name stock-button" type="button" @click="$emit('open-kline', item.code, item.name)">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.code }}</span>
                </button>
              </template>
              <template #item.candidate_score="{ item }">
                <score-bar :value="item.candidate_score"/>
              </template>
              <template #item.sector_heat_score="{ item }">
                {{ item.sector_heat_score.toFixed(1) }}
              </template>
              <template #item.change_percent="{ item }">
                <span :class="changeClass(item.change_percent)">{{ formatPercent(item.change_percent) }}</span>
              </template>
              <template #item.turnover_rate="{ item }">
                {{ item.turnover_rate == null ? '-' : `${item.turnover_rate.toFixed(2)}%` }}
              </template>
              <template #item.amount="{ item }">
                {{ formatMoney(item.amount) }}
              </template>
              <template #item.reasons="{ item }">
                <div class="chip-row">
                  <v-chip v-for="reason in item.reasons" :key="reason" size="x-small" color="green" variant="tonal">
                    {{ reason }}
                  </v-chip>
                </div>
              </template>
              <template #item.risks="{ item }">
                <div class="chip-row">
                  <v-chip v-for="tag in item.tags" :key="tag" size="x-small" color="primary" variant="tonal">
                    {{ tag }}
                  </v-chip>
                  <v-chip v-for="risk in item.risks" :key="risk" size="x-small" color="orange" variant="tonal">
                    {{ risk }}
                  </v-chip>
                </div>
              </template>
              <template #item.action="{ item }">
                <v-btn
                    size="small"
                    variant="text"
                    :icon="isWatched(item.code) ? 'mdi-star' : 'mdi-star-outline'"
                    :color="isWatched(item.code) ? 'amber' : undefined"
                    @click="$emit('watch-radar', item)"
                />
              </template>
            </v-data-table>

            <div v-if="selectedSector" class="sector-stock-radar">
              <div class="table-toolbar sector-stock-toolbar">
                <span class="watch-count">
                  {{ selectedSector }} 全部股票 {{ filteredSectorStocks.length }} / {{ sectorStocks.length }} 只
                </span>
                <v-chip-group v-model="sectorStockFilter" selected-class="pool-selected" mandatory>
                  <v-chip
                      v-for="filter in sectorStockFilters"
                      :key="filter.value"
                      :value="filter.value"
                      variant="outlined"
                      size="small"
                  >
                    {{ filter.label }}
                  </v-chip>
                </v-chip-group>
                <v-btn
                    size="small"
                    variant="text"
                    prepend-icon="mdi-refresh"
                    :loading="sectorStockLoading"
                    @click="$emit('refresh-sector-stocks', selectedSector, true)"
                >
                  刷新成分
                </v-btn>
              </div>
              <v-alert
                  v-if="sectorStockError"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mx-3 mt-2"
              >
                {{ sectorStockError }}
              </v-alert>
              <v-data-table
                  :headers="radarSectorStockHeaders"
                  :items="filteredSectorStocks"
                  :loading="sectorStockLoading"
                  no-data-text="当前板块暂无成分股数据"
                  density="compact"
                  item-value="code"
                  fixed-header
                  height="420"
              >
                <template #item.name="{ item }">
                  <button class="stock-name stock-button" type="button" @click="$emit('open-kline', item.code, item.name)">
                    <strong>{{ item.name }}</strong>
                    <span>{{ item.code }}</span>
                  </button>
                </template>
                <template #item.stock_score="{ item }">
                  <score-bar :value="item.stock_score"/>
                </template>
                <template #item.trend_score="{ item }">
                  <score-bar :value="item.trend_score"/>
                </template>
                <template #item.relative_strength_score="{ item }">
                  {{ item.relative_strength_score.toFixed(1) }}
                </template>
                <template #item.ma_state="{ item }">
                  <v-chip size="x-small" :color="item.ma_state === '多头' ? 'green' : 'primary'" variant="tonal">
                    {{ item.ma_state || '-' }}
                  </v-chip>
                </template>
                <template #item.change_percent="{ item }">
                  <span :class="changeClass(item.change_percent)">{{ formatPercent(item.change_percent) }}</span>
                </template>
                <template #item.return_5d="{ item }">
                  <span :class="changeClass(item.return_5d)">{{ formatPercent(item.return_5d) }}</span>
                </template>
                <template #item.return_20d="{ item }">
                  <span :class="changeClass(item.return_20d)">{{ formatPercent(item.return_20d) }}</span>
                </template>
                <template #item.volume_ratio_5d="{ item }">
                  {{ formatRatio(item.volume_ratio_5d) }}
                </template>
                <template #item.turnover_rate="{ item }">
                  {{ item.turnover_rate == null ? '-' : `${item.turnover_rate.toFixed(2)}%` }}
                </template>
                <template #item.amount="{ item }">
                  {{ formatMoney(item.amount) }}
                </template>
                <template #item.reasons="{ item }">
                  <div class="chip-row">
                    <v-chip
                        v-for="tag in item.trend_tags"
                        :key="tag"
                        size="x-small"
                        color="green"
                        variant="tonal"
                    >
                      {{ tag }}
                    </v-chip>
                    <v-chip
                        v-for="reason in item.reasons"
                        :key="reason"
                        size="x-small"
                        color="green"
                        variant="tonal"
                    >
                      {{ reason }}
                    </v-chip>
                  </div>
                </template>
                <template #item.risks="{ item }">
                  <div class="chip-row">
                    <v-chip v-for="tag in item.tags" :key="tag" size="x-small" color="primary" variant="tonal">
                      {{ tag }}
                    </v-chip>
                    <v-chip v-for="risk in item.risks" :key="risk" size="x-small" color="orange" variant="tonal">
                      {{ risk }}
                    </v-chip>
                  </div>
                </template>
                <template #item.action="{ item }">
                  <v-btn
                      size="small"
                      variant="text"
                      :icon="isWatched(item.code) ? 'mdi-star' : 'mdi-star-outline'"
                      :color="isWatched(item.code) ? 'amber' : undefined"
                      @click="$emit('watch-sector-stock', item)"
                  />
                </template>
              </v-data-table>
            </div>
          </section>
        </div>
      </template>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import {computed, defineComponent, h, ref, watch} from 'vue'
import type {
  MarketRadarCandidate,
  MarketRadarData,
  MarketRadarSector,
  MarketRadarSectorStock
} from '@/api/marketReview/radar'

const props = defineProps<{
  radar: MarketRadarData | null
  queryDate: string
  radarLoading: boolean
  radarError: string
  selectedSector: string
  sectorStocks: MarketRadarSectorStock[]
  sectorStockLoading: boolean
  sectorStockError: string
  watchedCodes: string[]
}>()

defineEmits<{
  (event: 'select-sector', sector: MarketRadarSector): void
  (event: 'clear-sector'): void
  (event: 'refresh-sector-stocks', sectorName: string, refresh: boolean): void
  (event: 'open-kline', code: string, name: string): void
  (event: 'watch-radar', candidate: MarketRadarCandidate): void
  (event: 'watch-sector-stock', stock: MarketRadarSectorStock): void
}>()

const sectorStockFilter = ref('all')

watch(
    () => props.selectedSector,
    (sector) => {
      if (!sector) {
        sectorStockFilter.value = 'all'
      }
    }
)

const ScoreBar = defineComponent({
  name: 'ScoreBar',
  props: {
    value: {
      type: Number,
      default: 0
    }
  },
  setup(scoreProps) {
    return () => h('div', {class: 'score-bar'}, [
      h('span', {class: 'score-text'}, scoreProps.value.toFixed(1)),
      h('div', {class: 'score-track'}, [
        h('div', {
          class: 'score-fill',
          style: {width: `${Math.max(0, Math.min(scoreProps.value, 100))}%`}
        })
      ])
    ])
  }
})

const radarBrief = computed(() => {
  const data = props.radar
  const environment = data?.market_environment
  const leadingSectors = data?.sectors.slice(0, 3).map(item => item.sector_name).join(' / ') || '-'
  return [
    {label: '市场温度', value: environment ? environment.environment_score.toFixed(1) : '-'},
    {label: '上涨家数', value: environment ? environment.rise_count : '-'},
    {label: '下跌家数', value: environment ? environment.fall_count : '-'},
    {label: '成交额', value: environment ? formatMoney(environment.total_amount) : '-'},
    {label: '雷达主线', value: leadingSectors}
  ]
})

const selectedRadarCandidates = computed(() => {
  const candidates = props.radar?.candidates || []
  if (!props.selectedSector) return candidates
  return candidates.filter(item => item.industry === props.selectedSector)
})

const radarSectors = computed(() => props.radar?.sectors || [])

const filteredSectorStocks = computed(() => {
  return props.sectorStocks.filter((item) => {
    if (sectorStockFilter.value === 'strong') {
      return item.trend_score >= 70 || item.trend_tags.includes('均线多头')
    }
    if (sectorStockFilter.value === 'volume') {
      return item.volume_ratio_5d != null && item.volume_ratio_5d >= 1.2
    }
    if (sectorStockFilter.value === 'relative') {
      return item.relative_strength_score >= 70 || item.trend_tags.includes('跑赢板块')
    }
    if (sectorStockFilter.value === 'risk') {
      return item.risks.length > 0
    }
    return true
  })
})

const sectorStockFilters = [
  {label: '全部', value: 'all'},
  {label: '强趋势', value: 'strong'},
  {label: '放量', value: 'volume'},
  {label: '跑赢板块', value: 'relative'},
  {label: '风险', value: 'risk'}
]

const radarCandidateHeaders = [
  {title: '股票', key: 'name', minWidth: 130},
  {title: '板块', key: 'industry', minWidth: 110},
  {title: '候选分', key: 'candidate_score', minWidth: 140},
  {title: '板块热度', key: 'sector_heat_score', width: 104},
  {title: '涨跌幅', key: 'change_percent', width: 90},
  {title: '换手%', key: 'turnover_rate', width: 86},
  {title: '成交额', key: 'amount', width: 112},
  {title: '理由', key: 'reasons', minWidth: 220},
  {title: '风险/标签', key: 'risks', minWidth: 200},
  {title: '观察', key: 'action', width: 76, sortable: false}
]

const radarSectorStockHeaders = [
  {title: '股票', key: 'name', minWidth: 130},
  {title: '个股分', key: 'stock_score', minWidth: 140},
  {title: '趋势分', key: 'trend_score', minWidth: 120},
  {title: '相对强度', key: 'relative_strength_score', width: 104},
  {title: 'MA状态', key: 'ma_state', width: 96},
  {title: '涨跌幅', key: 'change_percent', width: 90},
  {title: '5日', key: 'return_5d', width: 80},
  {title: '20日', key: 'return_20d', width: 80},
  {title: '量比', key: 'volume_ratio_5d', width: 80},
  {title: '换手%', key: 'turnover_rate', width: 86},
  {title: '成交额', key: 'amount', width: 112},
  {title: '理由', key: 'reasons', minWidth: 220},
  {title: '风险/标签', key: 'risks', minWidth: 200},
  {title: '观察', key: 'action', width: 76, sortable: false}
]

function isWatched(code: string) {
  return props.watchedCodes.includes(code)
}

function formatMoney(value?: number | null) {
  if (!value) return '-'
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万`
  return value.toFixed(0)
}

function formatPercent(value?: number | null) {
  if (value == null) return '-'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatRatio(value?: number | null) {
  if (value == null) return '-'
  return `${value.toFixed(2)}x`
}

function changeClass(value?: number | null) {
  if (value == null || value === 0) return 'flat-text'
  return value > 0 ? 'up-text' : 'down-text'
}
</script>

<style scoped>
.radar-card {
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.radar-header {
  margin-bottom: 14px;
}

.radar-header p,
.section-header.compact h2 {
  margin: 0;
}

.brief-card {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  margin-bottom: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-border);
  overflow: hidden;
}

.brief-item {
  min-width: 0;
  padding: 10px 12px;
  background: var(--color-surface);
}

.brief-item span {
  display: block;
  margin-bottom: 4px;
  color: var(--color-text-muted);
  font-size: 12px;
}

.brief-item strong {
  display: block;
  overflow: hidden;
  color: var(--color-text);
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.radar-brief {
  margin-bottom: 16px;
}

.radar-loading {
  min-height: 240px;
}

.radar-layout {
  display: grid;
  grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.radar-sector-panel,
.radar-candidate-panel {
  min-width: 0;
}

.radar-sector-list {
  display: grid;
  gap: 10px;
  max-height: 640px;
  overflow: auto;
  padding-right: 4px;
}

.radar-sector-item {
  width: 100%;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-element);
  background: var(--color-surface);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.radar-sector-item:hover,
.radar-sector-item.active {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card);
}

.sector-rank-row,
.sector-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sector-rank-row {
  margin-bottom: 8px;
}

.sector-rank-row span {
  color: var(--color-primary);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.sector-meta-row {
  margin: 8px 0;
  color: var(--color-text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.sector-stock-radar {
  margin-top: 16px;
  border-top: 1px solid var(--color-border);
}

.sector-stock-toolbar {
  justify-content: space-between;
}

.table-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px 12px 0;
}

.watch-count {
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
}

.pool-selected {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
  background: var(--color-primary-light);
}

.stock-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stock-button {
  width: 100%;
  border: 0;
  padding: 0;
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.stock-button strong {
  color: var(--color-text);
}

.stock-button:hover strong {
  color: var(--color-primary);
}

.stock-name span {
  color: var(--color-text-muted);
  font-size: 12px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.score-bar {
  display: grid;
  grid-template-columns: 42px 1fr;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.score-text {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.score-track {
  height: 7px;
  border-radius: var(--radius-pill);
  background: var(--color-border);
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}

.up-text {
  color: var(--color-error);
}

.down-text {
  color: var(--color-success);
}

.flat-text {
  color: var(--color-text-muted);
}

@media (max-width: 900px) {
  .brief-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .radar-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .radar-sector-list {
    max-height: none;
  }
}
</style>
