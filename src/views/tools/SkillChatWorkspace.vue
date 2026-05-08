<template>
  <div class="chat-shell">
    <header class="topbar">
      <div>
        <p class="topbar-kicker">AI Skill Router</p>
        <h1 class="topbar-title">Chat Agent Workspace</h1>
      </div>
      <div class="topbar-actions">
        <v-btn size="small" variant="text" :disabled="messages.length === 0" @click="messages = []">
          清空
        </v-btn>
        <v-btn size="small" variant="outlined" @click="fillExample('leetcode')">
          LeetCode 示例
        </v-btn>
        <v-btn size="small" variant="outlined" @click="fillExample('stacktrace')">
          堆栈示例
        </v-btn>
      </div>
    </header>

    <main class="chat-main">
      <div class="chat-messages" ref="messageContainer">
        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-card">
            <h2>直接开始对话</h2>
            <p>输入题目、代码、异常堆栈或分析需求，后端会自动选择 skill。</p>
            <div class="empty-pills">
              <span>LeetCode 陪练</span>
              <span>Java 堆栈诊断</span>
              <span>SQL 生成</span>
              <span>通用工作流</span>
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
              <span class="route-pill">{{ msg.route }}</span>
              <span class="route-title">{{ msg.title }}</span>
            </div>
            <div class="message-bubble" v-html="msg.content"></div>
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
            placeholder="输入问题，按 Ctrl+Enter 发送。可以直接粘贴代码块、题目描述或异常堆栈。"
            variant="plain"
            class="composer-input"
            @keydown.ctrl.enter.prevent="submit"
        />
        <div class="composer-actions">
          <span class="composer-hint">Ctrl+Enter 发送</span>
          <v-btn color="success" rounded="pill" :loading="loading" @click="submit">
            发送
          </v-btn>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify'
import {nextTick, ref, watch} from 'vue'
import {useMessage} from '../../composables/useMessage'
import {sendAgentChat} from '@/api/agentChat'

const {showSuccess, showError} = useMessage()

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  route?: string
  title?: string
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

function fillExample(type: 'leetcode' | 'stacktrace') {
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

  userInput.value = `java.lang.NullPointerException: Cannot invoke "com.example.demo.service.UserService.getUserById(java.lang.Long)" because "this.userService" is null
    at com.example.demo.controller.UserController.getUser(UserController.java:32)
    at org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:205)
Caused by: java.lang.NullPointerException`
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
  height: calc(100vh - 40px);
  padding: 16px 20px 20px;
  background: radial-gradient(circle at top left, rgba(15, 118, 110, 0.12), transparent 22%),
  radial-gradient(circle at top right, rgba(14, 116, 144, 0.12), transparent 22%),
  linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.topbar-kicker {
  margin: 0 0 4px;
  color: #0f766e;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 11px;
}

.topbar-title {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  line-height: 1.1;
}

.topbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chat-main {
  min-height: 0;
}

.chat-messages {
  height: 100%;
  overflow-y: auto;
  padding: 8px 0 20px;
}

.empty-state {
  display: grid;
  place-items: center;
  height: 100%;
}

.empty-card {
  width: min(720px, 100%);
  padding: 28px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.84);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
  text-align: center;
}

.empty-card h2 {
  margin: 0 0 12px;
  color: #0f172a;
  font-size: 28px;
}

.empty-card p {
  margin: 0;
  color: #475569;
  font-size: 15px;
  line-height: 1.7;
}

.empty-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}

.empty-pills span,
.route-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.empty-pills span {
  background: #e2e8f0;
  color: #334155;
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
  max-width: min(920px, 82%);
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.route-pill {
  background: #dbeafe;
  color: #1d4ed8;
}

.route-title {
  color: #64748b;
  font-size: 13px;
}

.message-bubble {
  padding: 14px 16px;
  border-radius: 18px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.user .message-bubble {
  background: linear-gradient(135deg, #0f766e 0%, #0891b2 100%);
  color: white;
}

.assistant .message-bubble {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e5e7eb;
  color: #0f172a;
}

.composer-shell {
  padding-top: 8px;
}

.composer {
  width: min(920px, 100%);
  margin: 0 auto;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border-radius: 28px;
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.08);
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
  color: #64748b;
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
    height: calc(100vh - 24px);
    padding: 12px;
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
