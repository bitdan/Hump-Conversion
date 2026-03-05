<template>
  <div class="min-h-screen bg-slate-100 p-4 md:p-8">
    <div class="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-sm md:p-8">
      <h1 class="text-2xl font-bold text-slate-900">Amazon 分析 SQL 生成器</h1>
      <p class="mt-2 text-sm text-slate-600">
        按固定安全规则把自然语言问题转换为 MySQL 5.7 查询 JSON。
      </p>

      <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <v-text-field
            v-model="form.account"
            label="account"
            placeholder="例如：QD-US"
            variant="outlined"
            density="comfortable"
            hide-details
        />
      </div>

      <div class="mt-4">
        <v-textarea
            v-model="form.question"
            label="用户问题"
            variant="outlined"
            rows="5"
            auto-grow
            placeholder="例如：近30天销量最高的10个SKU"
        />
      </div>

      <div class="mt-2 flex flex-wrap gap-3">
        <v-btn color="primary" :loading="loading" @click="handleGenerate">生成 SQL</v-btn>
        <v-btn variant="outlined" @click="handleReset">重置</v-btn>
        <v-btn variant="outlined" :disabled="!resultText" @click="copyResult">复制 JSON</v-btn>
      </div>

      <div class="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-700">结果</h2>
          <span class="text-xs text-slate-500">仅展示后端返回 JSON</span>
        </div>
        <pre class="overflow-x-auto whitespace-pre-wrap break-all text-sm leading-6 text-slate-800">{{
            resultText || defaultHint
          }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {generateMysqlAnalysisSql, type SqlGeneratorResponse} from '@/api/sqlGenerator'
import {useMessage} from '@/composables/useMessage'

const {showError, showSuccess} = useMessage()

const loading = ref(false)
const result = ref<SqlGeneratorResponse | null>(null)

const form = ref({
  account: '',
  question: ''
})

const defaultHint = '点击“生成 SQL”后会返回 { sql, preview_sql, params, result_columns, explanation, tables }。'

const resultText = computed(() => {
  if (!result.value) {
    return ''
  }
  return JSON.stringify(result.value, null, 2)
})

async function handleGenerate() {
  if (!form.value.question.trim()) {
    showError('用户问题不能为空')
    return
  }
  if (!form.value.account.trim()) {
    showError('account 不能为空')
    return
  }

  loading.value = true
  try {
    const data = await generateMysqlAnalysisSql({
      account: form.value.account.trim(),
      question: form.value.question.trim()
    })
    result.value = data
    showSuccess('生成成功')
  } catch (err: any) {
    const message = err?.response?.data?.detail || err?.message || '生成失败'
    showError(message)
  } finally {
    loading.value = false
  }
}

function handleReset() {
  form.value = {
    account: '',
    question: ''
  }
  result.value = null
}

async function copyResult() {
  if (!resultText.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(resultText.value)
    showSuccess('JSON 已复制')
  } catch (err) {
    showError('复制失败，请手动复制')
  }
}
</script>
