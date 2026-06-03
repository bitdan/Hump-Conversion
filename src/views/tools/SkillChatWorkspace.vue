<template>
  <ToolPageLayout :card="false" hide-header density="workspace" theme="none" max-width="max-w-7xl">
    <div class="chat-shell">
    <header class="topbar">
      <div>
        <h1 class="topbar-title">Agent 任务工作台</h1>
        <p class="topbar-subtitle">描述目标并补充必要上下文，系统会按意图进入架构设计、代码诊断、算法辅导或 SQL 流程。</p>
      </div>
      <div class="topbar-actions">
        <v-btn size="small" variant="tonal" prepend-icon="mdi-robot-outline" @click="fillExample('agent')">
          Agent 设计
        </v-btn>
        <v-btn size="small" variant="tonal" prepend-icon="mdi-alert-circle-outline" @click="fillExample('stacktrace')">
          堆栈示例
        </v-btn>
        <v-btn size="small" variant="text" prepend-icon="mdi-delete-outline" :disabled="messages.length === 0"
               @click="messages = []">
          清空
        </v-btn>
      </div>
    </header>

    <main class="chat-main">
      <div class="chat-messages" ref="messageContainer">
        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-card">
            <div class="empty-icon">
              <v-icon icon="mdi-message-text-outline" size="28"/>
            </div>
            <h2>开始一段任务</h2>
            <p>输入目标、问题背景和已有材料，工作台会选择对应处理流程并保留结构化轨迹。</p>
            <div class="quick-actions">
              <v-btn variant="outlined" prepend-icon="mdi-robot-outline" @click="fillExample('agent')">
                Agent 设计
              </v-btn>
              <v-btn variant="outlined" prepend-icon="mdi-code-braces" @click="fillExample('leetcode')">
                算法题
              </v-btn>
              <v-btn variant="outlined" prepend-icon="mdi-alert-circle-outline" @click="fillExample('stacktrace')">
                异常堆栈
              </v-btn>
              <v-btn variant="outlined" prepend-icon="mdi-database-search-outline" @click="fillExample('sql')">
                SQL 生成
              </v-btn>
            </div>
          </div>
        </div>

        <div
            v-for="(msg, index) in messages"
            :key="index"
            class="message-row"
            :class="msg.role"
        >
          <div class="message-card">
            <div v-if="msg.role === 'assistant' && msg.route" class="message-meta">
              <span class="route-pill">{{ msg.title || msg.route }}</span>
            </div>
            <div class="message-bubble" v-html="msg.content"></div>
            <v-expansion-panels
                v-if="msg.role === 'assistant' && getTrace(msg).length > 0"
                class="trace-panels"
                variant="accordion"
            >
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon icon="mdi-timeline-clock-outline" size="16" class="mr-2"/>
                  执行轨迹
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <div class="trace-list">
                    <div v-for="(step, stepIndex) in getTrace(msg)" :key="stepIndex" class="trace-item">
                      <span class="trace-index">{{ stepIndex + 1 }}</span>
                      <div>
                        <div class="trace-node">{{ step.node || 'step' }}</div>
                        <div class="trace-detail">
                          {{ step.input_summary || '-' }} -> {{ step.output_summary || '-' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
        </div>
      </div>
    </main>

    <footer class="composer-shell">
      <div class="composer">
        <v-textarea
            v-model="userInput"
            auto-grow
            rows="1"
            max-rows="8"
            placeholder="描述目标，例如：如何实现 agent、分析这段堆栈、优化这道题、生成只读 SQL"
            variant="plain"
            class="composer-input"
            @keydown.ctrl.enter.prevent="submit"
        />
        <div class="composer-actions">
          <span class="composer-hint">{{ userInput.length }}/{{ 20000 }}</span>
          <v-btn color="primary" rounded="lg" prepend-icon="mdi-send" :loading="loading" @click="submit">
            发送
          </v-btn>
        </div>
      </div>
    </footer>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify'
import {nextTick, ref, watch} from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'
import {useMessage} from '../../composables/useMessage'
import {sendAgentChat} from '@/api/agentChat'

const {showSuccess, showError} = useMessage()

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  route?: string
  title?: string
  structuredContent?: Record<string, any>
}

const messages = ref<ChatMessage[]>([])
const userInput = ref('')
const loading = ref(false)
const messageContainer = ref<HTMLElement | null>(null)
const streamingToken = ref(0)

watch(messages, async () => {
  await nextTick()
  scrollToBottom()
})

function formatDraft(draft: string): string {
  const html = draft
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['br', 'pre', 'code', 'strong'],
    ALLOWED_ATTR: ['class']
  })
}

function scrollToBottom(): void {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getDelayForChar(char: string): number {
  if (char === '\n') return 30
  if (/[\.\!\?]/.test(char)) return 55
  if (/[,:;，。；：]/.test(char)) return 35
  return 8
}

async function typeWriter(
    fullText: string,
    onUpdate: (html: string) => void,
    tokenSnapshot: number
): Promise<void> {
  let buffer = ''
  for (let i = 0; i < fullText.length; i++) {
    if (tokenSnapshot !== streamingToken.value) return
    const ch = fullText[i]
    buffer += ch
    onUpdate(formatDraft(buffer))
    scrollToBottom()
    await delay(getDelayForChar(ch))
  }
}

function fillExample(type: 'agent' | 'leetcode' | 'stacktrace' | 'sql') {
  if (type === 'agent') {
    userInput.value = `如何实现 agent

我希望它能根据用户目标自动选择工具，支持读取项目代码、生成修改计划、必要时运行测试，并且前端能看到执行轨迹。`
    return
  }

  if (type === 'leetcode') {
    userInput.value = `Two Sum

Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

Constraints:
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9

我知道暴力解，但不知道怎么优化到 O(n)。

\`\`\`java
class Solution {
  public int[] twoSum(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++) {
    }
    return new int[0];
  }
}
\`\`\``
    return
  }

  if (type === 'sql') {
    userInput.value = `请生成只读 SQL：查询 US-CA 账号近30天销量最高的 SKU，返回 sku、销量、订单数和销售额。`
    return
  }

  userInput.value = `java.lang.NullPointerException: Cannot invoke "com.example.demo.service.UserService.getUserById(java.lang.Long)" because "this.userService" is null
    at com.example.demo.controller.UserController.getUser(UserController.java:32)
    at org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)
Caused by: java.lang.NullPointerException`
}

function getTrace(message: ChatMessage): Array<Record<string, any>> {
  const trace = message.structuredContent?.trace
  return Array.isArray(trace) ? trace : []
}

async function submit(): Promise<void> {
  if (!userInput.value.trim()) {
    showError('请输入内容')
    return
  }

  const input = userInput.value
  messages.value.push({
    role: 'user',
    content: formatDraft(input),
  })
  userInput.value = ''
  loading.value = true
  streamingToken.value += 1
  const currentToken = streamingToken.value

  try {
    const data = await sendAgentChat({
      message: input,
      history: [],
    })
    const assistantIndex = messages.value.push({
      role: 'assistant',
      content: '',
      route: data.route,
      title: data.title,
      structuredContent: data.structured_content,
    }) - 1

    await typeWriter(
        data.answer || '',
        (html) => {
          messages.value[assistantIndex].content = html
        },
        currentToken
    )
    showSuccess(`已自动使用 ${data.title}`)
  } catch (error) {
    console.error('Agent chat 调用失败:', error)
    showError('调用失败，请检查后端接口')
  } finally {
    if (currentToken === streamingToken.value) {
      loading.value = false
    }
  }
}
</script>

<style scoped>
.chat-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: calc(100vh - 112px);
  min-height: 640px;
  padding: 0;
  background: var(--color-bg);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.topbar-title {
  margin: 0;
  color: var(--color-text);
  font-size: 22px;
  line-height: 1.2;
}

.topbar-subtitle {
  margin: 6px 0 0;
  color: var(--color-text-muted);
  font-size: 14px;
}

.topbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chat-main {
  min-height: 0;
  margin-top: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  overflow: hidden;
}

.chat-messages {
  height: 100%;
  overflow-y: auto;
  padding: 18px;
}

.empty-state {
  display: grid;
  place-items: center;
  height: 100%;
}

.empty-card {
  width: min(520px, 100%);
  padding: 28px 24px;
  border: 1px dashed var(--color-border);
  background: var(--color-bg);
  border-radius: var(--radius-card);
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
  border-radius: 8px;
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.empty-card h2 {
  margin: 0 0 8px;
  color: var(--color-text);
  font-size: 20px;
}

.empty-card p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.7;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}

.message-row {
  display: flex;
  margin-bottom: 18px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-row.assistant {
  justify-content: flex-start;
}

.message-card {
  max-width: min(920px, 84%);
}

.message-meta {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.route-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  font-size: 12px;
  font-weight: 700;
}

.message-bubble {
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.user .message-bubble {
  background: var(--color-primary);
  color: white;
}

.assistant .message-bubble {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.trace-panels {
  margin-top: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-element);
  overflow: hidden;
}

.trace-list {
  display: grid;
  gap: 10px;
}

.trace-item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}

.trace-index {
  width: 24px;
  height: 24px;
  display: inline-grid;
  place-items: center;
  border-radius: var(--radius-pill);
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  font-size: 12px;
  font-weight: 700;
}

.trace-node {
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
}

.trace-detail {
  margin-top: 2px;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
}

.composer-shell {
  padding-top: 12px;
}

.composer {
  width: 100%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--radius-card);
  padding: 10px 14px 12px;
}

.composer-input :deep(textarea) {
  font-size: 15px;
  line-height: 1.7;
}

.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.composer-hint {
  color: var(--color-text-muted);
  font-size: 12px;
}

:deep(.code-block) {
  background: #0f172a;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  margin-top: 8px;
}

@media (max-width: 960px) {
  .chat-shell {
    height: auto;
    min-height: calc(100vh - 96px);
  }

  .topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .message-card {
    max-width: 100%;
  }

  .composer-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
