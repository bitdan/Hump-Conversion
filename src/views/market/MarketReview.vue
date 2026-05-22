<template>
  <div class="market-review">
    <div class="page-header">
      <div>
        <h1>涨停池复盘</h1>
        <p>涨停梯队、板块强度、2进3候选和分歧转一致识别</p>
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
        <v-btn color="primary" :loading="loading" prepend-icon="mdi-refresh" @click="loadReview">
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
    >
      {{ error }}
    </v-alert>

    <div class="summary-grid">
      <v-card v-for="item in summaryCards" :key="item.label" class="summary-card" variant="flat">
        <div class="summary-icon">
          <v-icon :icon="item.icon"/>
        </div>
        <div>
          <div class="summary-value">{{ item.value }}</div>
          <div class="summary-label">{{ item.label }}</div>
        </div>
      </v-card>
    </div>

    <v-tabs v-model="tab" color="primary" density="comfortable" class="tabs">
      <v-tab value="pool" prepend-icon="mdi-format-list-bulleted">涨停池</v-tab>
      <v-tab value="sector" prepend-icon="mdi-chart-box-outline">板块强度</v-tab>
      <v-tab value="candidate" prepend-icon="mdi-filter-star-outline">2进3候选</v-tab>
      <v-tab value="signal" prepend-icon="mdi-swap-horizontal-bold">分歧转一致</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="pool">
        <v-card class="table-card" variant="flat">
          <v-data-table
              :headers="poolHeaders"
              :items="review?.limit_up_pool || []"
              :loading="loading"
              density="compact"
              item-value="code"
              fixed-header
              height="560"
          >
            <template #item.name="{ item }">
              <div class="stock-name">
                <strong>{{ item.name }}</strong>
                <span>{{ item.code }}</span>
              </div>
            </template>
            <template #item.consecutive_boards="{ item }">
              <v-chip size="small" color="red" variant="tonal">{{ item.consecutive_boards }}板</v-chip>
            </template>
            <template #item.board_quality_score="{ item }">
              <score-bar :value="item.board_quality_score"/>
            </template>
            <template #item.first_limit_time="{ item }">
              {{ formatTime(item.first_limit_time) }}
            </template>
            <template #item.last_limit_time="{ item }">
              {{ formatTime(item.last_limit_time) }}
            </template>
            <template #item.seal_amount="{ item }">
              {{ formatMoney(item.seal_amount) }}
            </template>
            <template #item.tags="{ item }">
              <div class="chip-row">
                <v-chip v-for="tag in item.tags" :key="tag" size="x-small" color="orange" variant="tonal">
                  {{ tag }}
                </v-chip>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <v-window-item value="sector">
        <div class="sector-grid">
          <v-card v-for="sector in review?.sector_strength || []" :key="sector.industry" class="sector-card"
                  variant="flat">
            <div class="sector-head">
              <div>
                <h3>{{ sector.industry }}</h3>
                <p>{{ sector.limit_up_count }} 只涨停，{{ sector.advanced_count }} 只连板</p>
              </div>
              <v-chip color="primary" variant="tonal">{{ sector.strength_score.toFixed(1) }}</v-chip>
            </div>
            <v-progress-linear :model-value="Math.min(sector.strength_score, 100)" color="primary" rounded/>
            <div class="sector-stats">
              <span>高度 {{ sector.max_consecutive_boards }}板</span>
              <span>炸板 {{ sector.open_count }}次</span>
              <span>封单 {{ formatMoney(sector.total_seal_amount) }}</span>
            </div>
            <div class="chip-row">
              <v-chip v-for="stock in sector.core_stocks" :key="stock" size="small" variant="outlined">
                {{ stock }}
              </v-chip>
              <v-chip v-for="tag in sector.risk_tags" :key="tag" size="small" color="orange" variant="tonal">
                {{ tag }}
              </v-chip>
            </div>
          </v-card>
        </div>
      </v-window-item>

      <v-window-item value="candidate">
        <v-card class="table-card" variant="flat">
          <v-data-table
              :headers="candidateHeaders"
              :items="review?.candidates_2_to_3 || []"
              :loading="loading"
              density="compact"
              item-value="stock.code"
              fixed-header
              height="560"
          >
            <template #item.stock.name="{ item }">
              <div class="stock-name">
                <strong>{{ item.stock.name }}</strong>
                <span>{{ item.stock.code }}</span>
              </div>
            </template>
            <template #item.level="{ item }">
              <v-chip size="small" :color="levelColor(item.level)" variant="tonal">{{ item.level }}</v-chip>
            </template>
            <template #item.candidate_score="{ item }">
              <score-bar :value="item.candidate_score"/>
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
                <v-chip v-for="risk in item.risks" :key="risk" size="x-small" color="orange" variant="tonal">
                  {{ risk }}
                </v-chip>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <v-window-item value="signal">
        <v-card class="table-card" variant="flat">
          <v-data-table
              :headers="signalHeaders"
              :items="review?.divergence_consensus || []"
              :loading="loading"
              density="compact"
              item-value="code"
              fixed-header
              height="560"
          >
            <template #item.name="{ item }">
              <div class="stock-name">
                <strong>{{ item.name }}</strong>
                <span>{{ item.code }}</span>
              </div>
            </template>
            <template #item.signal_score="{ item }">
              <score-bar :value="item.signal_score"/>
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
                <v-chip v-for="risk in item.risks" :key="risk" size="x-small" color="orange" variant="tonal">
                  {{ risk }}
                </v-chip>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup lang="ts">
import {computed, defineComponent, h, onMounted, ref} from 'vue'
import {getMarketReview, type MarketReviewData} from '@/api/marketReview'

const today = new Date().toISOString().slice(0, 10)
const queryDate = ref(today)
const tab = ref('pool')
const loading = ref(false)
const error = ref('')
const review = ref<MarketReviewData | null>(null)

const ScoreBar = defineComponent({
  name: 'ScoreBar',
  props: {
    value: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    return () => h('div', {class: 'score-bar'}, [
      h('span', {class: 'score-text'}, props.value.toFixed(1)),
      h('div', {class: 'score-track'}, [
        h('div', {
          class: 'score-fill',
          style: {width: `${Math.max(0, Math.min(props.value, 100))}%`}
        })
      ])
    ])
  }
})

const summaryCards = computed(() => {
  const data = review.value
  return [
    {label: '涨停数量', value: data?.limit_up_pool.length || 0, icon: 'mdi-arrow-up-bold-box-outline'},
    {label: '强势板块', value: data?.sector_strength.length || 0, icon: 'mdi-chart-box-outline'},
    {label: '2进3候选', value: data?.candidates_2_to_3.length || 0, icon: 'mdi-filter-star-outline'},
    {label: '分歧转一致', value: data?.divergence_consensus.length || 0, icon: 'mdi-swap-horizontal-bold'}
  ]
})

const poolHeaders = [
  {title: '股票', key: 'name', minWidth: 130},
  {title: '行业', key: 'industry', minWidth: 110},
  {title: '梯队', key: 'consecutive_boards', width: 86},
  {title: '质量分', key: 'board_quality_score', minWidth: 140},
  {title: '首次封板', key: 'first_limit_time', width: 96},
  {title: '最后封板', key: 'last_limit_time', width: 96},
  {title: '炸板', key: 'open_count', width: 74},
  {title: '换手%', key: 'turnover_rate', width: 86},
  {title: '封单', key: 'seal_amount', width: 112},
  {title: '风险', key: 'tags', minWidth: 170}
]

const candidateHeaders = [
  {title: '股票', key: 'stock.name', minWidth: 130},
  {title: '行业', key: 'stock.industry', minWidth: 110},
  {title: '等级', key: 'level', width: 92},
  {title: '候选分', key: 'candidate_score', minWidth: 140},
  {title: '板块分', key: 'sector.strength_score', width: 90},
  {title: '入池理由', key: 'reasons', minWidth: 240},
  {title: '风险', key: 'risks', minWidth: 180}
]

const signalHeaders = [
  {title: '股票', key: 'name', minWidth: 130},
  {title: '行业', key: 'industry', minWidth: 110},
  {title: '阶段', key: 'phase', width: 120},
  {title: '信号分', key: 'signal_score', minWidth: 140},
  {title: '识别依据', key: 'reasons', minWidth: 260},
  {title: '风险', key: 'risks', minWidth: 180}
]

function levelColor(level: string) {
  if (level === '高关注') return 'red'
  if (level === '剔除') return 'grey'
  return 'primary'
}

function formatTime(value?: string) {
  if (!value || value.length < 4) return '-'
  const text = value.padEnd(6, '0')
  return `${text.slice(0, 2)}:${text.slice(2, 4)}:${text.slice(4, 6)}`
}

function formatMoney(value?: number | null) {
  if (!value) return '-'
  if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万`
  return value.toFixed(0)
}

async function loadReview() {
  loading.value = true
  error.value = ''
  try {
    const response = await getMarketReview({date: queryDate.value})
    review.value = response.data
  } catch (err: any) {
    error.value = err?.response?.data?.detail || err?.message || '市场复盘数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadReview)
</script>

<style scoped>
.market-review {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
  color: #0f172a;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.page-header h1 {
  font-size: 28px;
  line-height: 1.2;
  font-weight: 700;
  margin: 0 0 6px;
}

.page-header p {
  margin: 0;
  color: #64748b;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
}

.date-input {
  width: 176px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.summary-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #eef2ff;
  color: #2563eb;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.summary-label {
  margin-top: 5px;
  font-size: 13px;
  color: #64748b;
}

.tabs {
  margin-bottom: 12px;
}

.table-card,
.sector-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.stock-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stock-name span {
  color: #64748b;
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
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
}

.sector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.sector-card {
  padding: 16px;
}

.sector-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.sector-head h3 {
  margin: 0 0 4px;
  font-size: 18px;
}

.sector-head p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}

.sector-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 12px 0;
  color: #475569;
  font-size: 13px;
}

@media (max-width: 900px) {
  .market-review {
    padding: 16px;
  }

  .page-header,
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .date-input {
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
