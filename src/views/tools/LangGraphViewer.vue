<template>
  <div class="chat-container">
    <!-- 聊天内容 -->
    <div class="chat-messages" ref="messageContainer">
      <div v-if="messages.length === 0" class="empty-hint">
        💬 请输入主题开始对话
      </div>

      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message-wrapper"
        :class="msg.role"
      >
        <div class="message-bubble" v-html="msg.content"></div>
      </div>
    </div>

    <!-- 底部输入区 -->
    <div class="chat-input">
      <v-textarea
        v-model="apiTopic"
        auto-grow
        rows="1"
        placeholder="输入主题或问题，按 Enter 发送"
        @keydown.enter.prevent="fetchFromApi"
        outlined
        class="input-box"
      ></v-textarea>
      <v-btn
        color="success"
        :loading="apiLoading"
        class="send-btn"
        @click="fetchFromApi"
      >
        发送
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useMessage } from '../../composables/useMessage';
import { getLangGraphData } from '@/api/langGraph';

const { showSuccess, showError } = useMessage();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const messages = ref<ChatMessage[]>([]);
const apiTopic = ref('');
const apiLoading = ref(false);
const messageContainer = ref<HTMLElement | null>(null);
const streamingToken = ref(0);

watch(messages, async () => {
  await nextTick();
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
  }
});

function formatDraft(draft: string): string {
  return draft
    .replace(/\n/g, '<br>')
    .replace(
      /```(\w+)\n([\s\S]*?)```/g,
      '<pre class="code-block"><code>$2</code></pre>'
    )
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function scrollToBottom(): void {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDelayForChar(char: string): number {
  if (char === '\n') return 80;
  if (/[\.\!\?]/.test(char)) return 120;
  if (/[,:;，。；：]/.test(char)) return 80;
  return 18;
}

async function typeWriter(
  fullText: string,
  onUpdate: (html: string) => void,
  tokenSnapshot: number
): Promise<void> {
  let buffer = '';
  for (let i = 0; i < fullText.length; i++) {
    if (tokenSnapshot !== streamingToken.value) return; // canceled by new request
    const ch = fullText[i];
    buffer += ch;
    onUpdate(formatDraft(buffer));
    scrollToBottom();
    await delay(getDelayForChar(ch));
  }
}

async function fetchFromApi(): Promise<void> {
  if (!apiTopic.value.trim()) {
    showError('请输入主题');
    return;
  }

  const topic = apiTopic.value;
  messages.value.push({ role: 'user', content: topic });
  apiTopic.value = '';
  apiLoading.value = true;
  streamingToken.value += 1;
  const currentToken = streamingToken.value;

  try {
    const data = await getLangGraphData(topic);

    // 初始化助手消息占位并逐字渲染
    const assistantIndex = messages.value.push({ role: 'assistant', content: '' }) - 1;
    await typeWriter(
      data.draft || '',
      (html) => {
        messages.value[assistantIndex].content = html;
      },
      currentToken
    );

    // 如果未被取消，渲染改进建议
    if (currentToken === streamingToken.value && data.corrections && data.corrections.length > 0) {
      const correctionsText =
        '<strong>✍️ 改进建议：</strong><br>' +
        data.corrections
          .map((c, idx) => `${idx + 1}. ${c.replace(/\n/g, '<br>')}`)
          .join('<br><br>');
      messages.value.push({ role: 'assistant', content: correctionsText });
      await nextTick();
      scrollToBottom();
    }

    if (currentToken === streamingToken.value) {
      showSuccess('获取成功');
    }
  } catch (error) {
    console.error('API调用失败:', error);
    showError('API调用失败，请检查网络连接和接口地址');
  } finally {
    if (currentToken === streamingToken.value) {
      apiLoading.value = false;
    }
  }
}

</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fafafa;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.empty-hint {
  color: #aaa;
  text-align: center;
  margin-top: 40px;
  font-size: 15px;
}

.message-wrapper {
  display: flex;
  margin-bottom: 16px;
}

.message-wrapper.user {
  justify-content: flex-end;
}

.message-wrapper.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  font-size: 15px;
  line-height: 1.5;
  word-break: break-word;
}

.user .message-bubble {
  background: #4caf50;
  color: white;
}

.assistant .message-bubble {
  background: #fff;
  border: 1px solid #e5e5e5;
}

.code-block {
  background: #1e1e1e;
  color: #dcdcdc;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  font-family: monospace;
  font-size: 14px;
  margin-top: 6px;
}

.chat-input {
  display: flex;
  align-items: flex-end;
  padding: 12px;
  border-top: 1px solid #e5e5e5;
  background: white;
}

.input-box {
  flex: 1;
  border-radius: 12px;
  background: #f7f7f7;
}

.send-btn {
  margin-left: 10px;
  border-radius: 10px;
}
</style>
