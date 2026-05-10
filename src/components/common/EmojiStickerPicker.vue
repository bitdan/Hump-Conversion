<template>
  <v-menu
      v-model="open"
      :attach="attachTarget || undefined"
      :contained="Boolean(attachTarget)"
      :close-on-content-click="false"
      location="top"
      offset="8"
  >
    <template #activator="{ props }">
      <v-btn
          v-bind="props"
          icon="mdi-emoticon-happy-outline"
          variant="text"
          density="comfortable"
          size="small"
      />
    </template>

    <div class="picker-shell">
      <emoji-picker ref="pickerRef" class="emoji-picker-el"></emoji-picker>
      <div class="picker-hint">支持 Unicode emoji 和平台公共表情包</div>
    </div>
  </v-menu>
</template>

<script setup lang="ts">
import 'emoji-picker-element'
import {nextTick, onBeforeUnmount, ref, watch} from 'vue'
import {STICKERS, createStickerToken, findStickerByName, findStickerByShortcode} from '@/utils/stickers'

defineProps<{
  attachTarget?: HTMLElement | null
}>()

const emit = defineEmits<{
  insert: [value: string]
}>()

const open = ref(false)
const pickerRef = ref<HTMLElement | null>(null)
let boundPicker: any = null

function handleEmojiClick(event: Event) {
  const detail = (event as CustomEvent).detail || {}
  const emoji = detail.emoji || {}

  const shortcode = Array.isArray(emoji.shortcodes) ? String(emoji.shortcodes[0] || '') : ''
  const customSticker = findStickerByShortcode(shortcode) || findStickerByName(detail.name)
  if (customSticker) {
    emit('insert', createStickerToken(customSticker.id))
    open.value = false
    return
  }

  if (detail.unicode) {
    emit('insert', String(detail.unicode))
    open.value = false
  }
}

function setupPicker() {
  const picker = pickerRef.value as any
  if (!picker) return
  if (boundPicker && boundPicker !== picker) {
    boundPicker.removeEventListener('emoji-click', handleEmojiClick)
    boundPicker = null
  }
  if (boundPicker === picker) return
  picker.locale = 'zh-Hans'
  picker.skinToneEmoji = '👍'
  picker.customEmoji = STICKERS.map(sticker => ({
    name: sticker.name,
    shortcodes: sticker.shortcodes,
    url: sticker.url,
    category: sticker.category
  }))
  picker.addEventListener('emoji-click', handleEmojiClick)
  boundPicker = picker
}

watch(open, async (value) => {
  if (!value) return
  await nextTick()
  setupPicker()
})

onBeforeUnmount(() => {
  if (boundPicker) {
    boundPicker.removeEventListener('emoji-click', handleEmojiClick)
  }
  boundPicker = null
})
</script>

<style scoped>
.picker-shell {
  width: min(352px, calc(100vw - 32px));
  padding: 10px;
  border: 1px solid #dbe4ef;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 18px 36px rgba(15, 23, 42, .14);
}

.emoji-picker-el {
  width: 100%;
  height: 360px;
  --outline-color: #93c5fd;
  --border-size: 0;
  --button-border-radius: 10px;
  --emoji-size: 1.25rem;
  --category-emoji-size: 1.1rem;
  --num-columns: 8;
}

.picker-hint {
  padding-top: 8px;
  color: #64748b;
  font-size: 12px;
  text-align: center;
}
</style>
