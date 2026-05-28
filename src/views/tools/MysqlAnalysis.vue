<template>
  <ToolPageLayout max-width="max-w-full">
    <div class="w-full">
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
            <v-icon size="48" color="grey" class="mb-3">mdi-cloud-upload</v-icon>
            <p class="text-lg font-medium text-gray-700">拖拽文件到这里或点击选择文件</p>
            <p class="text-gray-500 mt-1">支持 .log 和 .txt 格式</p>
            <v-btn color="primary" class="mt-4" prepend-icon="mdi-file-upload">选择日志文件</v-btn>
          </div>
        </div>

        <div v-if="fileName" class="mt-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
          <div class="flex items-center">
            <v-icon color="blue" class="mr-2">mdi-file-document</v-icon>
            <span class="font-medium">{{ fileName }}</span>
            <span class="ml-2 text-sm text-gray-500">({{ formatFileSize(fileSize) }})</span>
          </div>
          <v-btn icon variant="text" @click="clearFile">
            <v-icon>mdi-close</v-icon>
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
        <div class="bg-white/80 rounded-xl p-4 mb-4 shadow">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <!-- 总查询数 -->
            <div class="bg-white border border-gray-200 rounded-lg p-3 flex items-center">
              <div class="bg-blue-100 p-2 rounded-full mr-3">
                <v-icon color="blue">mdi-database</v-icon>
              </div>
              <div>
                <div class="text-sm text-gray-500">总查询数</div>
                <div class="text-lg font-semibold">{{ statistics.totalQueries }}</div>
              </div>
            </div>

            <!-- 平均执行时间 -->
            <div class="bg-white border border-gray-200 rounded-lg p-3 flex items-center">
              <div class="bg-green-100 p-2 rounded-full mr-3">
                <v-icon color="green">mdi-clock-outline</v-icon>
              </div>
              <div>
                <div class="text-sm text-gray-500">平均执行时间</div>
                <div class="text-lg font-semibold">{{ statistics.avgQueryTime.toFixed(3) }}s</div>
              </div>
            </div>

            <!-- 最长执行时间 -->
            <div class="bg-white border border-gray-200 rounded-lg p-3 flex items-center">
              <div class="bg-amber-100 p-2 rounded-full mr-3">
                <v-icon color="amber">mdi-alert</v-icon>
              </div>
              <div>
                <div class="text-sm text-gray-500">最长执行时间</div>
                <div class="text-lg font-semibold">{{ statistics.maxQueryTime.toFixed(3) }}s</div>
              </div>
            </div>

            <!-- 总锁定时间 -->
            <div class="bg-white border border-gray-200 rounded-lg p-3 flex items-center">
              <div class="bg-purple-100 p-2 rounded-full mr-3">
                <v-icon color="purple">mdi-lock</v-icon>
              </div>
              <div>
                <div class="text-sm text-gray-500">总锁定时间</div>
                <div class="text-lg font-semibold">{{ statistics.lockTimeSum.toFixed(3) }}s</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 图表区域 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <!-- 查询时间分布 -->
          <div class="bg-white/80 rounded-xl p-4 shadow">
            <h3 class="text-sm font-semibold mb-3 text-gray-700 flex items-center">
              <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              查询时间分布
            </h3>
            <div class="h-40">
              <canvas ref="timeDistributionChart"></canvas>
            </div>
          </div>

          <!-- 查询类型分布 -->
          <div class="bg-white/80 rounded-xl p-4 shadow">
            <h3 class="text-sm font-semibold mb-3 text-gray-700 flex items-center">
              <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              查询类型分布
            </h3>
            <div class="h-40">
              <canvas ref="queryTypeChart"></canvas>
            </div>
          </div>
        </div>

        <!-- 查询排行 -->
        <div class="bg-white/80 rounded-xl shadow p-5 mb-6">
          <div class="mt-8 mb-4 flex items-center">
            <div class="flex-grow border-t border-gray-300"></div>
            <h2 class="mx-4 text-lg font-semibold text-gray-700">查询排行</h2>
            <div class="flex-grow border-t border-gray-300"></div>
          </div>

          <!-- 查询排行筛选 -->
          <div class="mb-4 flex gap-4 flex-wrap items-center justify-end">
            <v-select
                v-model="rankUserFilter"
                :items="uniqueUsers"
                label="用户筛选"
                variant="outlined"
                density="comfortable"
                hide-details
                clearable
                style="min-width: 200px;"
            />
            <v-text-field
                v-model="rankStartDate"
                type="date"
                label="开始日期"
                variant="outlined"
                density="comfortable"
                hide-details
                style="min-width: 180px;"
                prepend-inner-icon="mdi-calendar-start"
            />
            <v-text-field
                v-model="rankEndDate"
                type="date"
                label="结束日期"
                variant="outlined"
                density="comfortable"
                hide-details
                style="min-width: 180px;"
                prepend-inner-icon="mdi-calendar-end"
            />
            <v-btn color="secondary" @click="resetRankFilters" prepend-icon="mdi-refresh">
              重置筛选
            </v-btn>
            <v-btn
                color="success"
                variant="elevated"
                prepend-icon="mdi-file-excel"
                :disabled="rankedQueries.length === 0"
                @click="exportRankToCSV"
            >
              导出查询排行
            </v-btn>
          </div>

          <v-data-table
              :headers="rankHeaders"
              :items="rankedQueries"
              :items-per-page="10"
              :sort-by="[{ key: 'count', order: 'desc' }]"
              class="elevation-1 fixed-width-table"
          >
            <template #item.sampleSql="{ item }">
              <div
                  class="font-mono text-xs bg-grey-lighten-4 pa-2 rounded cursor-pointer hover:bg-grey-lighten-3 truncate"
                  @click="showFullSQL(item.sampleSql, 0)"
                  :title="item.sampleSql"
              >
                {{ truncateSQL(item.sampleSql, 50) }}
              </div>
            </template>

            <template #item.primaryUser="{ item }">
              <span class="font-mono text-xs">{{ item.primaryUser }}</span>
            </template>

            <template #item.count="{ item }">
              <span class="font-medium">{{ item.count }}</span>
            </template>

            <template #item.lockTime="{ item }">
              {{ item.lockTime.toFixed(3) }}s
            </template>

            <template #item.rowsSent="{ item }">
              {{ item.rowsSent.toLocaleString() }}
            </template>

            <template #item.queryTime="{ item }">
              <span :class="getTimeClass(item.avgQueryTime)">
                {{ item.queryTime.toFixed(3) }}s
              </span>
            </template>

            <template #item.avgLockTime="{ item }">
              {{ item.avgLockTime.toFixed(3) }}s
            </template>

            <template #item.avgRowsSent="{ item }">
              {{ item.avgRowsSent.toFixed(0) }}
            </template>

            <template #item.avgQueryTime="{ item }">
              <span :class="getTimeClass(item.avgQueryTime)">
                {{ item.avgQueryTime.toFixed(3) }}s
              </span>
            </template>
          </v-data-table>
        </div>

        <!-- 详细慢查询日志 -->
        <div class="bg-white/80 rounded-xl shadow p-5">
          <div class="mt-8 mb-4 flex items-center">
            <div class="flex-grow border-t border-gray-300"></div>
            <h2 class="mx-4 text-lg font-semibold text-gray-700">详细慢查询日志</h2>
            <div class="flex-grow border-t border-gray-300"></div>
          </div>

          <!-- 搜索和过滤 -->
          <div class="mb-4">
            <v-text-field
                v-model="search"
                label="搜索查询语句、用户等"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                hide-details
                class="mb-4"
            />

            <div class="flex gap-4 flex-wrap">
              <v-select
                  v-model="userFilter"
                  :items="uniqueUsers"
                  label="用户筛选"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  clearable
                  style="min-width: 200px;"
              />

              <v-text-field
                  v-model="startDate"
                  type="date"
                  label="开始日期"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  style="min-width: 180px;"
                  prepend-inner-icon="mdi-calendar-start"
              />

              <v-text-field
                  v-model="endDate"
                  type="date"
                  label="结束日期"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  style="min-width: 180px;"
                  prepend-inner-icon="mdi-calendar-end"
              />

              <v-btn color="secondary" @click="resetFilters" prepend-icon="mdi-refresh">
                重置筛选
              </v-btn>

              <v-btn
                  color="success"
                  variant="elevated"
                  prepend-icon="mdi-file-excel"
                  :disabled="filteredQueries.length === 0"
                  @click="exportDetailToCSV"
              >
                导出详细日志
              </v-btn>
            </div>
          </div>

          <v-data-table
              :headers="headers"
              :items="filteredQueries"
              :search="search"
              :items-per-page="10"
              :sort-by="[{ key: 'timestamp', order: 'desc' }]"
              class="elevation-1 fixed-width-table"
          >
            <template #item.timestamp="{ item }">
              {{ formatDate(item.timestamp) }}
            </template>

            <template #item.userHost="{ item }">
              <span class="font-mono text-xs">{{ item.userHost }}</span>
            </template>

            <template #item.queryTime="{ item }">
              <span :class="getTimeClass(item.queryTime)">
                {{ item.queryTime.toFixed(3) }}s
              </span>
            </template>

            <template #item.lockTime="{ item }">
              {{ item.lockTime.toFixed(3) }}s
            </template>

            <template #item.rowsSent="{ item }">
              {{ item.rowsSent.toLocaleString() }}
            </template>

            <template #item.sql="{ item }">
              <div
                  class="font-mono text-xs bg-grey-lighten-4 pa-2 rounded cursor-pointer hover:bg-grey-lighten-3 truncate"
                  @click="showFullSQL(item.sql, getQueryIndex(item))"
                  :title="item.sql"
              >
                {{ truncateSQL(item.sql) }}
              </div>
            </template>
          </v-data-table>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!isAnalyzing && !fileName" class="text-center py-12">
        <v-icon size="64" color="grey" class="mb-4">mdi-file-document-outline</v-icon>
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
                  <strong>返回行数:</strong> {{ currentQuery?.rowsSent.toLocaleString() }}
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
  </ToolPageLayout>
</template>

<script setup lang="ts">
import {computed, nextTick, onUnmounted, ref} from 'vue';
import ToolPageLayout from '@/components/ToolPageLayout.vue'
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

interface RankedQuery {
  sqlHash: string;
  sampleSql: string;
  count: number;
  lockTime: number;
  rowsSent: number;
  queryTime: number;
  avgLockTime: number;
  avgRowsSent: number;
  avgQueryTime: number;
  users: string[]; // 执行该SQL的用户列表
  primaryUser: string; // 主要用户（执行次数最多的）
}

// 响应式数据
const fileInput = ref<HTMLInputElement | null>(null);
const fileName = ref('');
const fileSize = ref(0);
const isAnalyzing = ref(false);
const progress = ref(0);
const analysisComplete = ref(false);
const search = ref('');

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
const startDate = ref<string>(''); // 开始日期
const endDate = ref<string>(''); // 结束日期
const rankStartDate = ref<string>(''); // 查询排行的开始日期
const rankEndDate = ref<string>(''); // 查询排行的结束日期
const rankUserFilter = ref(''); // 查询排行的用户筛选
const uniqueUsers = ref<string[]>([]);

// 表格头部定义
const headers = ref([
  {
    title: '时间',
    key: 'timestamp',
    sortable: true,
    width: '130px'
  },
  {
    title: '用户@主机',
    key: 'userHost',
    sortable: true,
    width: '220px'
  },
  {
    title: '查询时间',
    key: 'queryTime',
    sortable: true,
    width: '120px'
  },
  {
    title: '锁定时间',
    key: 'lockTime',
    sortable: true,
    width: '120px'
  },
  {
    title: '发送行数',
    key: 'rowsSent',
    sortable: true,
    width: '120px'
  },
  {
    title: '查询语句',
    key: 'sql',
    sortable: false,
    width: '300px'
  }
]);

const rankHeaders = ref([
  {
    title: 'SQL摘要',
    key: 'sampleSql',
    sortable: false,
    width: '250px'
  },
  {
    title: '用户',
    key: 'primaryUser',
    sortable: true,
    width: '150px'
  },
  {
    title: '调用次数',
    key: 'count',
    sortable: true,
    width: '100px'
  },
  {
    title: '总锁定时间',
    key: 'lockTime',
    sortable: true,
    width: '120px'
  },
  {
    title: '总返回记录',
    key: 'rowsSent',
    sortable: true,
    width: '120px'
  },
  {
    title: '总查询时间',
    key: 'queryTime',
    sortable: true,
    width: '120px'
  },
  {
    title: '平均锁定时间',
    key: 'avgLockTime',
    sortable: true,
    width: '120px'
  },
  {
    title: '平均返回记录',
    key: 'avgRowsSent',
    sortable: true,
    width: '120px'
  },
  {
    title: '平均查询时间',
    key: 'avgQueryTime',
    sortable: true,
    width: '120px'
  }
]);

// 日期范围筛选辅助函数
function isDateInRange(timestamp: string, startDate: string, endDate: string): boolean {
  if (!startDate && !endDate) return true;

  try {
    const queryDate = new Date(timestamp);
    if (isNaN(queryDate.getTime())) return true; // 无效日期，不过滤

    // 只比较日期部分，忽略时间
    const queryDateOnly = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate());

    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      if (isNaN(start.getTime())) return true; // 无效日期，不过滤
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      if (queryDateOnly < startDateOnly) return false;
    }

    if (endDate) {
      const end = new Date(endDate + 'T23:59:59');
      if (isNaN(end.getTime())) return true; // 无效日期，不过滤
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      if (queryDateOnly > endDateOnly) return false;
    }

    return true;
  } catch (e) {
    // 解析失败，不过滤
    return true;
  }
}

// 计算属性
const rankedQueries = computed(() => {
  // 先进行日期范围筛选和用户筛选
  let filteredQueries = [...queries.value];

  // 日期范围筛选
  filteredQueries = filteredQueries.filter(q =>
      isDateInRange(q.timestamp, rankStartDate.value, rankEndDate.value)
  );

  // 用户筛选
  if (rankUserFilter.value) {
    filteredQueries = filteredQueries.filter(q => q.userHost.startsWith(rankUserFilter.value));
  }

  const queryGroups: Record<string, RankedQuery & { userCounts: Record<string, number> }> = {};

  filteredQueries.forEach(query => {
    const simplifiedSql = query.sql
        .replace(/\/\*.*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const sqlHash = hashString(simplifiedSql);

    // 提取用户名
    const userMatch = query.userHost.match(/^([^\[]+)/);
    const userName = userMatch && userMatch[1] ? userMatch[1] : query.userHost;

    if (!queryGroups[sqlHash]) {
      queryGroups[sqlHash] = {
        sqlHash,
        sampleSql: query.sql,
        count: 0,
        lockTime: 0,
        rowsSent: 0,
        queryTime: 0,
        avgLockTime: 0,
        avgRowsSent: 0,
        avgQueryTime: 0,
        users: [],
        primaryUser: '',
        userCounts: {}
      };
    }

    const group = queryGroups[sqlHash];
    group.count++;
    group.lockTime += query.lockTime;
    group.rowsSent += query.rowsSent;
    group.queryTime += query.queryTime;

    // 统计用户
    if (!group.userCounts[userName]) {
      group.userCounts[userName] = 0;
      group.users.push(userName);
    }
    group.userCounts[userName]++;
  });

  // 计算平均值和主要用户
  Object.values(queryGroups).forEach(group => {
    group.avgLockTime = group.lockTime / group.count;
    group.avgRowsSent = group.rowsSent / group.count;
    group.avgQueryTime = group.queryTime / group.count;

    // 找出执行次数最多的用户
    let maxCount = 0;
    let primaryUser = '';
    for (const [user, count] of Object.entries(group.userCounts)) {
      if (count > maxCount) {
        maxCount = count;
        primaryUser = user;
      }
    }
    group.primaryUser = primaryUser || (group.users.length > 0 ? group.users[0] : '');

    // 如果有多个用户，在主要用户后显示数量
    if (group.users.length > 1) {
      group.primaryUser += ` (${group.users.length}个用户)`;
    }

    // 清理临时属性
    delete (group as any).userCounts;
  });

  return Object.values(queryGroups) as RankedQuery[];
});

const filteredQueries = computed(() => {
  let result = [...queries.value];

  // 日期范围过滤
  result = result.filter(q =>
      isDateInRange(q.timestamp, startDate.value, endDate.value)
  );

  // 用户过滤
  if (userFilter.value) {
    result = result.filter(q => q.userHost.startsWith(userFilter.value));
  }

  return result;
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

function getQueryIndex(query: QueryLog): number {
  return queries.value.indexOf(query);
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
  } catch (err) {
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
  search.value = '';
  startDate.value = '';
  endDate.value = '';
  userFilter.value = '';
}

function resetRankFilters() {
  rankStartDate.value = '';
  rankEndDate.value = '';
  rankUserFilter.value = '';
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function extractUniqueUsers() {
  const users = new Set<string>();
  queries.value.forEach(query => {
    const match = query.userHost.match(/^([^\[]+)/);
    if (match && match[1]) {
      users.add(match[1]);
    }
  });
  uniqueUsers.value = Array.from(users).sort();
}

// 图表实例
const timeDistributionChart = ref<HTMLCanvasElement | null>(null);
const queryTypeChart = ref<HTMLCanvasElement | null>(null);
let timeChartInstance: Chart | null = null;
let typeChartInstance: Chart | null = null;

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

  // 查询时间分布图表 - 水平条形图
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
              'rgba(59, 130, 246, 0.7)',
              'rgba(16, 185, 129, 0.7)',
              'rgba(245, 158, 11, 0.7)',
              'rgba(239, 68, 68, 0.7)',
              'rgba(139, 92, 246, 0.7)'
            ],
            borderWidth: 0,
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {display: false},
            tooltip: {
              callbacks: {
                label: (context) => `${context.parsed.x} 次查询`
              }
            }
          },
          scales: {
            x: {
              grid: {display: false},
              ticks: {padding: 5}
            },
            y: {
              grid: {display: false},
              ticks: {padding: 10}
            }
          }
        }
      });
    }
  }

  // 查询类型分布图表 - 环形图
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

      // 过滤掉数量为0的类型
      const labels = Object.keys(typeCounts).filter(k => typeCounts[k] > 0);
      const data = labels.map(k => typeCounts[k]);
      const backgroundColors = [
        'rgba(59, 130, 246, 0.7)',
        'rgba(16, 185, 129, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(239, 68, 68, 0.7)',
        'rgba(139, 92, 246, 0.7)'
      ].slice(0, labels.length);

      typeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: backgroundColors,
            borderWidth: 0,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 12,
                padding: 12,
                usePointStyle: true
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = Math.round((context.parsed / total) * 100);
                  return `${context.label}: ${context.parsed} (${percentage}%)`;
                }
              }
            }
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
    extractUniqueUsers();
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

// ===== 导出相关 =====
function exportRankToCSV() {
  const header = ['SQL摘要', '用户', '调用次数', '总锁定时间(s)', '总返回记录', '总查询时间(s)', '平均锁定时间(s)', '平均返回记录', '平均查询时间(s)'];
  const rows = rankedQueries.value.map(r => [
    sanitizeForCSV(r.sampleSql),
    r.primaryUser,
    r.count,
    r.lockTime.toFixed(3),
    r.rowsSent,
    r.queryTime.toFixed(3),
    r.avgLockTime.toFixed(3),
    r.avgRowsSent.toFixed(0),
    r.avgQueryTime.toFixed(3)
  ]);
  downloadCSV('mysql_slowlog_rank.csv', header, rows);
}

function exportDetailToCSV() {
  const header = ['时间', '用户@主机', '查询时间(s)', '锁定时间(s)', '发送行数', '查询语句'];
  const rows = filteredQueries.value.map(q => [
    formatDate(q.timestamp),
    q.userHost,
    q.queryTime.toFixed(3),
    q.lockTime.toFixed(3),
    q.rowsSent.toString(),
    sanitizeForCSV(q.sql)
  ]);
  downloadCSV('mysql_slowlog_detail.csv', header, rows);
}

function sanitizeForCSV(text: string): string {
  const value = (text ?? '').toString().replace(/\r/g, '').replace(/\n/g, ' ');
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCSV(filename: string, headersRow: (string | number)[], rows: (string | number)[][]) {
  const lines: string[] = [];
  lines.push(headersRow.map(v => sanitizeForCSV(String(v))).join(','));
  for (const row of rows) {
    lines.push(row.map(v => sanitizeForCSV(String(v))).join(','));
  }
  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
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

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 添加固定宽度表格样式 */
.fixed-width-table {
  table-layout: fixed;
  width: 100%;
}

.fixed-width-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.fixed-width-table :deep(th),
.fixed-width-table :deep(td) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.fixed-width-table :deep(.v-data-table__td) {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 确保表头也固定宽度 */
.fixed-width-table :deep(.v-data-table__thead th) {
  position: sticky;
  top: 0;
  background-color: white;
  z-index: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 为特定列设置最小宽度 */
.fixed-width-table :deep(th:nth-child(1)),
.fixed-width-table :deep(td:nth-child(1)) {
  width: 180px;
  min-width: 180px;
}

.fixed-width-table :deep(th:nth-child(2)),
.fixed-width-table :deep(td:nth-child(2)) {
  width: 150px;
  min-width: 150px;
}

.fixed-width-table :deep(th:nth-child(3)),
.fixed-width-table :deep(td:nth-child(3)) {
  width: 120px;
  min-width: 120px;
}

.fixed-width-table :deep(th:nth-child(4)),
.fixed-width-table :deep(td:nth-child(4)) {
  width: 120px;
  min-width: 120px;
}

.fixed-width-table :deep(th:nth-child(5)),
.fixed-width-table :deep(td:nth-child(5)) {
  width: 120px;
  min-width: 120px;
}

.fixed-width-table :deep(th:nth-child(6)),
.fixed-width-table :deep(td:nth-child(6)) {
  width: 300px;
  min-width: 300px;
}

/* 查询排行表格的特殊列宽 */
.fixed-width-table.rank-table :deep(th:nth-child(1)),
.fixed-width-table.rank-table :deep(td:nth-child(1)) {
  width: 250px;
  min-width: 250px;
}

.fixed-width-table.rank-table :deep(th:nth-child(2)),
.fixed-width-table.rank-table :deep(td:nth-child(2)) {
  width: 100px;
  min-width: 100px;
}

.fixed-width-table.rank-table :deep(th:nth-child(3)),
.fixed-width-table.rank-table :deep(td:nth-child(3)),
.fixed-width-table.rank-table :deep(th:nth-child(4)),
.fixed-width-table.rank-table :deep(td:nth-child(4)),
.fixed-width-table.rank-table :deep(th:nth-child(5)),
.fixed-width-table.rank-table :deep(td:nth-child(5)),
.fixed-width-table.rank-table :deep(th:nth-child(6)),
.fixed-width-table.rank-table :deep(td:nth-child(6)),
.fixed-width-table.rank-table :deep(th:nth-child(7)),
.fixed-width-table.rank-table :deep(td:nth-child(7)),
.fixed-width-table.rank-table :deep(th:nth-child(8)),
.fixed-width-table.rank-table :deep(td:nth-child(8)) {
  width: 120px;
  min-width: 120px;
}

/* 排序按钮样式 */
.fixed-width-table :deep(.v-data-table-header__sort-badge) {
  font-size: 12px;
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

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
