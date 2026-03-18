<template>
  <div class="chat-shell">
    <section class="hero-panel">
      <div>
        <p class="eyebrow">AI Skill Router</p>
        <h1 class="hero-title">Chat Agent Workspace</h1>
        <p class="hero-copy">
          像 ChatGPT 一样直接发消息。后端会自动判断是否使用 LeetCode 陪练、Java 堆栈诊断、SQL 生成或通用工作流。
        </p>
      </div>
      <div class="hero-badges">
        <span class="hero-badge">Auto Skill</span>
        <span class="hero-badge">Chat UI</span>
        <span class="hero-badge">Tool Routing</span>
      </div>
    </section>

    <section class="panel chat-panel">
      <div class="panel-header">
        <h2>对话</h2>
        <div class="panel-actions">
          <v-btn size="small" variant="text" :disabled="messages.length === 0" @click="messages = []">
            清空
          </v-btn>
        </div>
      </div>

      <div class="chat-messages" ref="messageContainer">
        <div v-if="messages.length === 0" class="empty-hint">
          直接输入你的问题、题目、代码、堆栈或分析需求。<br>
          例如：<br>
          1. 粘贴 LeetCode 题目和代码，让它自动进入陪练模式<br>
          2. 粘贴 Java stacktrace，让它自动诊断<br>
          3. 输入销量分析问题，让它尝试转 SQL
        </div>

        <div
            v-for="(msg, index) in messages"
            :key="index"
            class="message-wrapper"
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

      <div class="chat-input">
        <v-textarea
            v-model="userInput"
            auto-grow
            rows="3"
            placeholder="输入问题，按 Ctrl+Enter 发送。可以直接粘贴代码块、题目描述或异常堆栈。"
            variant="outlined"
            class="input-box"
            @keydown.ctrl.enter.prevent="submit"
        />
        <div class="button-row">
          <v-btn color="success" :loading="loading" @click="submit">
            发送
          </v-btn>
          <v-btn variant="outlined" @click="fillExample('leetcode')">
            LeetCode 示例
          </v-btn>
          <v-btn variant="outlined" @click="fillExample('stacktrace')">
            堆栈示例
          </v-btn>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
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
  return draft
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
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
  if (char === '\n') return 50
  if (/[\.\!\?]/.test(char)) return 80
  if (/[,:;，。；：]/.test(char)) return 50
  return 10
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
  min-height: 100vh;
  background: radial-gradient(circle at top left, rgba(15, 118, 110, 0.18), transparent 24%),
  radial-gradient(circle at top right, rgba(14, 116, 144, 0.18), transparent 24%),
  linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%);
  padding: 20px;
}

.hero-panel,
.panel {
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.9);
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
.route-pill {
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

.chat-panel {
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

.chat-messages {
  min-height: 62vh;
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 4px;
}

.empty-hint {
  color: #64748b;
  text-align: center;
  margin-top: 80px;
  font-size: 15px;
  line-height: 1.8;
}

.message-wrapper {
  display: flex;
  margin-bottom: 18px;
}

.message-wrapper.user {
  justify-content: flex-end;
}

.message-wrapper.assistant {
  justify-content: flex-start;
}

.message-card {
  max-width: 82%;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.route-pill {
  padding: 4px 10px;
  background: #dbeafe;
  color: #1d4ed8;
}

.route-title {
  color: #475569;
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
  background: #fff;
  border: 1px solid #e5e7eb;
  color: #0f172a;
}

.chat-input {
  margin-top: 18px;
}

.input-box {
  margin-bottom: 12px;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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
  .hero-panel {
    flex-direction: column;
  }

  .chat-messages {
    min-height: 56vh;
    max-height: 56vh;
  }

  .message-card {
    max-width: 100%;
  }
}
</style>
