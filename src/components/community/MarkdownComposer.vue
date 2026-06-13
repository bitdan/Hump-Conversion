<template>
  <div class="markdown-composer">
    <div class="composer-toolbar">
      <v-btn-toggle v-model="activeView" mandatory density="compact" variant="outlined" divided>
        <v-btn value="write" size="small" prepend-icon="mdi-pencil-outline">编写</v-btn>
        <v-btn value="preview" size="small" prepend-icon="mdi-eye-outline">预览</v-btn>
      </v-btn-toggle>

      <div v-if="activeView === 'write'" class="format-actions">
        <v-btn icon="mdi-format-bold" size="x-small" variant="text" title="粗体" @click="wrap('**', '**', '粗体文本')" />
        <v-btn icon="mdi-code-tags" size="x-small" variant="text" title="行内代码" @click="wrap('`', '`', '代码')" />
        <v-btn icon="mdi-code-braces" size="x-small" variant="text" title="代码块" @click="wrap('\n```\n', '\n```\n', '代码')" />
        <v-btn icon="mdi-format-quote-close" size="x-small" variant="text" title="引用" @click="prefix('> ')" />
        <v-btn icon="mdi-format-list-bulleted" size="x-small" variant="text" title="列表" @click="prefix('- ')" />
        <v-btn icon="mdi-link-variant" size="x-small" variant="text" title="链接" @click="wrap('[', '](https://)', '链接文字')" />
        <EmojiStickerPicker @insert="insert" />
      </div>
    </div>

    <div v-show="activeView === 'write'" class="composer-editor" :style="{ height: `${height}px` }">
      <CodeEditor
        ref="editorRef"
        v-model="contentModel"
        language="markdown"
        :placeholder="placeholder"
        :line-wrapping="true"
      />
    </div>

    <div v-if="activeView === 'preview'" class="composer-preview" :style="{ minHeight: `${height}px` }">
      <div v-if="modelValue.trim()" class="markdown-body" v-html="renderMarkdown(modelValue)"></div>
      <div v-else class="preview-empty">
        <v-icon icon="mdi-language-markdown-outline" size="28" />
        <span>Markdown 预览会显示在这里</span>
      </div>
    </div>

    <div class="composer-footer">
      <span>支持 Markdown</span>
      <span>{{ characterCount }} / {{ maxLength }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CodeEditor from '@/components/tools/CodeEditor.vue'
import EmojiStickerPicker from '@/components/common/EmojiStickerPicker.vue'
import { renderMarkdown } from '@/utils/markdown'

interface CodeEditorHandle {
  focus: () => void
  insertText: (text: string) => void
  wrapSelection: (before: string, after?: string, placeholder?: string) => void
  prefixSelection: (prefix: string) => void
}

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  maxLength?: number
  height?: number
}>(), {
  placeholder: '写下你的回复，支持 Markdown...',
  maxLength: 5000,
  height: 180
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeView = ref<'write' | 'preview'>('write')
const editorRef = ref<CodeEditorHandle | null>(null)
const characterCount = computed(() => Array.from(props.modelValue).length)
const contentModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', Array.from(value).slice(0, props.maxLength).join(''))
})

function focus() {
  activeView.value = 'write'
  editorRef.value?.focus()
}

function insert(value: string) {
  activeView.value = 'write'
  editorRef.value?.insertText(value)
}

function wrap(before: string, after: string, placeholder: string) {
  activeView.value = 'write'
  editorRef.value?.wrapSelection(before, after, placeholder)
}

function prefix(value: string) {
  activeView.value = 'write'
  editorRef.value?.prefixSelection(value)
}

defineExpose({ focus })
</script>

<style scoped>
.markdown-composer {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-element);
  background: var(--color-surface);
}

.composer-toolbar,
.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-tight);
  padding: 8px 10px;
  background: var(--color-bg);
}

.composer-toolbar {
  border-bottom: 1px solid var(--color-border);
}

.composer-footer {
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.format-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
}

.composer-editor {
  min-height: 140px;
}

.composer-editor :deep(.code-editor) {
  border: 0;
  border-radius: 0;
}

.composer-preview {
  padding: 14px;
  overflow: auto;
  background: var(--color-surface);
}

.preview-empty {
  min-height: inherit;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  color: var(--color-text-subtle);
  font-size: 0.8125rem;
}

.markdown-body {
  color: var(--color-text);
  font-size: 0.875rem;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.markdown-body :deep(p) {
  margin: 0 0 10px;
}

.markdown-body :deep(pre) {
  margin: 10px 0;
  padding: 12px;
  overflow-x: auto;
  border-radius: var(--radius-element);
  background: var(--color-text);
  color: var(--color-bg);
}

.markdown-body :deep(code) {
  padding: 2px 5px;
  border-radius: 4px;
  background: var(--color-primary-light);
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 8px 0 12px;
  padding-left: 24px;
}

.markdown-body :deep(li + li) {
  margin-top: 4px;
}

.markdown-body :deep(table) {
  width: 100%;
  margin: 12px 0;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 7px 9px;
  border: 1px solid var(--color-border);
  text-align: left;
}

.markdown-body :deep(th) {
  background: var(--color-bg);
}

.markdown-body :deep(hr) {
  margin: 16px 0;
  border: 0;
  border-top: 1px solid var(--color-border);
}

.markdown-body :deep(img:not(.inline-sticker)) {
  max-width: 100%;
  border-radius: var(--radius-element);
}

.markdown-body :deep(input[type='checkbox']) {
  accent-color: var(--color-primary);
}

.markdown-body :deep(.inline-sticker) {
  width: 44px;
  height: 44px;
  margin: 0 4px;
  vertical-align: middle;
  border-radius: var(--radius-element);
}

@media (max-width: 720px) {
  .composer-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .format-actions {
    width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
