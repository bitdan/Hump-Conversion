<template>
  <ToolPageLayout :card="false" :hide-header="true" density="workspace" max-width="max-w-full">
    <div class="diff-workspace">
      <div class="diff-file-headers">
        <div class="diff-file-header solid-card">
          <div class="diff-file-title">
            <strong>文件 A</strong>
            <v-chip size="x-small" color="error" variant="tonal">{{ leftLanguage }}</v-chip>
          </div>
          <v-file-input
            v-model="leftFile"
            label="选择文件 A"
            prepend-inner-icon="mdi-file"
            prepend-icon=""
            density="compact"
            variant="outlined"
            hide-details
            class="diff-file-input"
            :accept="ACCEPTED_FILES"
            @change="handleFile('left')"
          />
          <v-btn size="small" variant="text" icon="mdi-close" @click="clearSide('left')" />
        </div>

        <div class="diff-file-header solid-card">
          <div class="diff-file-title">
            <strong>文件 B</strong>
            <v-chip size="x-small" color="success" variant="tonal">{{ rightLanguage }}</v-chip>
          </div>
          <v-file-input
            v-model="rightFile"
            label="选择文件 B"
            prepend-inner-icon="mdi-file"
            prepend-icon=""
            density="compact"
            variant="outlined"
            hide-details
            class="diff-file-input"
            :accept="ACCEPTED_FILES"
            @change="handleFile('right')"
          />
          <v-btn size="small" variant="text" icon="mdi-close" @click="clearSide('right')" />
        </div>
      </div>

      <div class="diff-toolbar glass-card">
        <v-btn size="small" variant="tonal" color="primary" :disabled="!canRun" @click="formatBoth">
          格式化
        </v-btn>
        <v-switch v-model="collapseUnchanged" label="折叠未变更" density="compact" hide-details inset />
        <v-divider vertical />
        <v-btn size="small" :disabled="chunkCount === 0" @click="previousChange">上一处</v-btn>
        <v-btn size="small" :disabled="chunkCount === 0" @click="nextChange">下一处</v-btn>
        <span class="diff-summary">
          {{ chunkCount }} 处变更 · 新增 {{ summary.added }} 行 · 删除 {{ summary.removed }} 行
        </span>
        <v-spacer />
        <v-btn size="small" variant="text" prepend-icon="mdi-delete-outline" :disabled="!canRun" @click="clearBoth">
          清空全部
        </v-btn>
      </div>

      <DiffCodeEditor
        ref="diffEditor"
        v-model:left="left"
        v-model:right="right"
        :left-language="leftLanguage"
        :right-language="rightLanguage"
        :collapse-unchanged="collapseUnchanged"
        class="diff-merge-editor"
        @chunks-change="chunkCount = $event"
      />
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'
import DiffCodeEditor from '@/components/tools/DiffCodeEditor.vue'
import { diffLines, summarizeDiff } from '@/utils/diff'
import { formatContent, detectFormat } from '@/utils/formatters'

type CodeEditorLanguage =
  | 'json'
  | 'yaml'
  | 'xml'
  | 'html'
  | 'javascript'
  | 'typescript'
  | 'css'
  | 'markdown'
  | 'text'

const ACCEPTED_FILES = '.json,.yaml,.yml,.xml,.csv,.txt,.md,.ts,.js,.vue,.css,.html'

const EXTENSION_LANGUAGES: Record<string, CodeEditorLanguage> = {
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  html: 'html',
  htm: 'html',
  vue: 'html',
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  css: 'css',
  md: 'markdown',
  markdown: 'markdown'
}

const left = ref('')
const right = ref('')
const leftFile = ref<File | null>(null)
const rightFile = ref<File | null>(null)
const collapseUnchanged = ref(false)
const chunkCount = ref(0)
const diffEditor = ref<InstanceType<typeof DiffCodeEditor>>()

const canRun = computed(() => left.value.length > 0 || right.value.length > 0)
const summary = computed(() => summarizeDiff(diffLines(left.value, right.value)))

function detectEditorLanguage(file: File | null, content: string): CodeEditorLanguage {
  const extension = file?.name.split('.').pop()?.toLowerCase()
  if (extension && EXTENSION_LANGUAGES[extension]) {
    return EXTENSION_LANGUAGES[extension]
  }

  const format = detectFormat(content)
  if (format === 'json' || format === 'yaml' || format === 'xml') {
    return format
  }

  const trimmed = content.trimStart().toLowerCase()
  return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html') ? 'html' : 'text'
}

const leftLanguage = computed(() => detectEditorLanguage(leftFile.value, left.value))
const rightLanguage = computed(() => detectEditorLanguage(rightFile.value, right.value))

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = reject
    reader.readAsText(file)
  })
}

async function handleFile(side: 'left' | 'right') {
  const file = side === 'left' ? leftFile.value : rightFile.value
  if (!file) {
    return
  }
  const text = await readFile(file)
  if (side === 'left') {
    left.value = text
  } else {
    right.value = text
  }
}

async function formatBoth() {
  const [leftKind, rightKind] = [detectFormat(left.value), detectFormat(right.value)]
  left.value = await formatContent(left.value, leftKind)
  right.value = await formatContent(right.value, rightKind)
}

function clearBoth() {
  left.value = ''
  right.value = ''
  leftFile.value = null
  rightFile.value = null
}

function clearSide(side: 'left' | 'right') {
  if (side === 'left') {
    left.value = ''
    leftFile.value = null
  } else {
    right.value = ''
    rightFile.value = null
  }
}

function previousChange() {
  diffEditor.value?.previousChange()
}

function nextChange() {
  diffEditor.value?.nextChange()
}
</script>

<style scoped>
.diff-workspace {
  height: calc(100dvh - 32px);
  min-height: 620px;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: var(--space-tight);
  overflow: hidden;
}

.diff-file-headers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-tight);
}

.diff-file-header {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-tight);
  padding: 6px var(--space-tight);
}

.diff-file-title {
  min-width: 84px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.diff-file-input {
  min-width: 120px;
  flex: 1;
}

.diff-toolbar {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: var(--space-tight);
  padding: 4px var(--space-tight);
  overflow-x: auto;
  white-space: nowrap;
}

.diff-toolbar > * {
  flex: 0 0 auto;
}

.diff-toolbar :deep(.v-spacer) {
  flex: 1 1 auto;
}

.diff-summary {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.diff-merge-editor {
  min-height: 0;
}

@media (max-width: 960px) {
  .diff-workspace {
    height: calc(100dvh - 80px);
    min-height: 500px;
  }

  .diff-file-title {
    min-width: 68px;
  }

  .diff-file-header {
    padding: 4px;
  }
}
</style>
