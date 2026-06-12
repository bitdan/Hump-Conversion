<template>
  <ToolPageLayout :card="false" :hide-header="true" density="workspace" max-width="max-w-full">
    <div class="diff-workspace">
    <div class="diff-input-grid">
      <v-card class="diff-input-card solid-card" variant="flat">
        <div class="diff-input-header">
          <div class="diff-input-title">
            <div class="font-medium">文件 A</div>
            <v-chip size="x-small" color="primary" variant="tonal">{{ leftLanguage }}</v-chip>
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
            accept=".json,.yaml,.yml,.xml,.csv,.txt,.md,.ts,.js,.vue,.css,.html"
            @change="handleFile('left')"
          />
          <v-btn size="small" variant="text" icon="mdi-close" @click="clearSide('left')" />
        </div>
        <CodeEditor
          v-model="left"
          :language="leftLanguage"
          :line-wrapping="false"
          class="diff-input-editor"
          placeholder="输入或加载文件 A..."
        />
      </v-card>

      <v-card class="diff-input-card solid-card" variant="flat">
        <div class="diff-input-header">
          <div class="diff-input-title">
            <div class="font-medium">文件 B</div>
            <v-chip size="x-small" color="primary" variant="tonal">{{ rightLanguage }}</v-chip>
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
            accept=".json,.yaml,.yml,.xml,.csv,.txt,.md,.ts,.js,.vue,.css,.html"
            @change="handleFile('right')"
          />
          <v-btn size="small" variant="text" icon="mdi-close" @click="clearSide('right')" />
        </div>
        <CodeEditor
          v-model="right"
          :language="rightLanguage"
          :line-wrapping="false"
          class="diff-input-editor"
          placeholder="输入或加载文件 B..."
        />
      </v-card>
    </div>

    <div class="diff-toolbar glass-card">
      <v-btn size="small" variant="tonal" color="primary" :disabled="!canRun" @click="formatBoth">格式化</v-btn>
      <v-switch v-model="showOnlyChanges" label="仅显示差异" density="compact" hide-details inset />
      <v-divider vertical />
      <v-btn size="small" :disabled="diffTargets.length === 0" @click="prevDiff">上一处</v-btn>
      <v-btn size="small" :disabled="diffTargets.length === 0" @click="nextDiff">下一处</v-btn>
      <div class="text-xs text-gray-500" v-if="diffTargets.length > 0">
        {{ activeDiffIndex + 1 }} / {{ diffTargets.length }}
      </div>
      <v-spacer />
      <v-btn size="small" variant="text" prepend-icon="mdi-delete-outline" :disabled="!canRun" @click="clearBoth">
        清空全部
      </v-btn>
    </div>

    <v-card class="diff-result-card solid-card" variant="flat">
      <div v-if="!result" class="text-gray-500 p-4">加载两侧内容并点击“对比”</div>
      <template v-else>
        <div class="diff-result-header">
          <div>
            新增: <span class="text-emerald-600 font-medium">{{ summary.added }}</span>
            删除: <span class="text-rose-600 font-medium">{{ summary.removed }}</span>
          </div>
          <div class="text-xs text-gray-500">侧边对比视图</div>
        </div>

        <div class="diff-result-scroll" ref="scrollContainer">
          <div class="grid grid-cols-2 text-xs text-gray-500 px-3 py-1">
            <div>A</div>
            <div>B</div>
          </div>
          <div class="font-mono text-sm border-t">
            <div
              v-for="(row, idx) in sideBySideRows"
              :key="idx"
              class="grid grid-cols-2 border-b last:border-b-0"
              :data-diff="row.type !== 'context' ? '1' : '0'"
              ref="rowRefs"
            >
              <div :class="cellClass(row.type, 'left')" class="px-3 py-1 whitespace-pre-wrap break-words">
                <span class="opacity-60 pr-2 select-none">{{ leftPrefix(row.type) }}</span>
                <template v-if="row.type !== 'change'">
                  {{ row.left === '' ? '\u00A0' : row.left }}
                </template>
                <template v-else>
                  <span
                    v-for="(seg, si) in inlineForRow(row).left"
                    :key="`l-`+si"
                    :class="segmentClass(seg, 'left')"
                  >{{ seg.text }}</span>
                </template>
              </div>
              <div :class="cellClass(row.type, 'right')" class="px-3 py-1 whitespace-pre-wrap break-words">
                <span class="opacity-60 pr-2 select-none">{{ rightPrefix(row.type) }}</span>
                <template v-if="row.type !== 'change'">
                  {{ row.right === '' ? '\u00A0' : row.right }}
                </template>
                <template v-else>
                  <span
                    v-for="(seg, si) in inlineForRow(row).right"
                    :key="`r-`+si"
                    :class="segmentClass(seg, 'right')"
                  >{{ seg.text }}</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>
    </v-card>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'
import CodeEditor from '@/components/tools/CodeEditor.vue'
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
  if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) {
    return 'html'
  }
  return 'text'
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
    return
  }
  right.value = ''
  rightFile.value = null
}

watch([left, right], () => {
  // 自动对比：任一侧变化时更新结果
  run()
}, { immediate: true })

// --- Diff navigation & synced scrolling ---
const scrollContainer = ref<HTMLElement | null>(null)
const rowRefs = ref<HTMLElement[]>([])
const activeDiffIndex = ref(0)

const diffTargets = computed<number[]>(() => {
  const rows = sideBySideRows.value
  const indices: number[] = []
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].type !== 'context') indices.push(i)
  }
  return indices
})

function scrollToActive() {
  const container = scrollContainer.value
  if (!container) return
  const targets = diffTargets.value
  if (targets.length === 0) return
  const rowIndex = targets[(activeDiffIndex.value % targets.length + targets.length) % targets.length]
  const el = rowRefs.value[rowIndex]
  if (!el) return
  const top = el.offsetTop - 24
  container.scrollTo({ top, behavior: 'smooth' })
}

function nextDiff() {
  if (diffTargets.value.length === 0) return
  activeDiffIndex.value = (activeDiffIndex.value + 1) % diffTargets.value.length
  scrollToActive()
}

function prevDiff() {
  if (diffTargets.value.length === 0) return
  activeDiffIndex.value = (activeDiffIndex.value - 1 + diffTargets.value.length) % diffTargets.value.length
  scrollToActive()
}

function updateActiveOnScroll() {
  const container = scrollContainer.value
  if (!container) return
  const scrollTop = container.scrollTop
  const targets = diffTargets.value
  if (targets.length === 0) return
  let current = 0
  for (let i = 0; i < targets.length; i += 1) {
    const idx = targets[i]
    const el = rowRefs.value[idx]
    if (!el) continue
    if (el.offsetTop - 8 <= scrollTop) current = i
    else break
  }
  activeDiffIndex.value = current
}

let boundScrollHandler: ((this: HTMLElement, ev: Event) => any) | null = null
onMounted(() => {
  boundScrollHandler = () => updateActiveOnScroll()
  nextTick(() => {
    scrollContainer.value?.addEventListener('scroll', boundScrollHandler as EventListener, { passive: true } as any)
    updateActiveOnScroll()
  })
})

onBeforeUnmount(() => {
  if (boundScrollHandler && scrollContainer.value) {
    scrollContainer.value.removeEventListener('scroll', boundScrollHandler as EventListener)
  }
  boundScrollHandler = null
})

const summary = computed(() => {
  if (!result.value) return { added: 0, removed: 0 }
  return summarizeDiff({ changes: result.value.changes, hunks: [] })
})

interface SideBySideRow {
  left: string
  right: string
  // 'change' 表示左右同时有内容（可能为修改）
  type: 'add' | 'remove' | 'context' | 'change'
}

function buildSideBySideRows(changes: LineChange[]): SideBySideRow[] {
  const rows: SideBySideRow[] = []
  let i = 0
  while (i < changes.length) {
    const current = changes[i]
    if (current.type === 'context') {
      if (!showOnlyChanges.value) {
        rows.push({ left: current.value, right: current.value, type: 'context' })
      }
      i += 1
      continue
    }

    if (current.type === 'remove') {
      const lefts: string[] = []
      while (i < changes.length && changes[i].type === 'remove') {
        lefts.push(changes[i].value)
        i += 1
      }
      const rights: string[] = []
      while (i < changes.length && changes[i].type === 'add') {
        rights.push(changes[i].value)
        i += 1
      }
      const maxLen = Math.max(lefts.length, rights.length)
      for (let j = 0; j < maxLen; j += 1) {
        const l = lefts[j] ?? ''
        const r = rights[j] ?? ''
        rows.push({ left: l, right: r, type: l && r ? 'change' : (l ? 'remove' as const : 'add' as const) })
      }
      continue
    }

    if (current.type === 'add') {
      const rights: string[] = []
      while (i < changes.length && changes[i].type === 'add') {
        rights.push(changes[i].value)
        i += 1
      }
      for (const r of rights) {
        rows.push({ left: '', right: r, type: 'add' })
      }
      continue
    }
  }
  return rows
}

const sideBySideRows = computed<SideBySideRow[]>(() => {
  if (!result.value) return []
  return buildSideBySideRows(result.value.changes)
})

function cellClass(type: SideBySideRow['type'], side: 'left' | 'right') {
  if (type === 'context') return 'bg-transparent'
  if (type === 'change') return 'bg-amber-50 text-amber-800'
  if (type === 'add') return side === 'right' ? 'bg-emerald-50 text-emerald-800' : 'bg-transparent'
  if (type === 'remove') return side === 'left' ? 'bg-rose-50 text-rose-800' : 'bg-transparent'
  return 'bg-transparent'
}

function leftPrefix(type: SideBySideRow['type']) {
  if (type === 'remove') return '-'
  if (type === 'change') return '~'
  return ' '
}

function rightPrefix(type: SideBySideRow['type']) {
  if (type === 'add') return '+'
  if (type === 'change') return '~'
  return ' '
}

// Inline diff within a single line for 'change' rows
interface InlineSegment { text: string; kind: 'same' | 'add' | 'remove' }

function tokenizeByChar(input: string): string[] {
  // Keep characters including spaces/newlines
  return Array.from(input)
}

function computeLcsMatrix(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp
}

function backtrackLcs(a: string[], b: string[], dp: number[][]): { sameAIdx: number[]; sameBIdx: number[] } {
  const sameAIdx: number[] = []
  const sameBIdx: number[] = []
  let i = a.length
  let j = b.length
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      sameAIdx.push(i - 1)
      sameBIdx.push(j - 1)
      i -= 1
      j -= 1
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i -= 1
    } else {
      j -= 1
    }
  }
  sameAIdx.reverse()
  sameBIdx.reverse()
  return { sameAIdx, sameBIdx }
}

function groupSegments(tokens: string[], sameIdx: Set<number>, sameKind: 'same', diffKind: 'add' | 'remove'): InlineSegment[] {
  const segments: InlineSegment[] = []
  let buffer = ''
  let currentKind: InlineSegment['kind'] | null = null
  for (let i = 0; i < tokens.length; i += 1) {
    const kind = sameIdx.has(i) ? sameKind : diffKind
    if (currentKind === null) {
      currentKind = kind
      buffer = tokens[i]
    } else if (currentKind === kind) {
      buffer += tokens[i]
    } else {
      segments.push({ text: buffer, kind: currentKind })
      currentKind = kind
      buffer = tokens[i]
    }
  }
  if (buffer) segments.push({ text: buffer, kind: currentKind ?? sameKind })
  return segments
}

function computeInlineSegments(leftText: string, rightText: string): { left: InlineSegment[]; right: InlineSegment[] } {
  const a = tokenizeByChar(leftText)
  const b = tokenizeByChar(rightText)
  if (a.length === 0 && b.length === 0) return { left: [], right: [] }
  const dp = computeLcsMatrix(a, b)
  const { sameAIdx, sameBIdx } = backtrackLcs(a, b, dp)
  const sameASet = new Set<number>(sameAIdx)
  const sameBSet = new Set<number>(sameBIdx)
  return {
    left: groupSegments(a, sameASet, 'same', 'remove'),
    right: groupSegments(b, sameBSet, 'same', 'add'),
  }
}

function inlineForRow(row: SideBySideRow): { left: InlineSegment[]; right: InlineSegment[] } {
  if (row.type !== 'change') return { left: [], right: [] }
  return computeInlineSegments(row.left, row.right)
}

function segmentClass(seg: InlineSegment, side: 'left' | 'right') {
  if (seg.kind === 'same') return ''
  if (seg.kind === 'add') return 'bg-emerald-200/60'
  if (seg.kind === 'remove') return 'bg-rose-200/60'
  return ''
}
</script>

<style scoped>
.diff-workspace {
  height: calc(100dvh - 32px);
  min-height: 640px;
  display: grid;
  grid-template-rows: minmax(320px, 55%) auto minmax(200px, 1fr);
  gap: var(--space-tight);
  overflow: hidden;
}

.diff-input-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-tight);
  min-height: 0;
}

.diff-input-card {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-tight);
  padding: var(--space-tight);
}

.diff-input-header {
  display: flex;
  align-items: center;
  gap: var(--space-tight);
  flex: 0 0 auto;
}

.diff-input-title {
  min-width: 82px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.diff-file-input {
  min-width: 120px;
  flex: 1;
}

.diff-input-editor {
  min-height: 0;
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

.diff-result-card {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.diff-result-header {
  display: flex;
  align-items: center;
  gap: var(--space-card);
  flex: 0 0 auto;
  padding: 6px var(--space-element);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  border-bottom: 1px solid var(--color-border);
}

.diff-result-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
}

@media (max-width: 960px) {
  .diff-workspace {
    height: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: visible;
  }

  .diff-input-grid {
    grid-template-columns: 1fr;
  }

  .diff-input-editor {
    height: 280px;
    flex: none;
  }

  .diff-result-card {
    max-height: 480px;
  }
}
</style>


