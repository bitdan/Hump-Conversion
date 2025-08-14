<template>
  <div class="chat-container">
    <!-- 聊天内容区 -->
    <div class="chat-messages" ref="messageContainer">
      <div
        v-if="messages.length === 0"
        class="text-gray-400 text-center mt-10"
      >
        请输入主题开始对话...
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
      ></v-textarea>
      <v-btn
        color="success"
        :loading="apiLoading"
        class="ml-2"
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

watch(messages, async () => {
  await nextTick();
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
  }
});

function formatDraft(draft: string): string {
  return draft
    .replace(/\n/g, '<br>')
    .replace(/```(\w+)\n([\s\S]*?)```/g, '<pre class="bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto"><code>$2</code></pre>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
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

  try {
    const { data } = await getLangGraphData(topic);
    const fullText = formatDraft(data.draft);

    // 添加一个空的 assistant 消息
    const msgIndex = messages.value.push({ role: 'assistant', content: '' }) - 1;

    // 流式打字效果
    let i = 0;
    const timer = setInterval(() => {
      if (i < fullText.length) {
        messages.value[msgIndex].content += fullText[i];
        i++;
      } else {
        clearInterval(timer);
      }
    }, 15); // 速度可以调节

    showSuccess('获取成功');
  } catch (error) {
    console.error('API调用失败:', error);
    showError('API调用失败，请检查网络连接和接口地址');
  } finally {
    apiLoading.value = false;
  }
}
</script>


<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f5f5;
}

.message-wrapper {
  display: flex;
  margin-bottom: 12px;
}

.message-wrapper.user {
  justify-content: flex-end;
}

.message-wrapper.assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 12px;
  white-space: pre-wrap;
}

.user .message-bubble {
  background: #4caf50;
  color: white;
}

.assistant .message-bubble {
  background: white;
  border: 1px solid #ddd;
}

.chat-input {
  display: flex;
  align-items: flex-end;
  padding: 8px;
  border-top: 1px solid #ddd;
  background: white;
}
</style>
