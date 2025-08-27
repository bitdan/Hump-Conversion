<template>
  <div class="p-4 space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <v-card class="p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="font-medium">文件 A</div>
          <v-btn size="small" variant="text" @click="left = ''">清空</v-btn>
        </div>
        <v-file-input
          v-model="leftFile"
          label="选择文件 A"
          prepend-icon="mdi-file"
          accept=".json,.yaml,.yml,.xml,.csv,.txt,.md,.ts,.js,.vue,.css,.html"
          @change="handleFile('left')"
        />
        <v-textarea v-model="left" rows="12" auto-grow class="mt-2" />
      </v-card>

      <v-card class="p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="font-medium">文件 B</div>
          <v-btn size="small" variant="text" @click="right = ''">清空</v-btn>
        </div>
        <v-file-input
          v-model="rightFile"
          label="选择文件 B"
          prepend-icon="mdi-file"
          accept=".json,.yaml,.yml,.xml,.csv,.txt,.md,.ts,.js,.vue,.css,.html"
          @change="handleFile('right')"
        />
        <v-textarea v-model="right" rows="12" auto-grow class="mt-2" />
      </v-card>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <v-btn color="primary" :disabled="!canRun" @click="run">对比</v-btn>
      <v-btn variant="outlined" :disabled="!canRun" @click="formatBoth">格式化</v-btn>
      <v-switch v-model="showOnlyChanges" label="仅显示差异" inset class="ml-2" />
    </div>

    <v-card class="p-2 overflow-auto">
      <div v-if="!result" class="text-gray-500 p-4">加载两侧内容并点击“对比”</div>
      <template v-else>
        <div class="text-sm px-3 py-2 text-gray-600">
          新增: <span class="text-emerald-600 font-medium">{{ summary.added }}</span>
          删除: <span class="text-rose-600 font-medium">{{ summary.removed }}</span>
        </div>
        <div class="font-mono text-sm">
          <div
            v-for="(c, idx) in renderedChanges"
            :key="idx"
            :class="changeClass(c.type)"
            class="px-3 py-1 whitespace-pre-wrap break-words border-b last:border-b-0"
          >
            <span class="opacity-60 pr-2 select-none">
              {{ linePrefix(c.type) }}
            </span>
            {{ c.value === '' ? '\u00A0' : c.value }}
          </div>
        </div>
      </template>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { diffLines, summarizeDiff } from '@/utils/diff'
import type { LineChange } from '@/utils/diffTypes'
import { formatContent, detectFormat } from '@/utils/formatters'

const left = ref('')
const right = ref('')
const leftFile = ref<File | null>(null)
const rightFile = ref<File | null>(null)
const result = ref<{ changes: LineChange[] } | null>(null)
const showOnlyChanges = ref(false)

const canRun = computed(() => left.value.length > 0 || right.value.length > 0)

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
  if (!file) return
  const text = await readFile(file)
  if (side === 'left') left.value = text
  else right.value = text
}

async function formatBoth() {
  const [lKind, rKind] = [detectFormat(left.value), detectFormat(right.value)]
  left.value = await formatContent(left.value, lKind)
  right.value = await formatContent(right.value, rKind)
}

function run() {
  const r = diffLines(left.value, right.value)
  result.value = { changes: r.changes }
}

const summary = computed(() => {
  if (!result.value) return { added: 0, removed: 0 }
  return summarizeDiff({ changes: result.value.changes, hunks: [] })
})

const renderedChanges = computed<LineChange[]>(() => {
  if (!result.value) return []
  return showOnlyChanges.value
    ? result.value.changes.filter(c => c.type !== 'context')
    : result.value.changes
})

function changeClass(type: LineChange['type']) {
  if (type === 'add') return 'bg-emerald-50 text-emerald-800'
  if (type === 'remove') return 'bg-rose-50 text-rose-800'
  return 'bg-transparent'
}

function linePrefix(type: LineChange['type']) {
  if (type === 'add') return '+'
  if (type === 'remove') return '-'
  return ' '
}
</script>

<style scoped>
</style>


