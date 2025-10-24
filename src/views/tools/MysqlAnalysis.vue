<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center py-8 px-4">
    <div class="w-full max-w-6xl bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          MySQL慢查询日志分析器
        </h1>
        <p class="mt-2 text-gray-600">在浏览器中安全分析您的MySQL慢查询日志</p>
      </div>

      <!-- 文件上传区域 -->
      <div class="bg-white/80 rounded-xl p-6 mb-6">
        <div
            class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50"
            @drop.prevent="handleDrop"
            @dragover.prevent
            @click="triggerFileInput"
        >
          <input
              ref="fileInput"
              type="file"
              accept=".log,.txt"
              class="hidden"
              @change="handleFileSelect"
          />
          <div class="flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <p class="text-lg font-medium text-gray-700">拖拽文件到这里或点击选择文件</p>
            <p class="text-gray-500 mt-1">支持 .log 和 .txt 格式</p>
            <v-btn color="primary" class="mt-4" prepend-icon="mdi-file-upload">选择日志文件</v-btn>
          </div>
        </div>

        <div v-if="fileName" class="mt-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20"
                 fill="currentColor">
              <path fill-rule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clip-rule="evenodd"/>
            </svg>
            <span class="font-medium">{{ fileName }}</span>
            <span class="ml-2 text-sm text-gray-500">({{ formatFileSize(fileSize) }})</span>
          </div>
          <v-btn icon variant="text" @click="clearFile">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"/>
            </svg>
          </v-btn>
        </div>
      </div>

      <!-- 分析进度 -->
      <div v-if="isAnalyzing" class="bg-white/80 rounded-xl p-6 mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium">正在分析日志...</span>
          <span>{{ progress }}%</span>
        </div>
        <v-progress-linear
            v-model="progress"
            color="primary"
            rounded
            striped
        ></v-progress-linear>
      </div>

      <!-- 分析结果 -->
      <div v-if="analysisComplete" class="space-y-6">
        <!-- 统计概览 -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-5 shadow">
            <div class="text-3xl font-bold">{{ statistics.totalQueries }}</div>
            <div class="text-sm">总查询数</div>
          </div>
          <div class="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-5 shadow">
            <div class="text-3xl font-bold">{{ statistics.avgQueryTime.toFixed(3) }}s</div>
            <div class="text-sm">平均执行时间</div>
          </div>
          <div class="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl p-5 shadow">
            <div class="text-3xl font-bold">{{ statistics.maxQueryTime.toFixed(3) }}s</div>
            <div class="text-sm">最长执行时间</div>
          </div>
          <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-5 shadow">
            <div class="text-3xl font-bold">{{ statistics.lockTimeSum.toFixed(3) }}s</div>
            <div class="text-sm">总锁定时间</div>
          </div>
        </div>

        <!-- 图表区域 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- 查询时间分布 -->
          <div class="bg-white/80 rounded-xl p-5 shadow">
            <h3 class="text-lg font-semibold mb-4">查询时间分布</h3>
            <canvas ref="timeDistributionChart"></canvas>
          </div>

          <!-- 查询类型分布 -->
          <div class="bg-white/80 rounded-xl p-5 shadow">
            <h3 class="text-lg font-semibold mb-4">查询类型分布</h3>
            <canvas ref="queryTypeChart"></canvas>
          </div>
        </div>

        <!-- 过滤和搜索 -->
        <div class="bg-white/80 rounded-xl p-5 shadow mb-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <v-text-field
                v-model="searchQuery"
                label="搜索查询语句"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-magnify"
                hide-details
            />
            <v-select
                v-model="userFilter"
                :items="uniqueUsers"
                label="用户筛选"
                variant="outlined"
                density="comfortable"
                hide-details
                clearable
            />
            <v-select
                v-model="timeFilter"
                :items="timeFilterOptions"
                label="执行时间筛选"
                variant="outlined"
                density="comfortable"
                hide-details
            />
            <v-btn color="secondary" @click="resetFilters" prepend-icon="mdi-refresh">
              重置筛选
            </v-btn>
          </div>
        </div>

        <!-- 查询列表 -->
        <div class="bg-white/80 rounded-xl shadow overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
              <tr>
                <th scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    @click="sortBy('timestamp')">
                  时间
                  <span v-if="sortField === 'timestamp'" class="ml-1">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
                </th>
                <th scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    @click="sortBy('userHost')">
                  用户@主机
                  <span v-if="sortField === 'userHost'" class="ml-1">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
                </th>
                <th scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    @click="sortBy('queryTime')">
                  查询时间
                  <span v-if="sortField === 'queryTime'" class="ml-1">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
                </th>
                <th scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    @click="sortBy('lockTime')">
                  锁定时间
                  <span v-if="sortField === 'lockTime'" class="ml-1">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
                </th>
                <th scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    @click="sortBy('rowsSent')">
                  发送行数
                  <span v-if="sortField === 'rowsSent'" class="ml-1">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  查询语句
                </th>
              </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="(query, index) in paginatedQueries" :key="index" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(query.timestamp) }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ query.userHost }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span :class="getTimeClass(query.queryTime)">{{ query.queryTime.toFixed(3) }}s</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ query.lockTime.toFixed(3) }}s</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ query.rowsSent }}</td>
                <td class="px-6 py-4 text-sm text-gray-900 max-w-md">
                  <div
                      class="font-mono text-xs bg-gray-100 p-2 rounded cursor-pointer hover:bg-gray-200 transition-colors truncate"
                      :title="query.sql"
                      @click="showFullSQL(query.sql, index)"
                  >
                    {{ truncateSQL(query.sql) }}
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <div class="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div class="text-sm text-gray-700">
              显示第 {{ (currentPage - 1) * itemsPerPage + 1 }} 到
              {{ Math.min(currentPage * itemsPerPage, filteredQueries.length) }} 条，
              共 {{ filteredQueries.length }} 条记录
            </div>
            <div class="flex space-x-2">
              <v-btn
                  icon
                  variant="outlined"
                  :disabled="currentPage === 1"
                  @click="currentPage--"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clip-rule="evenodd"/>
                </svg>
              </v-btn>

              <v-btn
                  icon
                  variant="outlined"
                  :disabled="currentPage * itemsPerPage >= filteredQueries.length"
                  @click="currentPage++"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd"/>
                </svg>
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!isAnalyzing && !fileName" class="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24"
             stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <h3 class="mt-4 text-lg font-medium text-gray-900">请上传MySQL慢查询日志文件</h3>
        <p class="mt-1 text-gray-500">支持 .log 和 .txt 格式的慢查询日志文件</p>
      </div>
    </div>

    <!-- SQL 详情弹窗 -->
    <v-dialog v-model="showSQLDialog" max-width="800px" scrollable>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>SQL 查询详情</span>
          <v-btn icon @click="showSQLDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-0">
          <div class="sql-detail-content">
            <div class="sql-meta-info pa-4 bg-grey-lighten-4">
              <div class="d-flex flex-wrap gap-4">
                <div>
                  <strong>查询索引:</strong> {{ currentSQLIndex + 1 }} / {{ queries.length }}
                </div>
                <div>
                  <strong>执行时间:</strong> {{ currentQuery?.queryTime.toFixed(3) }}s
                </div>
                <div>
                  <strong>锁定时间:</strong> {{ currentQuery?.lockTime.toFixed(3) }}s
                </div>
                <div>
                  <strong>返回行数:</strong> {{ currentQuery?.rowsSent }}
                </div>
              </div>
            </div>
            <div class="sql-code-container pa-4">
              <pre class="sql-code">{{ currentSQL }}</pre>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn
              color="primary"
              variant="outlined"
              @click="copySQL"
              prepend-icon="mdi-content-copy"
          >
            复制SQL
          </v-btn>
          <v-btn
              color="primary"
              @click="showSQLDialog = false"
          >
            关闭
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onUnmounted, ref, watch} from 'vue';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  PieController,
  Title,
  Tooltip
} from 'chart.js';

// 注册Chart.js组件
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend, PieController, ArcElement);

// 类型定义
interface QueryLog {
  timestamp: string;
  userHost: string;
  queryTime: number;
  lockTime: number;
  rowsSent: number;
  rowsExamined: number;
  database?: string;
  sql: string;
}

interface Statistics {
  totalQueries: number;
  avgQueryTime: number;
  maxQueryTime: number;
  lockTimeSum: number;
  avgRowsSent: number;
  avgRowsExamined: number;
  rowsExaminedToSentRatio: number;
}

// 响应式数据
const fileInput = ref<HTMLInputElement | null>(null);
const fileName = ref('');
const fileSize = ref(0);
const isAnalyzing = ref(false);
const progress = ref(0);
const analysisComplete = ref(false);
const currentPage = ref(1);
const itemsPerPage = ref(10);

// SQL 弹窗相关
const showSQLDialog = ref(false);
const currentSQL = ref('');
const currentSQLIndex = ref(0);
const currentQuery = ref<QueryLog | null>(null);

// 分析结果数据
const queries = ref<QueryLog[]>([]);
const statistics = ref<Statistics>({
  totalQueries: 0,
  avgQueryTime: 0,
  maxQueryTime: 0,
  lockTimeSum: 0,
  avgRowsSent: 0,
  avgRowsExamined: 0,
  rowsExaminedToSentRatio: 0
});

const userFilter = ref('');
const uniqueUsers = ref<string[]>([]);

// 在分析完成后提取所有用户
function extractUniqueUsers() {
  const users = new Set<string>();
  queries.value.forEach(query => {
    // 从 userHost 中提取用户名（例如：dw_dev[admin]@[192.168.1.1] 提取 dw_dev）
    const match = query.userHost.match(/^([^\[]+)/);
    if (match && match[1]) {
      users.add(match[1]);
    }
  });
  uniqueUsers.value = Array.from(users).sort();
}


// 修改 filteredQueries 计算属性以包含用户筛选
const filteredQueries = computed(() => {
  let result = [...queries.value];

  // 搜索过滤
  if (searchQuery.value) {
    const search = searchQuery.value.toLowerCase();
    result = result.filter(q =>
        q.sql.toLowerCase().includes(search) ||
        q.userHost.toLowerCase().includes(search)
    );
  }

  // 时间过滤
  if (timeFilter.value !== 'all') {
    const threshold = {
      'gt1s': 1,
      'gt5s': 5,
      'gt10s': 10
    }[timeFilter.value];

    if (threshold) {
      result = result.filter(q => q.queryTime > threshold);
    }
  }

  // 用户过滤
  if (userFilter.value) {
    result = result.filter(q => q.userHost.startsWith(userFilter.value));
  }

  // 排序
  result.sort((a, b) => {
    let comparison = 0;

    if (sortField.value === 'timestamp') {
      comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    } else if (sortField.value === 'userHost') {
      comparison = a.userHost.localeCompare(b.userHost);
    } else {
      // 对于数值类型的字段
      comparison = (a[sortField.value] as number) - (b[sortField.value] as number);
    }

    return sortDirection.value === 'asc' ? comparison : -comparison;
  });

  return result;
});

// 过滤和排序
const searchQuery = ref('');
const timeFilter = ref('all');
const sortOption = ref('time-desc');
const sortField = ref('queryTime');
const sortDirection = ref('desc');

// 添加排序方法
function sortBy(field: string) {
  if (sortField.value === field) {
    // 如果点击的是当前排序字段，则切换排序方向
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    // 如果点击的是新字段，则设置为该字段并默认降序
    sortField.value = field;
    sortDirection.value = 'desc';
  }
}


// 图表实例
const timeDistributionChart = ref<HTMLCanvasElement | null>(null);
const queryTypeChart = ref<HTMLCanvasElement | null>(null);
let timeChartInstance: Chart | null = null;
let typeChartInstance: Chart | null = null;

// 过滤选项
const timeFilterOptions = [
  {title: '全部', value: 'all'},
  {title: '超过1秒', value: 'gt1s'},
  {title: '超过5秒', value: 'gt5s'},
  {title: '超过10秒', value: 'gt10s'}
];




const paginatedQueries = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredQueries.value.slice(start, end);
});

// 方法定义
function triggerFileInput() {
  fileInput.value?.click();
}

function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (files?.[0]) {
    processFile(files[0]);
  }
}

function handleFileSelect(e: Event) {
  const files = (e.target as HTMLInputElement)?.files;
  if (files?.[0]) {
    processFile(files[0]);
  }
}

function clearFile() {
  fileName.value = '';
  fileSize.value = 0;
  queries.value = [];
  analysisComplete.value = false;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  resetCharts();
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}

function getTimeClass(seconds: number): string {
  if (seconds > 10) return 'text-red-600 font-bold';
  if (seconds > 5) return 'text-orange-500';
  if (seconds > 1) return 'text-yellow-500';
  return 'text-green-500';
}

function truncateSQL(sql: string, maxLength: number = 100): string {
  if (sql.length <= maxLength) return sql;
  return sql.substring(0, maxLength) + '...';
}

function showFullSQL(sql: string, index: number) {
  currentSQL.value = sql;
  currentSQLIndex.value = index;
  currentQuery.value = queries.value[index];
  showSQLDialog.value = true;
}

async function copySQL() {
  try {
    await navigator.clipboard.writeText(currentSQL.value);
    // 可以添加复制成功的提示
    console.log('SQL已复制到剪贴板');
  } catch (err) {
    console.error('复制失败:', err);
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = currentSQL.value;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

function resetFilters() {
  searchQuery.value = '';
  timeFilter.value = 'all';
  userFilter.value = '';
  sortField.value = 'queryTime';
  sortDirection.value = 'desc';
  currentPage.value = 1;
}


function resetCharts() {
  timeChartInstance?.destroy();
  timeChartInstance = null;
  typeChartInstance?.destroy();
  typeChartInstance = null;
}

function updateStatistics() {
  if (queries.value.length === 0) return;

  const totalTime = queries.value.reduce((sum, q) => sum + q.queryTime, 0);
  const totalLockTime = queries.value.reduce((sum, q) => sum + q.lockTime, 0);
  const totalRowsSent = queries.value.reduce((sum, q) => sum + q.rowsSent, 0);
  const totalRowsExamined = queries.value.reduce((sum, q) => sum + q.rowsExamined, 0);
  const maxTime = Math.max(...queries.value.map(q => q.queryTime));

  statistics.value = {
    totalQueries: queries.value.length,
    avgQueryTime: totalTime / queries.value.length,
    maxQueryTime: maxTime,
    lockTimeSum: totalLockTime,
    avgRowsSent: totalRowsSent / queries.value.length,
    avgRowsExamined: totalRowsExamined / queries.value.length,
    rowsExaminedToSentRatio: totalRowsExamined > 0 ? totalRowsSent / totalRowsExamined : 0
  };
}

function parseSlowLogEntry(logText: string): QueryLog[] {
  const entries: QueryLog[] = [];
  const logSections = logText.split(/(?=# Time:)/).filter(section => section.trim() !== '');

  for (const section of logSections) {
    try {
      const entry: Partial<QueryLog> = {
        timestamp: '',
        userHost: '',
        queryTime: 0,
        lockTime: 0,
        rowsSent: 0,
        rowsExamined: 0,
        sql: ''
      };

      // 解析时间戳
      const timeMatch = section.match(/# Time: ([\d\-T:.Z]+)/);
      if (timeMatch) entry.timestamp = timeMatch[1];

      // 解析用户主机信息
      const userMatch = section.match(/# User@Host: ([^#]+)/);
      if (userMatch) entry.userHost = userMatch[1].trim();

      // 解析查询统计信息
      const queryTimeMatch = section.match(/Query_time: ([\d.]+)/);
      if (queryTimeMatch) entry.queryTime = parseFloat(queryTimeMatch[1]) || 0;

      const lockTimeMatch = section.match(/Lock_time: ([\d.]+)/);
      if (lockTimeMatch) entry.lockTime = parseFloat(lockTimeMatch[1]) || 0;

      const rowsSentMatch = section.match(/Rows_sent: (\d+)/);
      if (rowsSentMatch) entry.rowsSent = parseInt(rowsSentMatch[1]) || 0;

      const rowsExaminedMatch = section.match(/Rows_examined: (\d+)/);
      if (rowsExaminedMatch) entry.rowsExamined = parseInt(rowsExaminedMatch[1]) || 0;

      // 解析数据库
      const useMatch = section.match(/use ([^;]+);/);
      if (useMatch) entry.database = useMatch[1];

      // 提取SQL语句
      const timestampIndex = section.indexOf('SET timestamp=');
      if (timestampIndex > -1) {
        const sqlStart = section.indexOf('\n', timestampIndex);
        if (sqlStart > -1) {
          let sqlContent = section.substring(sqlStart + 1).trim();
          const lines = sqlContent.split('\n');
          const cleanLines = lines.filter(line =>
              !line.startsWith('SET timestamp=') &&
              !line.startsWith('# Time:') &&
              !line.startsWith('# User@Host:') &&
              !line.startsWith('# Query_time:')
          );

          entry.sql = cleanLines.join('\n').replace(/\n+/g, '\n').trim();
        }
      }

      if (entry.sql) {
        entries.push(entry as QueryLog);
      }
    } catch (e) {
      console.warn('解析日志条目时出错:', e);
      continue;
    }
  }

  return entries;
}

function drawCharts() {
  resetCharts();

  // 查询时间分布图表
  if (timeDistributionChart.value) {
    const ctx = timeDistributionChart.value.getContext('2d');
    if (ctx) {
      const timeRanges = ['0-1s', '1-5s', '5-10s', '10-20s', '>20s'];
      const counts = [0, 0, 0, 0, 0];

      queries.value.forEach(query => {
        if (query.queryTime < 1) counts[0]++;
        else if (query.queryTime < 5) counts[1]++;
        else if (query.queryTime < 10) counts[2]++;
        else if (query.queryTime < 20) counts[3]++;
        else counts[4]++;
      });

      timeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: timeRanges,
          datasets: [{
            label: '查询数量',
            data: counts,
            backgroundColor: [
              'rgba(54, 162, 235, 0.7)',
              'rgba(255, 206, 86, 0.7)',
              'rgba(255, 159, 64, 0.7)',
              'rgba(255, 99, 132, 0.7)',
              'rgba(153, 102, 255, 0.7)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {display: false},
            title: {display: true, text: '查询时间分布'}
          }
        }
      });
    }
  }

  // 查询类型分布图表
  if (queryTypeChart.value) {
    const ctx = queryTypeChart.value.getContext('2d');
    if (ctx) {
      const typeCounts: Record<string, number> = {
        'SELECT': 0,
        'INSERT': 0,
        'UPDATE': 0,
        'DELETE': 0,
        'OTHER': 0
      };

      queries.value.forEach(query => {
        const match = query.sql.match(/^(SELECT|INSERT|UPDATE|DELETE)/i);
        if (match) {
          typeCounts[match[1].toUpperCase()]++;
        } else {
          typeCounts['OTHER']++;
        }
      });

      const labels = Object.keys(typeCounts).filter(k => typeCounts[k] > 0);
      const data = labels.map(k => typeCounts[k]);
      const backgroundColors = [
        'rgba(54, 162, 235, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(153, 102, 255, 0.7)'
      ].slice(0, labels.length);

      typeChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: backgroundColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {position: 'right'},
            title: {display: true, text: '查询类型分布'}
          }
        }
      });
    }
  }
}
async function processFile(file: File) {
  fileName.value = file.name;
  fileSize.value = file.size;

  isAnalyzing.value = true;
  progress.value = 0;
  analysisComplete.value = false;
  queries.value = [];

  try {
    const content = await readFileWithProgress(file, (loaded, total) => {
      progress.value = Math.round((loaded / total) * 100);
    });

    queries.value = parseSlowLogEntry(content);
    extractUniqueUsers(); // 新增这行
    updateStatistics();
    analysisComplete.value = true;

    nextTick(() => {
      drawCharts();
    });
  } catch (error) {
    console.error('文件处理错误:', error);
    clearFile();
  } finally {
    isAnalyzing.value = false;
  }
}

function readFileWithProgress(file: File, onProgress: (loaded: number, total: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(e.loaded, e.total);
      }
    };

    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsText(file);
  });
}

// 组件卸载时清理
onUnmounted(() => {
  resetCharts();
});

// 监听筛选条件变化
watch([searchQuery, timeFilter, userFilter], () => {
  currentPage.value = 1;
});
</script>

<style scoped>
.transition-opacity {
  transition: opacity 0.3s ease-in-out;
}

.sql-detail-content {
  max-height: 60vh;
  overflow: auto;
}

.sql-meta-info {
  border-bottom: 1px solid #e0e0e0;
}

.sql-code-container {
  background-color: #f5f5f5;
}

.sql-code {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.4;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #333;
}

/* SQL 语法高亮（基础版本） */
.sql-code .keyword {
  color: #d73a49;
  font-weight: bold;
}

.sql-code .string {
  color: #032f62;
}

.sql-code .comment {
  color: #6a737d;
  font-style: italic;
}

/* 表格中SQL显示优化 */
.font-mono {
  font-family: 'Courier New', monospace;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

th span {
  display: inline-block;
  width: 1em;
  text-align: center;
}
</style>
