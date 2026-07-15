<template>
  <div class="market-review">
    <div class="page-header">
      <div>
        <h1>涨停池复盘</h1>
        <p>{{ review?.date || queryDate }} · {{ snapshotLabel }}</p>
      </div>
      <div class="toolbar">
        <v-text-field
            v-model="queryDate"
            type="date"
            density="compact"
            variant="outlined"
            hide-details
            class="date-input"
        />
        <v-btn color="primary" :loading="loading" prepend-icon="mdi-refresh" @click="loadReview(true)">
          刷新
        </v-btn>
      </div>
    </div>

    <v-alert
        v-if="error"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mb-4"
        title="数据暂时不可用"
    >
      {{ error }}
    </v-alert>

    <div class="market-brief">
      <div v-for="item in summaryItems" :key="item.label" class="brief-item">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>

    <v-tabs v-model="tab" color="primary" density="comfortable" class="tabs">
      <v-tab value="pool" prepend-icon="mdi-format-list-bulleted">涨停池</v-tab>
      <v-tab value="sector" prepend-icon="mdi-chart-box-outline">板块</v-tab>
      <v-tab value="watch" prepend-icon="mdi-star-outline">观察池</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="pool">
        <v-card class="table-card" variant="flat">
          <div class="table-toolbar">
            <v-chip-group v-model="poolBoardFilter" selected-class="pool-selected" mandatory>
              <v-chip
                  v-for="filter in poolBoardFilters"
                  :key="filter.value"
                  :value="filter.value"
                  variant="outlined"
                  size="small"
              >
                {{ filter.label }}
              </v-chip>
            </v-chip-group>
            <v-select
                v-model="selectedSector"
                :items="sectorOptions"
                label="行业"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                class="sector-filter"
            />
            <v-text-field
                v-model="searchText"
                label="股票 / 代码"
                prepend-inner-icon="mdi-magnify"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                class="stock-search"
            />
            <span class="result-count">{{ filteredLimitUpPool.length }} 只</span>
          </div>

          <v-data-table
              :headers="poolHeaders"
              :items="filteredLimitUpPool"
              :loading="loading"
              no-data-text="当前筛选下暂无涨停数据"
              density="compact"
              item-value="code"
              fixed-header
              height="620"
          >
            <template #item.name="{ item }">
              <button class="stock-name" type="button" @click="openKline(item.code, item.name)">
                <strong>{{ item.name }}</strong>
                <span>{{ item.code }}</span>
              </button>
            </template>
            <template #item.change_percent="{ item }">
              <span :class="changeClass(item.change_percent)">{{ formatPercent(item.change_percent) }}</span>
            </template>
            <template #item.consecutive_boards="{ item }">
              <v-chip size="small" color="red" variant="tonal">{{ item.consecutive_boards }}板</v-chip>
            </template>
            <template #item.limit_up_stat="{ item }">
              <span class="number-text">{{ formatLimitUpStat(item.limit_up_stat) }}</span>
            </template>
            <template #item.first_limit_time="{ item }">{{ formatTime(item.first_limit_time) }}</template>
            <template #item.last_limit_time="{ item }">{{ formatTime(item.last_limit_time) }}</template>
            <template #item.turnover_rate="{ item }">{{ formatPercent(item.turnover_rate, false) }}</template>
            <template #item.amount="{ item }">{{ formatMoney(item.amount) }}</template>
            <template #item.seal_amount="{ item }">{{ formatMoney(item.seal_amount) }}</template>
            <template #item.action="{ item }">
              <v-btn
                  size="small"
                  variant="text"
                  :icon="isWatched(item.code) ? 'mdi-star' : 'mdi-star-outline'"
                  :color="isWatched(item.code) ? 'amber' : undefined"
                  :title="isWatched(item.code) ? '移出观察池' : '加入观察池'"
                  @click="toggleWatchFromPool(item)"
              />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <v-window-item value="sector">
        <v-card class="table-card" variant="flat">
          <div class="section-toolbar">
            <span>按涨停家数、连板家数、最高板和封单额排序</span>
          </div>
          <v-data-table
              :headers="sectorHeaders"
              :items="review?.sector_strength || []"
              :loading="loading"
              no-data-text="当前日期暂无板块数据"
              density="compact"
              item-value="industry"
              fixed-header
              height="620"
          >
            <template #item.industry="{ item }"><strong>{{ item.industry }}</strong></template>
            <template #item.max_consecutive_boards="{ item }">
              <v-chip size="small" color="red" variant="tonal">{{ item.max_consecutive_boards }}板</v-chip>
            </template>
            <template #item.total_amount="{ item }">{{ formatMoney(item.total_amount) }}</template>
            <template #item.total_seal_amount="{ item }">{{ formatMoney(item.total_seal_amount) }}</template>
            <template #item.core_stocks="{ item }">
              <div class="chip-row">
                <v-chip v-for="stock in item.core_stocks" :key="stock" size="x-small" variant="outlined">
                  {{ stock }}
                </v-chip>
              </div>
            </template>
            <template #item.action="{ item }">
              <v-btn
                  size="small"
                  variant="text"
                  prepend-icon="mdi-filter-outline"
                  @click="showSector(item.industry)"
              >
                看个股
              </v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <v-window-item value="watch">
        <v-card class="table-card" variant="flat">
          <div class="section-toolbar">
            <span>观察 {{ watchedItems.length }} 只</span>
          </div>
          <v-data-table
              :headers="watchHeaders"
              :items="watchRows"
              no-data-text="观察池为空，可从涨停池加入"
              density="compact"
              item-value="code"
              fixed-header
              height="620"
          >
            <template #item.name="{ item }">
              <button class="stock-name" type="button" @click="openKline(item.code, item.name)">
                <strong>{{ item.name }}</strong>
                <span>{{ item.code }}</span>
              </button>
            </template>
            <template #item.result="{ item }">
              <v-chip size="small" :color="watchResultColor(item.result)" variant="tonal">
                {{ item.result }}
              </v-chip>
            </template>
            <template #item.change_percent="{ item }">
              <span :class="changeClass(item.change_percent)">{{ formatPercent(item.change_percent) }}</span>
            </template>
            <template #item.action="{ item }">
              <v-btn
                  size="small"
                  variant="text"
                  icon="mdi-delete-outline"
                  title="移出观察池"
                  @click="removeWatch(item.code)"
              />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <v-dialog v-model="klineDialog" max-width="1280" scrollable>
      <v-card class="dialog-card">
        <div class="dialog-toolbar">
          <div>
            <h2>{{ selectedName || selectedCode }}</h2>
            <p>{{ selectedCode }} · K 线与成交量</p>
          </div>
          <div class="dialog-actions">
            <v-btn variant="text" prepend-icon="mdi-refresh" :loading="klineLoading" @click="reloadKline">
              重抓
            </v-btn>
            <v-btn icon="mdi-close" variant="text" title="关闭" @click="klineDialog = false"/>
          </div>
        </div>
        <StockKlineCard :snapshot="selectedKline" :loading="klineLoading" :error="klineError"/>
        <v-tabs
            v-model="selectedPeriod"
            class="kline-period-tabs"
            align-tabs="start"
            color="primary"
            density="comfortable"
            mandatory
        >
          <v-tab v-for="period in klinePeriods" :key="period.value" :value="period.value">
            {{ period.label }}
          </v-tab>
        </v-tabs>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue'
import {getMarketReview, type LimitUpStock, type MarketReviewData} from '@/api/marketReview/review'
import {getStockKline, type StockKlineSnapshot} from '@/api/marketReview/kline'
import StockKlineCard from '@/views/market/StockKlineCard.vue'

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const WATCH_STORAGE_KEY = 'market-review-watchlist'

const queryDate = ref(today)
const tab = ref('pool')
const loading = ref(false)
const error = ref('')
const review = ref<MarketReviewData | null>(null)
const poolBoardFilter = ref('all')
const selectedSector = ref<string | null>(null)
const searchText = ref('')
const watchedItems = ref<WatchItem[]>([])

const klineDialog = ref(false)
const klineLoading = ref(false)
const klineError = ref('')
const selectedKline = ref<StockKlineSnapshot | null>(null)
const selectedCode = ref('')
const selectedName = ref('')
const selectedPeriod = ref('day')

interface WatchItem {
  code: string
  name: string
  industry: string
  watchDate: string
  source: string
  targetBoards?: number
}

const poolBoardFilters = [
  {label: '全部', value: 'all'},
  {label: '首板', value: '1'},
  {label: '2板', value: '2'},
  {label: '3板+', value: '3plus'}
]

const klinePeriods = [
  {label: '分时', value: '1'},
  {label: '五日K', value: 'five_day'},
  {label: '日K', value: 'day'},
  {label: '周K', value: 'week'},
  {label: '年K', value: 'year'},
  {label: '120分', value: '120'},
  {label: '60分', value: '60'},
  {label: '30分', value: '30'},
  {label: '15分', value: '15'},
  {label: '5分', value: '5'}
]

const snapshotLabel = computed(() => {
  if (!review.value) return '等待加载'
  if (review.value.is_final) return '收盘快照'
  return review.value.snapshot_status === 'intraday' ? '盘中快照' : '历史快照'
})

const summaryItems = computed(() => {
  const pool = review.value?.limit_up_pool || []
  const maxBoards = pool.length ? Math.max(...pool.map(item => item.consecutive_boards)) : 0
  const advancedCount = pool.filter(item => item.consecutive_boards >= 2).length
  const totalAmount = pool.reduce((sum, item) => sum + (item.amount || 0), 0)
  const totalSealAmount = pool.reduce((sum, item) => sum + (item.seal_amount || 0), 0)
  return [
    {label: '涨停', value: `${pool.length}只`},
    {label: '连板', value: `${advancedCount}只`},
    {label: '最高板', value: maxBoards ? `${maxBoards}板` : '-'},
    {label: '板块', value: `${review.value?.sector_strength.length || 0}个`},
    {label: '涨停成交额', value: formatMoney(totalAmount)},
    {label: '封单额', value: formatMoney(totalSealAmount)}
  ]
})

const sectorOptions = computed(() => {
  return (review.value?.sector_strength || []).map(item => item.industry)
})

const filteredLimitUpPool = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  return (review.value?.limit_up_pool || [])
      .filter((item) => {
        if (selectedSector.value && item.industry !== selectedSector.value) return false
        if (poolBoardFilter.value === '1' && item.consecutive_boards !== 1) return false
        if (poolBoardFilter.value === '2' && item.consecutive_boards !== 2) return false
        if (poolBoardFilter.value === '3plus' && item.consecutive_boards < 3) return false
        if (keyword && !item.name.toLowerCase().includes(keyword) && !item.code.includes(keyword)) return false
        return true
      })
      .sort((left, right) => {
        if (right.consecutive_boards !== left.consecutive_boards) {
          return right.consecutive_boards - left.consecutive_boards
        }
        if ((right.seal_amount || 0) !== (left.seal_amount || 0)) {
          return (right.seal_amount || 0) - (left.seal_amount || 0)
        }
        return (right.amount || 0) - (left.amount || 0)
      })
})

const watchRows = computed(() => {
  const poolMap = new Map((review.value?.limit_up_pool || []).map(item => [item.code, item]))
  return watchedItems.value.map((item) => {
    const current = poolMap.get(item.code)
    return {
      ...item,
      result: buildWatchResult(item, current),
      current_boards: current?.consecutive_boards || null,
      change_percent: current?.change_percent ?? null
    }
  })
})

const poolHeaders = [
  {title: '股票', key: 'name', minWidth: 128},
  {title: '行业', key: 'industry', minWidth: 104},
  {title: '涨跌幅', key: 'change_percent', width: 88},
  {title: '梯队', key: 'consecutive_boards', width: 78},
  {title: '涨停统计', key: 'limit_up_stat', width: 94},
  {title: '首次封板', key: 'first_limit_time', width: 94},
  {title: '最后封板', key: 'last_limit_time', width: 94},
  {title: '炸板', key: 'open_count', width: 68},
  {title: '换手率', key: 'turnover_rate', width: 86},
  {title: '成交额', key: 'amount', width: 104},
  {title: '封单额', key: 'seal_amount', width: 104},
  {title: '', key: 'action', width: 56, sortable: false}
]

const sectorHeaders = [
  {title: '板块', key: 'industry', minWidth: 132},
  {title: '涨停', key: 'limit_up_count', width: 76},
  {title: '连板', key: 'advanced_count', width: 76},
  {title: '最高板', key: 'max_consecutive_boards', width: 86},
  {title: '炸板次数', key: 'open_count', width: 90},
  {title: '成交额', key: 'total_amount', width: 112},
  {title: '封单额', key: 'total_seal_amount', width: 112},
  {title: '前排', key: 'core_stocks', minWidth: 220, sortable: false},
  {title: '', key: 'action', width: 92, sortable: false}
]

const watchHeaders = [
  {title: '股票', key: 'name', minWidth: 130},
  {title: '行业', key: 'industry', minWidth: 110},
  {title: '加入日期', key: 'watchDate', width: 112},
  {title: '来源', key: 'source', minWidth: 130},
  {title: '结果', key: 'result', width: 92},
  {title: '当前涨跌', key: 'change_percent', width: 100},
  {title: '', key: 'action', width: 56, sortable: false}
]

function showSector(industry: string) {
  selectedSector.value = industry
  poolBoardFilter.value = 'all'
  tab.value = 'pool'
}

function formatTime(value?: string) {
  if (!value || value.length < 4) return '-'
  const text = value.padEnd(6, '0')
  return `${text.slice(0, 2)}:${text.slice(2, 4)}:${text.slice(4, 6)}`
}

function formatLimitUpStat(value?: string) {
  if (!value) return '-'
  const match = value.match(/^(\d+)\s*\/\s*(\d+)$/)
  return match ? `${match[1]}天${match[2]}板` : value
}

function formatMoney(value?: number | null) {
  if (!value) return '-'
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万`
  return value.toFixed(0)
}

function formatPercent(value?: number | null, showSign = true) {
  if (value == null) return '-'
  return `${showSign && value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

function changeClass(value?: number | null) {
  if (value == null || value === 0) return 'flat-text'
  return value > 0 ? 'up-text' : 'down-text'
}

function isWatched(code: string) {
  return watchedItems.value.some(item => item.code === code)
}

function toggleWatchFromPool(stock: LimitUpStock) {
  if (isWatched(stock.code)) {
    removeWatch(stock.code)
    return
  }
  watchedItems.value = [{
    code: stock.code,
    name: stock.name,
    industry: stock.industry,
    watchDate: queryDate.value,
    source: `${stock.consecutive_boards}板涨停池`,
    targetBoards: stock.consecutive_boards + 1
  }, ...watchedItems.value]
  saveWatchlist()
}

function removeWatch(code: string) {
  watchedItems.value = watchedItems.value.filter(item => item.code !== code)
  saveWatchlist()
}

function buildWatchResult(item: WatchItem, current?: LimitUpStock) {
  if (!current) return queryDate.value <= item.watchDate ? '待跟踪' : '未涨停'
  if (item.targetBoards && current.consecutive_boards >= item.targetBoards) return '晋级'
  return `${current.consecutive_boards}板`
}

function watchResultColor(result: string) {
  if (result === '晋级') return 'red'
  if (result.includes('板')) return 'orange'
  if (result === '未涨停') return 'grey'
  return 'primary'
}

function loadWatchlist() {
  try {
    const raw = localStorage.getItem(WATCH_STORAGE_KEY)
    watchedItems.value = raw ? JSON.parse(raw) : []
  } catch {
    watchedItems.value = []
  }
}

function saveWatchlist() {
  localStorage.setItem(WATCH_STORAGE_KEY, JSON.stringify(watchedItems.value))
}

async function loadReview(refresh = false) {
  loading.value = true
  error.value = ''
  try {
    const response = await getMarketReview({date: queryDate.value, refresh})
    review.value = response.data
  } catch (err: any) {
    error.value = sanitizeMarketError(err?.response?.data?.detail || err?.message || '市场复盘数据加载失败')
  } finally {
    loading.value = false
  }
}

async function loadKline(refresh = false) {
  if (!selectedCode.value) return
  klineLoading.value = true
  klineError.value = ''
  try {
    const response = await getStockKline(selectedCode.value, {
      date: queryDate.value,
      limit: klineLimit.value,
      refresh,
      name: selectedName.value,
      period: selectedPeriod.value
    })
    selectedKline.value = response.data
  } catch (err: any) {
    klineError.value = sanitizeMarketError(err?.response?.data?.detail || err?.message || '个股 K 线加载失败')
  } finally {
    klineLoading.value = false
  }
}

async function openKline(code: string, name: string) {
  selectedCode.value = code
  selectedName.value = name
  selectedKline.value = null
  selectedPeriod.value = 'day'
  klineDialog.value = true
  await loadKline(false)
}

async function reloadKline() {
  await loadKline(true)
}

watch(selectedPeriod, async (next, previous) => {
  if (klineDialog.value && selectedCode.value && next !== previous) await loadKline(false)
})

const klineLimit = computed(() => {
  if (selectedPeriod.value === 'five_day') return 5
  if (selectedPeriod.value === 'day' || selectedPeriod.value === 'week') return 120
  if (selectedPeriod.value === 'year') return 20
  return 64
})

function sanitizeMarketError(message: string) {
  return String(message || '').replace(/AKShare|akshare/g, '行情服务')
}

onMounted(() => {
  loadWatchlist()
  loadReview()
})
</script>

<style scoped>
.market-review {
  max-width: 1500px;
  margin: 0 auto;
  padding: 24px;
  color: var(--color-text);
}

.page-header,
.toolbar,
.table-toolbar,
.section-toolbar,
.dialog-toolbar,
.dialog-actions {
  display: flex;
  align-items: center;
}

.page-header {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page-header h1,
.dialog-toolbar h2 {
  margin: 0;
  letter-spacing: 0;
}

.page-header h1 {
  font-size: 26px;
}

.page-header p,
.dialog-toolbar p {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.toolbar,
.dialog-actions {
  gap: 8px;
}

.date-input {
  width: 172px;
}

.market-brief {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  margin-bottom: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-element);
  background: var(--color-border);
  gap: 1px;
  overflow: hidden;
}

.brief-item {
  min-width: 0;
  padding: 12px 14px;
  background: var(--color-surface);
}

.brief-item span {
  display: block;
  margin-bottom: 3px;
  color: var(--color-text-muted);
  font-size: 12px;
}

.brief-item strong {
  display: block;
  overflow: hidden;
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tabs {
  margin-bottom: 10px;
}

.table-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-element);
  background: var(--color-surface);
  overflow: hidden;
}

.table-toolbar {
  flex-wrap: wrap;
  gap: 10px;
  min-height: 58px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
}

.section-toolbar {
  min-height: 48px;
  padding: 0 14px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 13px;
}

.sector-filter {
  max-width: 180px;
}

.stock-search {
  max-width: 220px;
}

.result-count {
  margin-left: auto;
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
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.stock-name:hover strong {
  color: var(--color-primary);
}

.stock-name span {
  color: var(--color-text-muted);
  font-size: 12px;
}

.number-text {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.up-text {
  color: var(--color-error);
  font-weight: 600;
}

.down-text {
  color: var(--color-success);
  font-weight: 600;
}

.flat-text {
  color: var(--color-text-muted);
}

.dialog-card {
  padding: 18px;
  border-radius: var(--radius-element);
}

.dialog-toolbar {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.kline-period-tabs {
  margin-top: 12px;
}

@media (max-width: 900px) {
  .market-review {
    padding: 16px;
  }

  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar {
    width: 100%;
  }

  .date-input {
    flex: 1;
    width: auto;
  }

  .market-brief {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sector-filter,
  .stock-search {
    max-width: none;
    width: 100%;
  }

  .result-count {
    margin-left: 0;
  }
}
</style>
