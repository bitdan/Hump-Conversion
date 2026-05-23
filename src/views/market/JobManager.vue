<template>
  <div class="job-manager">
    <div class="page-header">
      <div>
        <h1>任务管理</h1>
        <p>手动执行后台任务，填写参数并查看运行结果。</p>
      </div>
      <v-btn variant="tonal" prepend-icon="mdi-refresh" :loading="loadingRuns" @click="loadRuns">
        刷新记录
      </v-btn>
    </div>

    <v-alert v-if="error" type="warning" variant="tonal" density="comfortable" class="mb-4">
      {{ error }}
    </v-alert>

    <div class="job-layout">
      <v-card class="panel-card" variant="flat">
        <div class="panel-head">
          <h2>执行任务</h2>
          <v-chip v-if="selectedJob" color="primary" variant="tonal">{{ selectedJob.name }}</v-chip>
        </div>

        <v-select
            v-model="selectedJobId"
            :items="jobs"
            item-title="name"
            item-value="id"
            label="任务"
            density="comfortable"
            variant="outlined"
            hide-details
        />

        <p v-if="selectedJob" class="job-desc">{{ selectedJob.description }}</p>

        <div v-if="selectedJob" class="param-grid">
          <template v-for="param in selectedJob.params" :key="param.key">
            <v-select
                v-if="param.type === 'select'"
                v-model="form[param.key]"
                :items="param.options || []"
                :label="param.label"
                density="comfortable"
                variant="outlined"
                hide-details
            />
            <v-text-field
                v-else
                v-model="form[param.key]"
                :type="param.type"
                :label="param.label"
                :placeholder="param.placeholder"
                density="comfortable"
                variant="outlined"
                hide-details
            />
          </template>
        </div>

        <div class="action-row">
          <v-btn color="primary" prepend-icon="mdi-play" :loading="submitting" @click="submitRun">
            执行
          </v-btn>
          <v-btn variant="text" @click="resetForm">清空参数</v-btn>
        </div>
      </v-card>

      <v-card class="panel-card" variant="flat">
        <div class="panel-head">
          <h2>最近运行</h2>
          <span>{{ runs.length }} 条</span>
        </div>
        <v-data-table
            :headers="runHeaders"
            :items="runs"
            :loading="loadingRuns"
            density="compact"
            item-value="run_id"
            fixed-header
            height="620"
        >
          <template #item.status="{ item }">
            <v-chip size="small" :color="statusColor(item.status)" variant="tonal">
              {{ statusText(item.status) }}
            </v-chip>
          </template>
          <template #item.params="{ item }">
            <code class="params-text">{{ formatParams(item.params) }}</code>
          </template>
          <template #item.progress="{ item }">
            {{ item.success_count }}/{{ item.total_codes || '-' }}
          </template>
          <template #item.created_at="{ item }">
            {{ formatTime(item.created_at) }}
          </template>
          <template #item.message="{ item }">
            <span class="message-text">{{ item.message || '-' }}</span>
          </template>
        </v-data-table>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, reactive, ref, watch} from 'vue'
import {getJobRuns, getJobs, runJob, type JobDefinition, type JobRunRecord} from '@/api/jobManager'

const jobs = ref<JobDefinition[]>([])
const runs = ref<JobRunRecord[]>([])
const selectedJobId = ref('')
const loadingJobs = ref(false)
const loadingRuns = ref(false)
const submitting = ref(false)
const error = ref('')
const form = reactive<Record<string, any>>({})

const selectedJob = computed(() => jobs.value.find(item => item.id === selectedJobId.value) || null)

const runHeaders = [
  {title: '任务', key: 'job_name', minWidth: 150},
  {title: '状态', key: 'status', width: 92},
  {title: '参数', key: 'params', minWidth: 220},
  {title: '进度', key: 'progress', width: 90},
  {title: '写入行', key: 'saved_rows', width: 90},
  {title: '失败', key: 'failed_count', width: 74},
  {title: '提交时间', key: 'created_at', width: 160},
  {title: '消息', key: 'message', minWidth: 180}
]

watch(selectedJob, (job) => {
  resetForm()
  if (!job) return
  for (const param of job.params) {
    if (param.key === 'adjust') form[param.key] = 'qfq'
    if (param.key === 'sleep') form[param.key] = 0.05
  }
})

async function loadJobs() {
  loadingJobs.value = true
  error.value = ''
  try {
    const response = await getJobs()
    jobs.value = response.data
    if (!selectedJobId.value && jobs.value.length) {
      selectedJobId.value = jobs.value[0].id
    }
  } catch (err: any) {
    error.value = err?.response?.data?.detail || err?.message || '任务列表加载失败'
  } finally {
    loadingJobs.value = false
  }
}

async function loadRuns() {
  loadingRuns.value = true
  error.value = ''
  try {
    const response = await getJobRuns(100)
    runs.value = response.data
  } catch (err: any) {
    error.value = err?.response?.data?.detail || err?.message || '运行记录加载失败'
  } finally {
    loadingRuns.value = false
  }
}

async function submitRun() {
  if (!selectedJobId.value) return
  submitting.value = true
  error.value = ''
  try {
    await runJob(selectedJobId.value, compactParams(form))
    await loadRuns()
  } catch (err: any) {
    error.value = err?.response?.data?.detail || err?.message || '任务提交失败'
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  for (const key of Object.keys(form)) {
    delete form[key]
  }
}

function compactParams(values: Record<string, any>) {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(values)) {
    if (value !== '' && value != null) {
      result[key] = value
    }
  }
  return result
}

function formatParams(params: Record<string, any>) {
  return Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ')
}

function statusColor(status: string) {
  if (status === 'success') return 'green'
  if (status === 'failed') return 'red'
  if (status === 'running') return 'primary'
  return 'grey'
}

function statusText(status: string) {
  if (status === 'success') return '成功'
  if (status === 'failed') return '失败'
  if (status === 'running') return '运行中'
  if (status === 'queued') return '排队'
  return status
}

function formatTime(value?: string | null) {
  if (!value) return '-'
  return value.replace('T', ' ')
}

onMounted(async () => {
  await loadJobs()
  await loadRuns()
})
</script>

<style scoped>
.job-manager {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
  color: #0f172a;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.page-header h1 {
  margin: 0 0 6px;
  font-size: 28px;
  line-height: 1.2;
}

.page-header p,
.job-desc,
.panel-head span {
  margin: 0;
  color: #64748b;
}

.job-layout {
  display: grid;
  grid-template-columns: minmax(320px, 430px) minmax(0, 1fr);
  gap: 14px;
}

.panel-card {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-head h2 {
  margin: 0;
  font-size: 18px;
}

.job-desc {
  margin-top: 10px;
  font-size: 13px;
}

.param-grid {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.action-row {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.params-text {
  display: block;
  overflow: hidden;
  max-width: 360px;
  color: #334155;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-text {
  display: block;
  overflow: hidden;
  max-width: 320px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 960px) {
  .job-manager {
    padding: 16px;
  }

  .page-header,
  .job-layout {
    display: flex;
    flex-direction: column;
  }
}
</style>
