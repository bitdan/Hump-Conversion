<template>
  <div class="chat-shell">
    <header class="topbar">
      <div>
        <h1 class="topbar-title">AI 对话工作台</h1>
        <p class="topbar-subtitle">粘贴问题、代码或异常堆栈，系统会选择合适的处理流程。</p>
      </div>
      <div class="topbar-actions">
        <v-btn size="small" variant="tonal" prepend-icon="mdi-code-braces" @click="fillExample('leetcode')">
          LeetCode 示例
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
            <p>可以直接输入，也可以先载入一个示例。</p>
            <div class="quick-actions">
              <v-btn variant="outlined" prepend-icon="mdi-code-braces" @click="fillExample('leetcode')">
                算法题
              </v-btn>
              <v-btn variant="outlined" prepend-icon="mdi-alert-circle-outline" @click="fillExample('stacktrace')">
                异常堆栈
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
            placeholder="输入问题，或粘贴代码、题目描述、异常堆栈"
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
  height: calc(100vh - 112px);
  min-height: 640px;
  padding: 0;
  background: #f8fafc;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid #dbe4ef;
  border-radius: 8px;
  background: #ffffff;
}

.topbar-title {
  margin: 0;
  color: #0f172a;
  font-size: 22px;
  line-height: 1.2;
}

.topbar-subtitle {
  margin: 6px 0 0;
  color: #64748b;
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
  border: 1px solid #dbe4ef;
  border-radius: 8px;
  background: #ffffff;
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
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
  border-radius: 8px;
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  margin: 0 auto 14px;
  border-radius: 8px;
  background: #dbeafe;
  color: #1d4ed8;
}

.empty-card h2 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 20px;
}

.empty-card p {
  margin: 0;
  color: #475569;
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
  background: #dbeafe;
  color: #1d4ed8;
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
  background: #2563eb;
  color: white;
}

.assistant .message-bubble {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  color: #0f172a;
}

.composer-shell {
  padding-top: 12px;
}

.composer {
  width: 100%;
  border: 1px solid #dbe4ef;
  background: #ffffff;
  border-radius: 8px;
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
