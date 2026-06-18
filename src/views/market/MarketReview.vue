<template>
  <div class="market-review">
    <div class="page-header">
      <div>
        <h1>涨停池复盘</h1>
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

    <v-card class="brief-card" variant="flat">
      <div v-for="item in reviewBrief" :key="item.label" class="brief-item">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </v-card>

    <v-tabs v-model="tab" color="primary" density="comfortable" class="tabs">
      <v-tab value="radar" prepend-icon="mdi-radar">市场雷达</v-tab>
      <v-tab value="pool" prepend-icon="mdi-format-list-bulleted">涨停池</v-tab>
      <v-tab value="sector" prepend-icon="mdi-chart-box-outline">板块强度</v-tab>
      <v-tab value="candidate" prepend-icon="mdi-filter-star-outline">连板候选</v-tab>
      <v-tab value="signal" prepend-icon="mdi-swap-horizontal-bold">分歧转一致</v-tab>
      <v-tab value="watch" prepend-icon="mdi-star-outline">观察池</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="radar">
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
                      :class="{active: selectedRadarSector === sector.sector_name}"
                      type="button"
                      @click="toggleRadarSector(sector)"
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
                  <span class="watch-count">
                    候选 {{ selectedRadarCandidates.length }} 只
                  </span>
                  <v-chip
                      v-if="selectedRadarSector"
                      color="primary"
                      variant="tonal"
                      size="small"
                      closable
                      @click:close="clearRadarSector"
                  >
                    板块：{{ selectedRadarSector }}
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
                    <button class="stock-name stock-button" type="button" @click="openKline(item.code, item.name)">
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
                        @click="toggleWatchFromRadar(item)"
                    />
                  </template>
                </v-data-table>

                <div v-if="selectedRadarSector" class="sector-stock-radar">
                  <div class="table-toolbar sector-stock-toolbar">
                    <span class="watch-count">
                      {{ selectedRadarSector }} 全部股票 {{ sectorStocks.length }} 只
                    </span>
                    <v-btn
                        size="small"
                        variant="text"
                        prepend-icon="mdi-refresh"
                        :loading="sectorStockLoading"
                        @click="loadRadarSectorStocks(selectedRadarSector, true)"
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
                      :items="sectorStocks"
                      :loading="sectorStockLoading"
                      no-data-text="当前板块暂无成分股数据"
                      density="compact"
                      item-value="code"
                      fixed-header
                      height="420"
                  >
                    <template #item.name="{ item }">
                      <button class="stock-name stock-button" type="button" @click="openKline(item.code, item.name)">
                        <strong>{{ item.name }}</strong>
                        <span>{{ item.code }}</span>
                      </button>
                    </template>
                    <template #item.stock_score="{ item }">
                      <score-bar :value="item.stock_score"/>
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
                          @click="toggleWatchFromSectorStock(item)"
                      />
                    </template>
                  </v-data-table>
                </div>
              </section>
            </div>
          </template>
        </v-card>
      </v-window-item>

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
            <v-chip-group v-model="poolQualityFilter" selected-class="pool-selected" mandatory>
              <v-chip value="all" variant="outlined" size="small">全部质量</v-chip>
              <v-chip value="quality" variant="outlined" size="small">高质量</v-chip>
              <v-chip value="risk" variant="outlined" size="small">高风险</v-chip>
            </v-chip-group>
            <v-chip
                v-if="selectedSector"
                color="primary"
                variant="tonal"
                size="small"
                closable
                @click:close="selectedSector = ''"
            >
              板块：{{ selectedSector }}
            </v-chip>
          </div>
          <v-data-table
              :headers="poolHeaders"
              :items="filteredLimitUpPool"
              :loading="loading"
              no-data-text="当前日期暂无涨停池数据"
              density="compact"
              item-value="code"
              fixed-header
              height="560"
          >
            <template #item.name="{ item }">
              <button class="stock-name stock-button" type="button" @click="openKline(item.code, item.name)">
                <strong>{{ item.name }}</strong>
                <span>{{ item.code }}</span>
              </button>
            </template>
            <template #item.consecutive_boards="{ item }">
              <v-chip size="small" color="red" variant="tonal">{{ item.consecutive_boards }}板</v-chip>
            </template>
            <template #item.limit_up_stat="{ item }">
              <span class="stat-text">{{ formatLimitUpStat(item.limit_up_stat) }}</span>
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
            <template #item.action="{ item }">
              <v-btn
                  size="small"
                  variant="text"
                  :icon="isWatched(item.code) ? 'mdi-star' : 'mdi-star-outline'"
                  :color="isWatched(item.code) ? 'amber' : undefined"
                  @click="toggleWatchFromPool(item)"
              />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <v-window-item value="sector">
        <div class="sector-grid">
          <v-card v-for="sector in review?.sector_strength || []" :key="sector.industry" class="sector-card"
                  :class="{active: selectedSector === sector.industry}"
                  variant="flat"
                  role="button"
                  tabindex="0"
                  @click="toggleSector(sector.industry)"
                  @keydown.enter.prevent="toggleSector(sector.industry)">
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
            <div v-if="selectedSector === sector.industry" class="sector-stock-panel" @click.stop>
              <div class="sector-stock-head">
                <div>
                  <h4>{{ sector.industry }}个股</h4>
                  <p>按梯队和质量分查看板块内涨停标的。</p>
                </div>
                <v-btn
                    size="small"
                    variant="text"
                    prepend-icon="mdi-close"
                    @click="selectedSector = ''"
                >
                  收起
                </v-btn>
              </div>
              <v-data-table
                  :headers="sectorStockHeaders"
                  :items="selectedSectorStocks"
                  density="compact"
                  item-value="code"
                  no-data-text="当前板块暂无个股数据"
                  fixed-header
                  height="360"
              >
                <template #item.name="{ item }">
                  <button class="stock-name stock-button" type="button" @click="openKline(item.code, item.name)">
                    <strong>{{ item.name }}</strong>
                    <span>{{ item.code }}</span>
                  </button>
                </template>
                <template #item.consecutive_boards="{ item }">
                  <v-chip size="small" color="red" variant="tonal">{{ item.consecutive_boards }}板</v-chip>
                </template>
                <template #item.limit_up_stat="{ item }">
                  <span class="stat-text">{{ formatLimitUpStat(item.limit_up_stat) }}</span>
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
                <template #item.change_percent="{ item }">
                  <span :class="changeClass(item.change_percent)">{{ formatPercent(item.change_percent) }}</span>
                </template>
                <template #item.tags="{ item }">
                  <div class="chip-row">
                    <v-chip v-for="tag in item.tags" :key="tag" size="x-small" color="orange" variant="tonal">
                      {{ tag }}
                    </v-chip>
                  </div>
                </template>
                <template #item.action="{ item }">
                  <v-btn
                      size="small"
                      variant="text"
                      :icon="isWatched(item.code) ? 'mdi-star' : 'mdi-star-outline'"
                      :color="isWatched(item.code) ? 'amber' : undefined"
                      @click="toggleWatchFromPool(item)"
                  />
                </template>
              </v-data-table>
            </div>
          </v-card>
        </div>
      </v-window-item>

      <v-window-item value="candidate">
        <v-card class="table-card" variant="flat">
          <div class="candidate-toolbar">
            <v-chip-group v-model="selectedPoolType" selected-class="pool-selected" mandatory>
              <v-chip
                  v-for="pool in candidatePoolTypes"
                  :key="pool.value"
                  :value="pool.value"
                  variant="outlined"
              >
                {{ pool.label }} · {{ pool.count }}
              </v-chip>
            </v-chip-group>
            <v-chip
                v-if="selectedSector"
                color="primary"
                variant="tonal"
                size="small"
                closable
                @click:close="selectedSector = ''"
            >
              板块：{{ selectedSector }}
            </v-chip>
          </div>
          <v-data-table
              :headers="candidateHeaders"
              :items="filteredCandidates"
              :loading="loading"
              no-data-text="当前筛选下暂无连板候选"
              density="compact"
              item-value="stock.code"
              fixed-header
              height="560"
          >
            <template #item.stock.name="{ item }">
              <button class="stock-name stock-button" type="button" @click="openKline(item.stock.code, item.stock.name)">
                <strong>{{ item.stock.name }}</strong>
                <span>{{ item.stock.code }}</span>
              </button>
            </template>
            <template #item.stock.limit_up_stat="{ item }">
              <span class="stat-text">{{ formatLimitUpStat(item.stock.limit_up_stat) }}</span>
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
            <template #item.action="{ item }">
              <v-btn
                  size="small"
                  variant="text"
                  :icon="isWatched(item.stock.code) ? 'mdi-star' : 'mdi-star-outline'"
                  :color="isWatched(item.stock.code) ? 'amber' : undefined"
                  @click="toggleWatchFromCandidate(item)"
              />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <v-window-item value="signal">
        <v-card class="table-card" variant="flat">
          <v-data-table
              :headers="signalHeaders"
              :items="filteredSignals"
              :loading="loading"
              no-data-text="当前筛选下暂无分歧转一致信号"
              density="compact"
              item-value="code"
              fixed-header
              height="560"
          >
            <template #item.name="{ item }">
              <button class="stock-name stock-button" type="button" @click="openKline(item.code, item.name)">
                <strong>{{ item.name }}</strong>
                <span>{{ item.code }}</span>
              </button>
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
            <template #item.action="{ item }">
              <v-btn
                  size="small"
                  variant="text"
                  :icon="isWatched(item.code) ? 'mdi-star' : 'mdi-star-outline'"
                  :color="isWatched(item.code) ? 'amber' : undefined"
                  @click="toggleWatchFromSignal(item)"
              />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <v-window-item value="watch">
        <v-card class="table-card" variant="flat">
          <div class="table-toolbar">
            <span class="watch-count">观察 {{ watchedItems.length }} 只</span>
          </div>
          <v-data-table
              :headers="watchHeaders"
              :items="watchRows"
              no-data-text="观察池为空，可从涨停池或候选列表加入"
              density="compact"
              item-value="code"
              fixed-header
              height="560"
          >
            <template #item.name="{ item }">
              <button class="stock-name stock-button" type="button" @click="openKline(item.code, item.name)">
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
              <v-btn size="small" variant="text" icon="mdi-delete-outline" @click="removeWatch(item.code)"/>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <v-dialog v-model="klineDialog" max-width="1280" scrollable>
      <v-card class="dialog-card">
        <div class="dialog-toolbar">
          <div>
            <h2>个股K线</h2>
            <p>从复盘候选直接查看趋势、量能、MACD 和分时弱转强/回封信号。</p>
          </div>
          <div class="dialog-actions">
            <v-btn
                variant="text"
                prepend-icon="mdi-refresh"
                :loading="klineLoading"
                @click="reloadKline"
            >
              重抓
            </v-btn>
            <v-btn icon="mdi-close" variant="text" @click="klineDialog = false"/>
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
            selected-class="kline-period-tab-selected"
            slider-color="primary"
        >
          <v-tab
              v-for="period in klinePeriods"
              :key="period.value"
              :value="period.value"
              class="kline-period-tab"
          >
            {{ period.label }}
          </v-tab>
        </v-tabs>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import {computed, defineComponent, h, onMounted, ref, watch} from 'vue'
import StockKlineCard from '@/views/market/StockKlineCard.vue'
import {
  type CandidateStock,
  type DivergenceConsensusSignal,
  getMarketRadar,
  getMarketRadarSectorStocks,
  getMarketReview,
  getStockKline,
  type LimitUpStock,
  type MarketRadarCandidate,
  type MarketRadarData,
  type MarketRadarSector,
  type MarketRadarSectorStock,
  type MarketReviewData,
  type StockKlineSnapshot
} from '@/api/marketReview'

const today = new Date().toISOString().slice(0, 10)
const WATCH_STORAGE_KEY = 'market-review-watchlist'
const queryDate = ref(today)
const tab = ref('radar')
const loading = ref(false)
const radarLoading = ref(false)
const sectorStockLoading = ref(false)
const error = ref('')
const radarError = ref('')
const sectorStockError = ref('')
const review = ref<MarketReviewData | null>(null)
const radar = ref<MarketRadarData | null>(null)
const sectorStocks = ref<MarketRadarSectorStock[]>([])
const klineDialog = ref(false)
const klineLoading = ref(false)
const klineError = ref('')
const selectedKline = ref<StockKlineSnapshot | null>(null)
const selectedCode = ref('')
const selectedName = ref('')
const selectedPeriod = ref('day')
const selectedSector = ref('')
const selectedRadarSector = ref('')
const poolBoardFilter = ref('all')
const poolQualityFilter = ref('all')
const watchedItems = ref<WatchItem[]>([])

interface WatchItem {
  code: string
  name: string
  industry: string
  watchDate: string
  source: string
  targetBoards?: number
}

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

const poolBoardFilters = [
  {label: '全部梯队', value: 'all'},
  {label: '首板', value: '1'},
  {label: '2板', value: '2'},
  {label: '3板+', value: '3plus'}
]

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
    {label: '连板候选', value: data?.advancement_candidates.length || 0, icon: 'mdi-filter-star-outline'},
    {label: '分歧转一致', value: data?.divergence_consensus.length || 0, icon: 'mdi-swap-horizontal-bold'}
  ]
})

const reviewBrief = computed(() => {
  const data = review.value
  const pool = data?.limit_up_pool || []
  const sectors = data?.sector_strength || []
  const maxBoard = pool.length ? Math.max(...pool.map(item => item.consecutive_boards)) : 0
  const leaderSectors = sectors.slice(0, 3).map(item => item.industry).join(' / ') || '-'
  const openCount = pool.reduce((sum, item) => sum + (item.open_count || 0), 0)
  const advancedCount = pool.filter(item => item.consecutive_boards >= 2).length
  const riskCount = pool.filter(item => (item.open_count || 0) >= 3 || item.tags.length > 0).length
  return [
    {label: '最高板', value: maxBoard ? `${maxBoard}板` : '-'},
    {label: '主线板块', value: leaderSectors},
    {label: '连板占比', value: pool.length ? `${((advancedCount / pool.length) * 100).toFixed(1)}%` : '-'},
    {label: '炸板次数', value: openCount},
    {label: '风险标的', value: riskCount}
  ]
})

const radarBrief = computed(() => {
  const data = radar.value
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
  const candidates = radar.value?.candidates || []
  if (!selectedRadarSector.value) return candidates
  return candidates.filter(item => item.industry === selectedRadarSector.value)
})

const radarSectors = computed(() => radar.value?.sectors || [])

const candidatePoolTypes = computed(() => {
  const counts = new Map<string, number>()
  for (const item of review.value?.advancement_candidates || []) {
    counts.set(item.pool_type, (counts.get(item.pool_type) || 0) + 1)
  }
  return [...counts.entries()]
      .sort(([left], [right]) => Number(left.split('_')[0]) - Number(right.split('_')[0]))
      .map(([value, count]) => ({
        value,
        count,
        label: value.replace('_to_', '进')
      }))
})

const selectedPoolType = ref('2_to_3')

watch(candidatePoolTypes, (poolTypes) => {
  if (poolTypes.length > 0 && !poolTypes.some(item => item.value === selectedPoolType.value)) {
    selectedPoolType.value = poolTypes[0].value
  }
})

const filteredLimitUpPool = computed(() => {
  return (review.value?.limit_up_pool || []).filter((item) => {
    if (selectedSector.value && item.industry !== selectedSector.value) {
      return false
    }
    if (poolBoardFilter.value === '1' && item.consecutive_boards !== 1) {
      return false
    }
    if (poolBoardFilter.value === '2' && item.consecutive_boards !== 2) {
      return false
    }
    if (poolBoardFilter.value === '3plus' && item.consecutive_boards < 3) {
      return false
    }
    if (poolQualityFilter.value === 'quality') {
      return item.board_quality_score >= 75 && (item.open_count || 0) <= 1
    }
    if (poolQualityFilter.value === 'risk') {
      return item.board_quality_score < 60 || (item.open_count || 0) >= 3 || item.tags.length > 0
    }
    return true
  })
})

const selectedSectorStocks = computed(() => {
  if (!selectedSector.value) return []
  return (review.value?.limit_up_pool || [])
      .filter(item => item.industry === selectedSector.value)
      .sort((left, right) => {
        if (right.consecutive_boards !== left.consecutive_boards) {
          return right.consecutive_boards - left.consecutive_boards
        }
        return right.board_quality_score - left.board_quality_score
      })
})

const filteredCandidates = computed(() => {
  const candidates = review.value?.advancement_candidates || []
  return candidates.filter(item => {
    if (item.pool_type !== selectedPoolType.value) {
      return false
    }
    return !selectedSector.value || item.stock.industry === selectedSector.value
  })
})

const filteredSignals = computed(() => {
  const signals = review.value?.divergence_consensus || []
  if (!selectedSector.value) {
    return signals
  }
  return signals.filter(item => item.industry === selectedSector.value)
})

const watchRows = computed(() => {
  const poolMap = new Map((review.value?.limit_up_pool || []).map(item => [item.code, item]))
  return watchedItems.value.map((item) => {
    const current = poolMap.get(item.code)
    const result = buildWatchResult(item, current)
    return {
      ...item,
      result,
      current_boards: current?.consecutive_boards || null,
      change_percent: current?.change_percent ?? null
    }
  })
})

const poolHeaders = [
  {title: '股票', key: 'name', minWidth: 130},
  {title: '行业', key: 'industry', minWidth: 110},
  {title: '梯队', key: 'consecutive_boards', width: 86},
  {title: '涨停统计', key: 'limit_up_stat', width: 96},
  {title: '质量分', key: 'board_quality_score', minWidth: 140},
  {title: '首次封板', key: 'first_limit_time', width: 96},
  {title: '最后封板', key: 'last_limit_time', width: 96},
  {title: '炸板', key: 'open_count', width: 74},
  {title: '换手%', key: 'turnover_rate', width: 86},
  {title: '封单', key: 'seal_amount', width: 112},
  {title: '风险', key: 'tags', minWidth: 170},
  {title: '观察', key: 'action', width: 76, sortable: false}
]

const sectorStockHeaders = [
  {title: '股票', key: 'name', minWidth: 130},
  {title: '梯队', key: 'consecutive_boards', width: 86},
  {title: '涨停统计', key: 'limit_up_stat', width: 96},
  {title: '涨跌幅', key: 'change_percent', width: 90},
  {title: '质量分', key: 'board_quality_score', minWidth: 140},
  {title: '首次封板', key: 'first_limit_time', width: 96},
  {title: '最后封板', key: 'last_limit_time', width: 96},
  {title: '炸板', key: 'open_count', width: 74},
  {title: '换手%', key: 'turnover_rate', width: 86},
  {title: '封单', key: 'seal_amount', width: 112},
  {title: '风险', key: 'tags', minWidth: 170},
  {title: '观察', key: 'action', width: 76, sortable: false}
]

const candidateHeaders = [
  {title: '股票', key: 'stock.name', minWidth: 130},
  {title: '行业', key: 'stock.industry', minWidth: 110},
  {title: '涨停统计', key: 'stock.limit_up_stat', width: 96},
  {title: '等级', key: 'level', width: 92},
  {title: '候选分', key: 'candidate_score', minWidth: 140},
  {title: '板块分', key: 'sector.strength_score', width: 90},
  {title: '入池理由', key: 'reasons', minWidth: 240},
  {title: '风险', key: 'risks', minWidth: 180},
  {title: '观察', key: 'action', width: 76, sortable: false}
]

const signalHeaders = [
  {title: '股票', key: 'name', minWidth: 130},
  {title: '行业', key: 'industry', minWidth: 110},
  {title: '阶段', key: 'phase', width: 120},
  {title: '信号分', key: 'signal_score', minWidth: 140},
  {title: '识别依据', key: 'reasons', minWidth: 260},
  {title: '风险', key: 'risks', minWidth: 180},
  {title: '观察', key: 'action', width: 76, sortable: false}
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
  {title: '涨跌幅', key: 'change_percent', width: 90},
  {title: '换手%', key: 'turnover_rate', width: 86},
  {title: '成交额', key: 'amount', width: 112},
  {title: '理由', key: 'reasons', minWidth: 220},
  {title: '风险/标签', key: 'risks', minWidth: 200},
  {title: '观察', key: 'action', width: 76, sortable: false}
]

const watchHeaders = [
  {title: '股票', key: 'name', minWidth: 130},
  {title: '行业', key: 'industry', minWidth: 110},
  {title: '加入日期', key: 'watchDate', width: 112},
  {title: '来源', key: 'source', width: 120},
  {title: '目标', key: 'targetBoards', width: 80},
  {title: '当前结果', key: 'result', width: 110},
  {title: '涨跌幅', key: 'change_percent', width: 90},
  {title: '操作', key: 'action', width: 76, sortable: false}
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

function formatLimitUpStat(value?: string) {
  if (!value) return '-'
  const match = value.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (match) {
    return `${match[1]}天${match[2]}板`
  }
  return value
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

function changeClass(value?: number | null) {
  if (value == null || value === 0) return 'flat-text'
  return value > 0 ? 'up-text' : 'down-text'
}

function toggleSector(industry: string) {
  selectedSector.value = selectedSector.value === industry ? '' : industry
}

function toggleRadarSector(sector: MarketRadarSector) {
  if (selectedRadarSector.value === sector.sector_name) {
    clearRadarSector()
    return
  }
  selectedRadarSector.value = sector.sector_name
  loadRadarSectorStocks(sector.sector_name)
}

function clearRadarSector() {
  selectedRadarSector.value = ''
  sectorStocks.value = []
  sectorStockError.value = ''
}

function isWatched(code: string) {
  return watchedItems.value.some(item => item.code === code)
}

function toggleWatchFromPool(stock: LimitUpStock) {
  toggleWatch({
    code: stock.code,
    name: stock.name,
    industry: stock.industry,
    watchDate: queryDate.value,
    source: `${stock.consecutive_boards}板涨停池`,
    targetBoards: stock.consecutive_boards + 1
  })
}

function toggleWatchFromCandidate(candidate: CandidateStock) {
  toggleWatch({
    code: candidate.stock.code,
    name: candidate.stock.name,
    industry: candidate.stock.industry,
    watchDate: queryDate.value,
    source: candidate.pool_type.replace('_to_', '进'),
    targetBoards: candidate.target_boards
  })
}

function toggleWatchFromSignal(signal: DivergenceConsensusSignal) {
  toggleWatch({
    code: signal.code,
    name: signal.name,
    industry: signal.industry,
    watchDate: queryDate.value,
    source: signal.phase
  })
}

function toggleWatchFromRadar(candidate: MarketRadarCandidate) {
  toggleWatch({
    code: candidate.code,
    name: candidate.name,
    industry: candidate.industry,
    watchDate: queryDate.value,
    source: candidate.signal_type === 'limit_up' ? '雷达涨停确认' : '雷达板块候选'
  })
}

function toggleWatchFromSectorStock(stock: MarketRadarSectorStock) {
  toggleWatch({
    code: stock.code,
    name: stock.name,
    industry: stock.industry,
    watchDate: queryDate.value,
    source: '雷达板块成分'
  })
}

function toggleWatch(item: WatchItem) {
  if (isWatched(item.code)) {
    removeWatch(item.code)
    return
  }
  watchedItems.value = [item, ...watchedItems.value]
  saveWatchlist()
}

function removeWatch(code: string) {
  watchedItems.value = watchedItems.value.filter(item => item.code !== code)
  saveWatchlist()
}

function buildWatchResult(item: WatchItem, current?: LimitUpStock) {
  if (!current) {
    return queryDate.value <= item.watchDate ? '待跟踪' : '未涨停'
  }
  if (item.targetBoards && current.consecutive_boards >= item.targetBoards) {
    return '晋级'
  }
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
  radarLoading.value = true
  radarError.value = ''
  try {
    const [reviewResponse, radarResponse] = await Promise.allSettled([
      getMarketReview({date: queryDate.value, refresh}),
      getMarketRadar({date: queryDate.value, refresh, sector_limit: 20, candidate_limit: 80})
    ])
    if (reviewResponse.status === 'fulfilled') {
      review.value = reviewResponse.value.data
    } else {
      const err: any = reviewResponse.reason
      error.value = sanitizeMarketError(err?.response?.data?.detail || err?.message || '市场复盘数据加载失败')
    }
    if (radarResponse.status === 'fulfilled') {
      radar.value = radarResponse.value.data
    } else {
      const err: any = radarResponse.reason
      radarError.value = sanitizeMarketError(err?.response?.data?.detail || err?.message || '市场雷达数据加载失败')
    }
  } catch (err: any) {
    error.value = sanitizeMarketError(err?.response?.data?.detail || err?.message || '市场复盘数据加载失败')
  } finally {
    loading.value = false
    radarLoading.value = false
  }
  if (selectedRadarSector.value) {
    await loadRadarSectorStocks(selectedRadarSector.value, refresh)
  }
}

async function loadRadarSectorStocks(sectorName = selectedRadarSector.value, refresh = false) {
  if (!sectorName) {
    sectorStocks.value = []
    return
  }
  sectorStockLoading.value = true
  sectorStockError.value = ''
  try {
    const response = await getMarketRadarSectorStocks(sectorName, {
      date: queryDate.value,
      refresh,
      limit: 500
    })
    if (selectedRadarSector.value === sectorName) {
      sectorStocks.value = response.data
    }
  } catch (err: any) {
    sectorStockError.value = sanitizeMarketError(err?.response?.data?.detail || err?.message || '板块成分股加载失败')
    sectorStocks.value = []
  } finally {
    sectorStockLoading.value = false
  }
}

async function loadKline(refresh = false) {
  if (!selectedCode.value) {
    return
  }
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
    klineError.value = sanitizeMarketError(err?.response?.data?.detail || err?.message || '个股K线加载失败')
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

watch(selectedPeriod, async (next, prev) => {
  if (!klineDialog.value || !selectedCode.value || next === prev) {
    return
  }
  await loadKline(false)
})

const klineLimit = computed(() => {
  if (selectedPeriod.value === 'five_day') {
    return 5
  }
  if (selectedPeriod.value === 'day' || selectedPeriod.value === 'week') {
    return 120
  }
  if (selectedPeriod.value === 'year') {
    return 20
  }
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
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
  color: var(--color-text);
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
  color: var(--color-text-muted);
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.summary-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.summary-label {
  margin-top: 5px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.tabs {
  margin-bottom: 12px;
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

.candidate-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px 12px 0;
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

.table-card,
.sector-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.table-card {
  overflow: hidden;
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

.stat-text {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
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
  background: var(--color-border);
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}

.up-text {
  color: #dc2626;
  font-weight: 600;
}

.down-text {
  color: #16a34a;
  font-weight: 600;
}

.flat-text {
  color: var(--color-text-muted);
}

.sector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.sector-card {
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.sector-card:hover,
.sector-card.active {
  border-color: var(--color-primary);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.12);
}

.sector-card.active {
  grid-column: 1 / -1;
  transform: translateY(-1px);
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
  color: var(--color-text-muted);
  font-size: 13px;
}

.sector-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 12px 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.sector-stock-panel {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e2e8f0;
}

.sector-stock-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.sector-stock-head h4 {
  margin: 0 0 4px;
  font-size: 16px;
}

.sector-stock-head p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
}

.dialog-card {
  padding: 16px;
  border-radius: var(--radius-card);
}

.dialog-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.dialog-toolbar h2 {
  margin: 0 0 4px;
  font-size: 22px;
}

.dialog-toolbar p {
  margin: 0;
  color: var(--color-text-muted);
}

.dialog-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
}

.kline-period-tabs {
  margin-top: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  overflow: hidden;
}

.kline-period-tab {
  min-width: 112px;
  color: var(--color-text);
  font-weight: 600;
}

.kline-period-tabs :deep(.kline-period-tab-selected) {
  color: var(--color-primary-dark);
  background: var(--color-primary-light);
}

.kline-period-tabs :deep(.v-tab__slider) {
  height: 3px;
}

@media (max-width: 900px) {
  .market-review {
    padding: 16px;
  }

  .page-header,
  .dialog-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar,
  .dialog-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .date-input {
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

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
