<template>
  <ToolPageLayout theme="dark" :card="false" max-width="max-w-7xl">
    <div class="mcp-tester-shell">
    <section class="hero-panel">
      <div>
        <p class="eyebrow">Tool Hub MCP Playground</p>
        <h1 class="hero-title">SSE MCP Tester</h1>
        <p class="hero-copy">
          连接本地 MCP SSE 服务，自动初始化协议，列出工具，并直接发起 `tools/call` 调试。
        </p>
      </div>
      <div class="hero-badges">
        <span class="hero-badge">SSE</span>
        <span class="hero-badge">JSON-RPC</span>
        <span class="hero-badge">Java Stacktrace</span>
      </div>
    </section>

    <div class="tester-grid">
      <section class="panel panel-connection">
        <div class="panel-header">
          <h2>连接</h2>
          <span :class="['status-pill', connectionStateClass]">{{ connectionStateLabel }}</span>
        </div>

        <v-text-field
          v-model="sseUrl"
          label="SSE 地址"
          variant="outlined"
          density="comfortable"
          hint="默认连接本地 FastAPI 的 /mcp/java/sse"
          persistent-hint
        />

        <div class="button-row">
          <v-btn color="primary" :loading="connecting" @click="connect">连接并初始化</v-btn>
          <v-btn variant="outlined" :disabled="!eventSource" @click="disconnect">断开</v-btn>
          <v-btn variant="outlined" :disabled="!messageEndpoint" @click="loadTools">刷新工具列表</v-btn>
        </div>

        <div class="endpoint-box">
          <div class="endpoint-label">Messages Endpoint</div>
          <code>{{ messageEndpoint || '等待 endpoint 事件...' }}</code>
        </div>

        <v-textarea
          v-model="serverInfoText"
          label="握手结果"
          variant="outlined"
          rows="8"
          auto-grow
          readonly
        />
      </section>

      <section class="panel panel-tools">
        <div class="panel-header">
          <h2>工具</h2>
          <span class="soft-tag">{{ tools.length }} 个</span>
        </div>

        <v-select
          v-model="selectedToolName"
          :items="toolOptions"
          label="选择工具"
          variant="outlined"
          density="comfortable"
          :disabled="tools.length === 0"
        />

        <v-textarea
          v-model="toolSchemaText"
          label="输入 Schema"
          variant="outlined"
          rows="10"
          auto-grow
          readonly
        />

        <v-textarea
          v-model="toolArguments"
          :label="toolArgumentsLabel"
          variant="outlined"
          rows="12"
          auto-grow
          :hint="toolArgumentsHint"
          persistent-hint
        />

        <div class="button-row">
          <v-btn color="primary" :disabled="!canCallTool" :loading="calling" @click="callTool">调用工具</v-btn>
          <v-btn variant="outlined" @click="resetToolArguments">重置参数</v-btn>
        </div>
      </section>
    </div>

    <div class="tester-grid bottom-grid">
      <section class="panel">
        <div class="panel-header">
          <h2>调用结果</h2>
          <v-btn size="small" variant="text" :disabled="!resultText" @click="copy(resultText)">复制</v-btn>
        </div>
        <pre class="result-pre">{{ resultText || '等待调用结果...' }}</pre>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>事件日志</h2>
          <v-btn size="small" variant="text" :disabled="logs.length === 0" @click="logs = []">清空</v-btn>
        </div>
        <div class="log-list">
          <div v-for="entry in logs" :key="entry.id" class="log-item">
            <div class="log-meta">
              <span>{{ entry.time }}</span>
              <span :class="['log-kind', `log-kind-${entry.kind}`]">{{ entry.kind }}</span>
            </div>
            <pre>{{ entry.message }}</pre>
          </div>
        </div>
      </section>
    </div>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'
import {useMessage} from '@/composables/useMessage'

interface McpLogEntry {
  id: number
  time: string
  kind: 'info' | 'send' | 'receive' | 'error'
  message: string
}

interface McpToolDefinition {
  name: string
  description: string
  inputSchema?: Record<string, any>
}

const { showError, showSuccess, showWarning } = useMessage()

const defaultSseUrl = `${window.location.protocol}//${window.location.hostname}:8000/mcp/java/sse`

const sseUrl = ref(defaultSseUrl)
const serverInfoText = ref('')
const toolArguments = ref(JSON.stringify({
  stacktrace: 'java.lang.NullPointerException: Cannot invoke "com.example.demo.service.UserService.getUserById(java.lang.Long)" because "this.userService" is null\n    at com.example.demo.controller.UserController.getUser(UserController.java:32)',
  context: 'Spring Boot 接口调用时报错'
}, null, 2))
const resultText = ref('')
const logs = ref<McpLogEntry[]>([])
const tools = ref<McpToolDefinition[]>([])
const selectedToolName = ref('')
const messageEndpoint = ref('')
const eventSource = ref<EventSource | null>(null)
const connecting = ref(false)
const calling = ref(false)
const initialized = ref(false)
const messageCounter = ref(1)
const pendingResponses = new Map<number, any>()

const pendingRequests = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>()

const toolOptions = computed(() => tools.value.map(tool => ({
  title: tool.name,
  value: tool.name,
})))

const selectedTool = computed(() => tools.value.find(tool => tool.name === selectedToolName.value) || null)

const toolSchemaText = computed(() => {
  if (!selectedTool.value?.inputSchema) {
    return ''
  }
  return JSON.stringify(selectedTool.value.inputSchema, null, 2)
})

const canCallTool = computed(() => Boolean(messageEndpoint.value && initialized.value && selectedToolName.value))

const isJavaStacktraceTool = computed(() => selectedToolName.value === 'analyze_java_stacktrace_tool')

const toolArgumentsLabel = computed(() => isJavaStacktraceTool.value ? '调用参数 / 原生堆栈' : '调用参数 JSON')

const toolArgumentsHint = computed(() => {
  if (isJavaStacktraceTool.value) {
    return '支持直接粘贴原生 Java 堆栈；如果不是 JSON，会自动包装为 { "stacktrace": "..." }'
  }
  return '请输入合法 JSON'
})

const connectionStateClass = computed(() => {
  if (eventSource.value && initialized.value) {
    return 'status-ready'
  }
  if (connecting.value) {
    return 'status-connecting'
  }
  return 'status-idle'
})

const connectionStateLabel = computed(() => {
  if (eventSource.value && initialized.value) {
    return '已连接'
  }
  if (connecting.value) {
    return '连接中'
  }
  return '未连接'
})

function addLog(kind: McpLogEntry['kind'], message: string) {
  logs.value.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    time: new Date().toLocaleTimeString(),
    kind,
    message,
  })
}

function safeJson(value: any) {
  return JSON.stringify(value, null, 2)
}

function disconnect() {
  if (eventSource.value) {
    eventSource.value.close()
    eventSource.value = null
  }
  messageEndpoint.value = ''
  initialized.value = false
  tools.value = []
  selectedToolName.value = ''
  serverInfoText.value = ''
  pendingRequests.forEach(({ reject }) => reject(new Error('Connection closed')))
  pendingRequests.clear()
  addLog('info', '连接已关闭')
}

async function connect() {
  disconnect()
  connecting.value = true
  resultText.value = ''
  try {
    const es = new EventSource(sseUrl.value)
    eventSource.value = es

    es.addEventListener('endpoint', async (event: MessageEvent) => {
      messageEndpoint.value = event.data
      addLog('receive', `endpoint => ${event.data}`)
      try {
        const initResult = await sendRpc('initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'tool-hub-mcp-tester',
            version: '1.0.0',
          },
        })
        serverInfoText.value = safeJson(initResult)
        await sendNotification('notifications/initialized', {})
        initialized.value = true
        showSuccess('MCP 初始化完成')
        await loadTools()
      } catch (error: any) {
        showError(error?.message || '初始化失败')
      } finally {
        connecting.value = false
      }
    })

    es.addEventListener('message', (event: MessageEvent) => {
      addLog('receive', event.data)
      try {
        const payload = JSON.parse(event.data)
        if (payload.id != null && pendingRequests.has(payload.id)) {
          const promise = pendingRequests.get(payload.id)!
          pendingRequests.delete(payload.id)
          if (payload.error) {
            promise.reject(new Error(payload.error.message || 'MCP request failed'))
          } else {
            promise.resolve(payload.result)
          }
        } else if (payload.id != null) {
          pendingResponses.set(payload.id, payload)
        }
      } catch (error: any) {
        addLog('error', `解析 message 事件失败: ${error?.message || error}`)
      }
    })

    es.onerror = () => {
      addLog('error', 'SSE 连接发生错误')
      showWarning('SSE 连接发生错误，请检查后端服务和地址')
      connecting.value = false
    }

    es.onopen = () => {
      addLog('info', `SSE 已连接: ${sseUrl.value}`)
    }
  } catch (error: any) {
    connecting.value = false
    showError(error?.message || '连接失败')
  }
}

async function sendNotification(method: string, params: Record<string, any>) {
  if (!messageEndpoint.value) {
    throw new Error('message endpoint 未就绪')
  }
  const payload = {
    jsonrpc: '2.0',
    method,
    params,
  }
  addLog('send', safeJson(payload))
  await fetch(messageEndpoint.value, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

async function sendRpc(method: string, params: Record<string, any>) {
  if (!messageEndpoint.value) {
    throw new Error('message endpoint 未就绪')
  }
  const id = messageCounter.value++
  const payload = {
    jsonrpc: '2.0',
    id,
    method,
    params,
  }
  addLog('send', safeJson(payload))

  const responsePromise = new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject })
    window.setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        reject(new Error(`MCP request timeout: ${method}`))
      }
    }, 8000)
  })

  const response = await fetch(messageEndpoint.value, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    pendingRequests.delete(id)
    throw new Error(`HTTP ${response.status}`)
  }

  if (pendingResponses.has(id)) {
    const payload = pendingResponses.get(id)
    pendingResponses.delete(id)
    pendingRequests.delete(id)
    if (payload.error) {
      throw new Error(payload.error.message || 'MCP request failed')
    }
    return payload.result
  }

  return responsePromise
}

async function loadTools() {
  if (!initialized.value) {
    showWarning('请先建立连接并完成初始化')
    return
  }
  try {
    const result = await sendRpc('tools/list', {})
    tools.value = result.tools || []
    if (!selectedToolName.value && tools.value.length > 0) {
      selectedToolName.value = tools.value[0].name
    }
    showSuccess('工具列表已刷新')
  } catch (error: any) {
    showError(error?.message || '获取工具列表失败')
  }
}

function resetToolArguments() {
  if (isJavaStacktraceTool.value) {
    toolArguments.value = JSON.stringify({
      stacktrace: 'java.lang.NullPointerException: Cannot invoke "com.example.demo.service.UserService.getUserById(java.lang.Long)" because "this.userService" is null\n    at com.example.demo.controller.UserController.getUser(UserController.java:32)',
      context: 'Spring Boot 接口调用时报错'
    }, null, 2)
    return
  }
  if (selectedToolName.value === 'sql_exporter_tool') {
    toolArguments.value = JSON.stringify({
      db_kind: 'sqlite',
      db_path: 'D:/java/leetcode/skills/nl-to-sql-executor/tmp_demo.sqlite',
      sql: 'SELECT name FROM sqlite_master ORDER BY name LIMIT 20',
      export: 'json',
      output: 'D:/java/leetcode/skills/sql-exporter/tmp/mcp-result.json',
      max_rows: 100
    }, null, 2)
    return
  }
  if (selectedToolName.value === 'nl_to_sql_generator_tool') {
    toolArguments.value = JSON.stringify({
      question: '近30天销量最高的10个SKU',
      account: 'QD-US'
    }, null, 2)
    return
  }
  if (selectedToolName.value === 'leetcode_coach_tool') {
    toolArguments.value = JSON.stringify({
      title: 'Two Sum',
      problem_statement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      constraints: [
        '2 <= nums.length <= 10^4',
        '-10^9 <= nums[i] <= 10^9'
      ],
      examples: [
        'Input: nums = [2,7,11,15], target = 9 Output: [0,1]'
      ],
      code: 'class Solution {\n  public int[] twoSum(int[] nums, int target) {\n    for (int i = 0; i < nums.length; i++) {\n    }\n    return new int[0];\n  }\n}',
      language: 'java',
      user_question: '我知道暴力解，但不知道怎么优化到 O(n)',
      mode: 'hint'
    }, null, 2)
    return
  }
  toolArguments.value = '{}'
}

function buildStacktraceArgsFromRawInput(rawInput: string) {
  const normalized = rawInput.replace(/\r\n/g, '\n').trim()
  if (!normalized) {
    throw new Error('请输入堆栈内容或合法 JSON')
  }
  return {
    stacktrace: normalized,
  }
}

function parseToolArguments(rawInput: string) {
  try {
    return JSON.parse(rawInput || '{}')
  } catch (error: any) {
    if (isJavaStacktraceTool.value) {
      return buildStacktraceArgsFromRawInput(rawInput)
    }
    throw error
  }
}

async function callTool() {
  if (!selectedToolName.value) {
    showWarning('请先选择工具')
    return
  }

  let args: Record<string, any>
  try {
    args = parseToolArguments(toolArguments.value)
  } catch (error: any) {
    const message = error?.message || error
    showError(isJavaStacktraceTool.value ? `参数解析失败: ${message}` : `参数 JSON 非法: ${message}`)
    return
  }

  calling.value = true
  resultText.value = ''
  try {
    const result = await sendRpc('tools/call', {
      name: selectedToolName.value,
      arguments: args,
    })
    resultText.value = safeJson(result?.structuredContent ?? result)
    showSuccess('工具调用成功')
  } catch (error: any) {
    showError(error?.message || '工具调用失败')
  } finally {
    calling.value = false
  }
}

async function copy(text: string) {
  if (!text) {
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    showSuccess('已复制到剪贴板')
  } catch {
    showError('复制失败')
  }
}

watch(selectedToolName, () => {
  resetToolArguments()
})

onBeforeUnmount(() => {
  disconnect()
})
</script>

<style scoped>
.mcp-tester-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(15, 118, 110, 0.18), transparent 24%),
    radial-gradient(circle at top right, rgba(14, 116, 144, 0.18), transparent 24%),
    linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%);
  padding: 20px;
}

.hero-panel,
.panel {
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 12px;
}

.hero-title {
  margin: 0;
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.05;
  color: #0f172a;
}

.hero-copy {
  max-width: 760px;
  margin: 14px 0 0;
  color: #475569;
  font-size: 15px;
  line-height: 1.7;
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 10px;
}

.hero-badge,
.soft-tag,
.status-pill,
.log-kind {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.hero-badge {
  padding: 10px 14px;
  background: #0f172a;
  color: #f8fafc;
}

.tester-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.bottom-grid {
  margin-top: 20px;
}

.panel {
  padding: 24px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
}

.soft-tag {
  padding: 6px 12px;
  background: #dbeafe;
  color: #1d4ed8;
}

.status-pill {
  padding: 6px 12px;
}

.status-idle {
  background: #e2e8f0;
  color: #475569;
}

.status-connecting {
  background: #fef3c7;
  color: #b45309;
}

.status-ready {
  background: #dcfce7;
  color: #15803d;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.endpoint-box {
  padding: 14px 16px;
  margin-bottom: 16px;
  border-radius: 16px;
  background: #0f172a;
  color: #e2e8f0;
}

.endpoint-label {
  margin-bottom: 8px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.endpoint-box code {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 13px;
}

.result-pre,
.log-item pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.6;
}

.result-pre {
  min-height: 320px;
  padding: 16px;
  border-radius: 18px;
  background: #0f172a;
  color: #e2e8f0;
}

.log-list {
  display: grid;
  gap: 12px;
  max-height: 520px;
  overflow: auto;
}

.log-item {
  padding: 14px 16px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.log-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: #64748b;
  font-size: 12px;
}

.log-kind {
  padding: 4px 10px;
}

.log-kind-info {
  background: #e2e8f0;
  color: #334155;
}

.log-kind-send {
  background: #dbeafe;
  color: #1d4ed8;
}

.log-kind-receive {
  background: #dcfce7;
  color: #15803d;
}

.log-kind-error {
  background: #fee2e2;
  color: #b91c1c;
}

@media (max-width: 1024px) {
  .tester-grid {
    grid-template-columns: 1fr;
  }

  .hero-panel {
    flex-direction: column;
  }
}
</style>
