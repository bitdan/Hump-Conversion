<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- 标题区域 -->
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          股票自选
        </h1>
      </div>

      <!-- 股票数据导航 -->
      <div class="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-4 mb-6">
        <div class="flex items-center gap-4 flex-wrap">
          <v-btn
              v-for="tab in stockTabs"
              :key="tab.value"
              :variant="activeTab === tab.value ? 'flat' : 'text'"
              :color="activeTab === tab.value ? 'primary' : 'default'"
              rounded="lg"
              @click="activeTab = tab.value"
              class="px-4"
          >
            <v-icon v-if="tab.icon" :icon="tab.icon" size="small" class="mr-2"/>
            {{ tab.label }}
          </v-btn>
          <v-spacer/>
          <v-btn icon variant="text" size="small">
            <v-icon icon="mdi-magnify"/>
          </v-btn>
          <v-btn icon variant="text" size="small">
            <v-icon icon="mdi-cellphone"/>
          </v-btn>
        </div>
      </div>

      <!-- 主要指数显示区域 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div
            v-for="index in marketIndices"
            :key="index.code"
            class="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-300 cursor-pointer"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-600">{{ index.name }}</span>
            <span class="text-xs text-gray-400">{{ index.code }}</span>
          </div>
          <div class="text-2xl font-bold mb-1">{{ index.value.toFixed(2) }}</div>
          <div class="flex items-center gap-2">
            <span :class="index.change >= 0 ? 'text-red-500' : 'text-green-500'" class="font-semibold">
              {{ index.change >= 0 ? '+' : '' }}{{ index.change.toFixed(2) }}%
            </span>
            <span :class="index.change >= 0 ? 'text-red-500' : 'text-green-500'" class="text-sm">
              {{ index.change >= 0 ? '+' : '' }}{{ index.priceChange.toFixed(2) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 股票列表表格 -->
      <div class="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
        <v-table class="bg-transparent">
          <thead>
          <tr class="bg-gray-50/50">
            <th class="text-left font-semibold text-gray-700">名称</th>
            <th class="text-right font-semibold text-gray-700">昨收</th>
            <th class="text-right font-semibold text-gray-700">最新</th>
            <th class="text-right font-semibold text-gray-700">涨幅</th>
            <th class="text-right font-semibold text-gray-700">涨跌</th>
            <th class="text-right font-semibold text-gray-700">成交量</th>
            <th class="text-right font-semibold text-gray-700">总市值</th>
            <th class="text-center font-semibold text-gray-700">操作</th>
          </tr>
          </thead>
          <tbody>
          <tr
              v-for="stock in stockList"
              :key="stock.code"
              class="hover:bg-gray-50/50 transition-colors duration-200"
          >
            <td>
              <div>
                <div class="font-medium text-gray-900">{{ stock.name }}</div>
                <div class="text-xs text-gray-500">{{ stock.code }}</div>
              </div>
            </td>
            <td class="text-right text-gray-700">{{ stock.yesterdayClose.toFixed(2) }}</td>
            <td class="text-right font-semibold" :class="stock.change >= 0 ? 'text-red-500' : 'text-green-500'">
              {{ stock.latest.toFixed(2) }}
            </td>
            <td class="text-right font-semibold" :class="stock.change >= 0 ? 'text-red-500' : 'text-green-500'">
              {{ stock.change >= 0 ? '+' : '' }}{{ stock.change.toFixed(2) }}%
            </td>
            <td class="text-right font-semibold" :class="stock.change >= 0 ? 'text-red-500' : 'text-green-500'">
              {{ stock.change >= 0 ? '+' : '' }}{{ stock.priceChange.toFixed(2) }}
            </td>
            <td class="text-right text-gray-700">{{ formatVolume(stock.volume) }}</td>
            <td class="text-right text-gray-700">{{ formatMarketValue(stock.marketValue) }}</td>
            <td class="text-center">
              <div class="flex items-center justify-center gap-2">
                <v-btn icon variant="text" size="small" @click="viewStock(stock)">
                  <v-icon icon="mdi-eye" size="small"/>
                </v-btn>
                <v-btn icon variant="text" size="small" @click="viewChart(stock)">
                  <v-icon icon="mdi-chart-line" size="small"/>
                </v-btn>
                <v-btn icon variant="text" size="small" @click="addToWatchlist(stock)">
                  <v-icon icon="mdi-plus" size="small"/>
                </v-btn>
                <v-btn icon variant="text" size="small" @click="removeFromWatchlist(stock)">
                  <v-icon icon="mdi-close" size="small"/>
                </v-btn>
              </div>
            </td>
          </tr>
          </tbody>
        </v-table>

        <!-- 空状态 -->
        <div v-if="stockList.length === 0" class="text-center py-12">
          <v-icon icon="mdi-chart-line-variant" size="64" class="text-gray-300 mb-4"/>
          <p class="text-gray-500">暂无自选股票</p>
          <v-btn color="primary" variant="tonal" class="mt-4" @click="showAddDialog = true">
            添加股票
          </v-btn>
        </div>
      </div>
    </div>

    <!-- 提示消息 -->
    <v-snackbar
        v-model="showSnackbar"
        :color="snackbarColor"
        :timeout="2000"
        location="top"
        class="!rounded-lg"
    >
      {{ snackbarText }}
    </v-snackbar>

    <!-- 添加股票对话框 -->
    <v-dialog v-model="showAddDialog" max-width="500">
      <v-card>
        <v-card-title>添加股票</v-card-title>
        <v-card-text>
          <v-text-field
              v-model="newStockCode"
              label="股票代码"
              placeholder="请输入股票代码，如：000001"
              variant="outlined"
              class="mt-4"
          />
          <v-text-field
              v-model="newStockName"
              label="股票名称"
              placeholder="请输入股票名称，如：平安银行"
              variant="outlined"
              class="mt-4"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn variant="text" @click="showAddDialog = false">取消</v-btn>
          <v-btn color="primary" @click="handleAddStock">确定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'

// 接口定义
interface MarketIndex {
  code: string
  name: string
  value: number
  change: number
  priceChange: number
}

interface Stock {
  code: string
  name: string
  yesterdayClose: number
  latest: number
  change: number
  priceChange: number
  volume: number
  marketValue: number
}

interface StockTab {
  value: string
  label: string
  icon?: string
}

// 状态定义
const activeTab = ref('watchlist')
const showSnackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const showAddDialog = ref(false)
const newStockCode = ref('')
const newStockName = ref('')

// 股票数据导航
const stockTabs: StockTab[] = [
  {value: 'index', label: '指数行情', icon: 'mdi-chart-timeline-variant'},
  {value: 'watchlist', label: '自选', icon: 'mdi-star'},
  {value: 'holdings', label: '持仓', icon: 'mdi-wallet'},
  {value: 'gainers', label: '涨幅', icon: 'mdi-trending-up'},
  {value: 'losers', label: '跌幅', icon: 'mdi-trending-down'}
]

// 主要指数数据（模拟数据）
const marketIndices = ref<MarketIndex[]>([
  {
    code: '000001',
    name: '上证指数',
    value: 3888.34,
    change: 0.31,
    priceChange: 12.05
  },
  {
    code: '399001',
    name: '深证综指',
    value: 2464.94,
    change: 0.99,
    priceChange: 24.15
  },
  {
    code: '399006',
    name: '创业板指',
    value: 3122.85,
    change: 0.51,
    priceChange: 15.87
  },
  {
    code: '000300',
    name: '沪深300',
    value: 4567.64,
    change: 0.33,
    priceChange: 15.07
  },
  {
    code: 'HSI',
    name: '恒生指数',
    value: 25650.43,
    change: 0.6,
    priceChange: 153.90
  },
  {
    code: 'HSCEI',
    name: '国企指数',
    value: 8884.52,
    change: 0.49,
    priceChange: 43.53
  }
])

// 股票列表数据（模拟数据）
const stockList = ref<Stock[]>([
  {
    code: '603122',
    name: '合富中国',
    yesterdayClose: 30.01,
    latest: 30.79,
    change: 2.60,
    priceChange: 0.78,
    volume: 733700,
    marketValue: 12256000000
  },
  {
    code: '000592',
    name: '平潭发展',
    yesterdayClose: 14.70,
    latest: 15.51,
    change: 5.51,
    priceChange: 0.81,
    volume: 3129300,
    marketValue: 29962000000
  },
  {
    code: '000547',
    name: '航天发展',
    yesterdayClose: 21.45,
    latest: 22.65,
    change: 5.59,
    priceChange: 1.20,
    volume: 3809300,
    marketValue: 36205000000
  }
])

// 格式化成交量
function formatVolume(volume: number): string {
  if (volume >= 10000) {
    return `${(volume / 10000).toFixed(2)}万手`
  }
  return `${volume}手`
}

// 格式化市值
function formatMarketValue(value: number): string {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(2)}亿`
  } else if (value >= 10000) {
    return `${(value / 10000).toFixed(2)}万`
  }
  return value.toFixed(2)
}

// 查看股票详情
function viewStock(stock: Stock) {
  showMessage(`查看 ${stock.name}(${stock.code}) 详情`, 'info')
}

// 查看股票图表
function viewChart(stock: Stock) {
  showMessage(`查看 ${stock.name}(${stock.code}) 图表`, 'info')
}

// 添加到自选
function addToWatchlist(stock: Stock) {
  showMessage(`已添加 ${stock.name}(${stock.code}) 到自选`, 'success')
}

// 从自选移除
function removeFromWatchlist(stock: Stock) {
  const index = stockList.value.findIndex(s => s.code === stock.code)
  if (index > -1) {
    stockList.value.splice(index, 1)
    showMessage(`已从自选移除 ${stock.name}(${stock.code})`, 'success')
  }
}

// 添加新股票
function handleAddStock() {
  if (!newStockCode.value.trim() || !newStockName.value.trim()) {
    showMessage('请输入股票代码和名称', 'error')
    return
  }

  // 检查是否已存在
  if (stockList.value.some(s => s.code === newStockCode.value)) {
    showMessage('该股票已在自选列表中', 'error')
    return
  }

  // 添加新股票（模拟数据）
  const newStock: Stock = {
    code: newStockCode.value,
    name: newStockName.value,
    yesterdayClose: 10.00,
    latest: 10.50,
    change: 5.00,
    priceChange: 0.50,
    volume: 100000,
    marketValue: 1000000000
  }

  stockList.value.push(newStock)
  showMessage(`已添加 ${newStockName.value}(${newStockCode.value})`, 'success')

  // 重置表单
  newStockCode.value = ''
  newStockName.value = ''
  showAddDialog.value = false
}

// 显示消息
function showMessage(message: string, color: string = 'success') {
  snackbarText.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}
</script>

<style scoped>
:deep(.v-table) {
  background-color: transparent !important;
}

:deep(.v-table thead th) {
  background-color: rgba(249, 250, 251, 0.5) !important;
  font-weight: 600;
  padding: 12px 16px;
}

:deep(.v-table tbody td) {
  padding: 12px 16px;
}

:deep(.v-btn--icon) {
  width: 32px;
  height: 32px;
}
</style>

