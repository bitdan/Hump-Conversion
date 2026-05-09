<template>
  <div ref="chatRootRef" class="global-chat">
    <transition name="chat-panel">
      <section v-if="chat.isOpen" class="chat-window" aria-label="全局聊天窗口">
        <header class="chat-header">
          <div class="channel-title">
            <v-icon icon="mdi-message-text" size="20"/>
            <span>常规频道</span>
          </div>
          <div class="header-actions">
            <span class="connection-dot" :class="{ online: chat.isConnected }"></span>
            <v-btn icon="mdi-close" variant="text" density="comfortable" size="small" @click="chat.setOpen(false)"/>
          </div>
        </header>

        <main ref="messageListRef" class="message-list">
          <div v-if="!userStore.token" class="empty-state">
            登录后可以参与全局聊天
          </div>
          <div v-else-if="chat.messages.length === 0" class="empty-state">
            暂无消息
          </div>
          <template v-else>
            <article
                v-for="message in chat.messages"
                :key="message.id"
                class="message-row"
                :class="{ mine: message.user_id === userStore.userId }"
            >
              <div class="avatar">
                {{ getInitial(message.username) }}
              </div>
              <div class="message-body">
                <div class="message-meta">
                  <span class="username">{{ message.username || '系统' }}</span>
                  <span class="time">{{ formatTime(message.created_at) }}</span>
                </div>
                <p class="message-content">{{ message.content }}</p>
              </div>
            </article>
          </template>
        </main>

        <footer class="chat-footer">
          <div v-if="chat.error" class="error-text">{{ chat.error }}</div>
          <div class="input-row">
            <v-text-field
                v-model="draft"
                variant="outlined"
                density="compact"
                hide-details
                maxlength="500"
                placeholder="在 #常规频道 中聊天"
                :disabled="!userStore.token"
                @keydown.enter.prevent="submit"
            />
            <v-btn
                icon="mdi-send"
                color="primary"
                variant="flat"
                :disabled="!canSend"
                @click="submit"
            />
          </div>
        </footer>
      </section>
    </transition>

    <v-btn
        class="chat-toggle"
        color="primary"
        icon="mdi-chat-processing"
        size="large"
        elevation="8"
        @click="chat.toggleOpen"
    />
    <span v-if="chat.unreadCount > 0" class="unread-badge">
      {{ chat.unreadCount > 99 ? '99+' : chat.unreadCount }}
    </span>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useChatStore} from '@/stores/chat'
import {useUserStore} from '@/stores/user'

const chat = useChatStore()
const userStore = useUserStore()
const draft = ref('')
const chatRootRef = ref<HTMLElement | null>(null)
const messageListRef = ref<HTMLElement | null>(null)

const canSend = computed(() => Boolean(userStore.token && draft.value.trim() && draft.value.trim().length <= 500))

function getInitial(username: string | null): string {
  return (username || '系').trim().slice(0, 1).toUpperCase()
}

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function scrollToBottom() {
  nextTick(() => {
    const list = messageListRef.value
    if (list) {
      list.scrollTop = list.scrollHeight
    }
  })
}

function submit() {
  if (!canSend.value) return
  if (chat.sendMessage(draft.value)) {
    draft.value = ''
  }
}

function handleOutsidePointerDown(event: PointerEvent) {
  if (!chat.isOpen) return
  const root = chatRootRef.value
  if (root && !root.contains(event.target as Node)) {
    chat.setOpen(false)
  }
}

watch(() => chat.messages.length, scrollToBottom)
watch(() => chat.isOpen, (open) => {
  if (open) scrollToBottom()
})

watch(() => userStore.token, (token) => {
  if (token) {
    chat.connect()
  } else {
    chat.reset()
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown, true)
  if (userStore.token) {
    chat.connect()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
})
</script>

<style scoped>
.global-chat {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2400;
}

.chat-toggle {
  width: 56px;
  height: 56px;
}

.unread-badge {
  position: absolute;
  right: -4px;
  top: -6px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 12px;
  line-height: 22px;
  text-align: center;
  font-weight: 700;
}

.chat-window {
  position: absolute;
  right: 0;
  bottom: 72px;
  width: min(380px, calc(100vw - 32px));
  height: min(560px, calc(100vh - 120px));
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #dbe4ef;
  border-radius: 8px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.2);
  overflow: hidden;
}

.chat-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.channel-title,
.header-actions,
.input-row,
.message-meta {
  display: flex;
  align-items: center;
}

.channel-title {
  gap: 8px;
  font-weight: 700;
  color: #1f2937;
}

.header-actions {
  gap: 8px;
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #ef4444;
}

.connection-dot.online {
  background: #22c55e;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: #f8fafc;
}

.empty-state {
  height: 100%;
  display: grid;
  place-items: center;
  color: #64748b;
  font-size: 14px;
}

.message-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.message-row.mine {
  flex-direction: row-reverse;
}

.avatar {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #60a5fa;
  color: #fff;
  font-weight: 700;
}

.message-row.mine .avatar {
  background: #10b981;
}

.message-body {
  max-width: calc(100% - 46px);
}

.message-meta {
  gap: 6px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #64748b;
}

.message-row.mine .message-meta {
  justify-content: flex-end;
}

.username {
  font-weight: 700;
  color: #334155;
}

.message-content {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
  color: #111827;
  line-height: 1.45;
  font-size: 14px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  border: 1px solid #e2e8f0;
}

.message-row.mine .message-content {
  background: #dbeafe;
  border-color: #bfdbfe;
}

.chat-footer {
  border-top: 1px solid #e5e7eb;
  background: #fff;
  padding: 10px;
}

.error-text {
  color: #dc2626;
  font-size: 12px;
  margin-bottom: 6px;
}

.input-row {
  gap: 8px;
}

.chat-panel-enter-active,
.chat-panel-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.chat-panel-enter-from,
.chat-panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 640px) {
  .global-chat {
    right: 16px;
    bottom: 16px;
  }

  .chat-window {
    right: -8px;
    bottom: 68px;
    width: calc(100vw - 32px);
    height: min(560px, calc(100vh - 104px));
  }
}
</style>
