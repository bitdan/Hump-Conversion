<template>
  <div class="p-4 space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <v-card class="p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="font-medium">文件 A</div>
          <v-btn size="small" variant="text" @click="clearBoth">清空</v-btn>
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
          <v-btn size="small" variant="text" @click="clearBoth">清空</v-btn>
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
      <v-btn variant="outlined" :disabled="!canRun" @click="formatBoth">格式化</v-btn>
      <v-switch v-model="showOnlyChanges" label="仅显示差异" inset class="ml-2" />
      <v-divider vertical class="mx-2" />
      <v-btn size="small" :disabled="diffTargets.length === 0" @click="prevDiff">上一处</v-btn>
      <v-btn size="small" :disabled="diffTargets.length === 0" @click="nextDiff">下一处</v-btn>
      <div class="text-xs text-gray-500 ml-2" v-if="diffTargets.length > 0">
        {{ activeDiffIndex + 1 }} / {{ diffTargets.length }}
      </div>
    </div>

    <v-card class="p-2">
      <div v-if="!result" class="text-gray-500 p-4">加载两侧内容并点击“对比”</div>
      <template v-else>
        <div class="text-sm px-3 py-2 text-gray-600 flex items-center gap-4">
          <div>
            新增: <span class="text-emerald-600 font-medium">{{ summary.added }}</span>
            删除: <span class="text-rose-600 font-medium">{{ summary.removed }}</span>
          </div>
          <div class="text-xs text-gray-500">侧边对比视图</div>
        </div>

        <div class="overflow-auto" ref="scrollContainer">
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
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
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

function clearBoth() {
  left.value = ''
  right.value = ''
  leftFile.value = null
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
</style>


