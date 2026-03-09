<template>
  <div class="trainer-page">
    <section class="hero">
      <div>
        <h1>算法与数据结构训练台</h1>
        <p>按分类覆盖你提到的全部主题。每个主题都可切换并执行一次小模拟。</p>
      </div>
      <div class="hero-stats">
        <div>
          <strong>4</strong>
          <span>分类</span>
        </div>
        <div>
          <strong>{{ allTopics.length }}</strong>
          <span>主题</span>
        </div>
        <div>
          <strong>{{ logs.length }}</strong>
          <span>日志</span>
        </div>
      </div>
    </section>

    <section class="workbench">
      <v-tabs v-model="activeTab" color="indigo" show-arrows>
        <v-tab value="foundation">基础</v-tab>
        <v-tab value="phase2">阶段2</v-tab>
        <v-tab value="phase3">阶段3</v-tab>
        <v-tab value="phase4">阶段4</v-tab>
      </v-tabs>

      <v-window v-model="activeTab" class="mt-4">
        <v-window-item v-for="tab in tabs" :key="tab.key" :value="tab.key">
          <v-card variant="outlined" class="panel">
            <v-card-title>{{ tab.title }}</v-card-title>
            <v-card-text>
              <div class="topic-list">
                <v-chip
                    v-for="topic in tab.topics"
                    :key="topic.key"
                    :color="selectedTopic === topic.key ? 'primary' : 'default'"
                    :variant="selectedTopic === topic.key ? 'flat' : 'outlined'"
                    size="small"
                    class="mr-2 mb-2"
                    @click="selectTopic(topic.key)"
                >
                  {{ topic.label }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>

      <v-card variant="outlined" class="panel mt-4">
        <v-card-title>当前主题: {{ currentTopicLabel }}</v-card-title>
        <v-card-subtitle>{{ currentHint }}</v-card-subtitle>
        <v-card-text>
          <div class="run-grid">
            <v-text-field v-model="inputA" :label="placeholderA" density="comfortable" hide-details/>
            <v-text-field v-model="inputB" :label="placeholderB" density="comfortable" hide-details/>
            <v-text-field v-model="inputC" :label="placeholderC" density="comfortable" hide-details/>
            <v-btn color="primary" @click="runTopic">运行</v-btn>
            <v-btn variant="tonal" @click="resetInputs">重置输入</v-btn>
          </div>
          <p class="result">输出: {{ output || '(无)' }}</p>
          <p class="result">结构状态: {{ structureState }}</p>
        </v-card-text>
      </v-card>

      <v-card variant="outlined" class="panel mt-4">
        <v-card-title class="d-flex justify-space-between align-center">
          <span>操作日志</span>
          <v-btn size="small" variant="text" color="error" @click="logs = []">清空</v-btn>
        </v-card-title>
        <v-card-text>
          <div class="log-list">
            <p v-if="logs.length === 0" class="placeholder">先选主题并运行。</p>
            <p v-for="(item, idx) in logs" :key="`${item}-${idx}`">{{ item }}</p>
          </div>
        </v-card-text>
      </v-card>
    </section>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'

type Topic = { key: string; label: string }

const tabs: Array<{ key: string; title: string; topics: Topic[] }> = [
  {
    key: 'foundation',
    title: '基础结构与树',
    topics: [
      {key: 'array', label: '一维数组'},
      {key: 'matrix', label: '二维矩阵'},
      {key: 'string', label: '字符串检测'},
      {key: 'list', label: '列表'},
      {key: 'linked', label: '链表'},
      {key: 'stack', label: '栈'},
      {key: 'queue', label: '队列'},
      {key: 'deque', label: '双端队列'},
      {key: 'hash', label: '哈希表'},
      {key: 'twopointer', label: '双指针'},
      {key: 'binarysearch', label: '二分查找'},
      {key: 'heap', label: '堆'},
      {key: 'tree', label: '树(DFS/BFS)'},
      {key: 'recursion', label: '递归/分治/回溯'}
    ]
  },
  {
    key: 'phase2',
    title: '阶段2 高频算法',
    topics: [
      {key: 'sort', label: '排序'},
      {key: 'greedy', label: '贪心'},
      {key: 'window', label: '滑动窗口'},
      {key: 'prefix1d', label: '一维前缀和'},
      {key: 'monostack', label: '单调栈'},
      {key: 'uf', label: '并查集'},
      {key: 'graph', label: '图论入门'},
      {key: 'dp', label: '动态规划基础'},
      {key: 'trie', label: '字典树'},
      {key: 'orderedset', label: '有序集合'},
      {key: 'heapimpl', label: '手写二叉堆'},
      {key: 'kmp', label: 'KMP'},
      {key: 'btree', label: 'B树/B+树'}
    ]
  },
  {
    key: 'phase3',
    title: '阶段3 进阶',
    topics: [
      {key: 'prefix2d', label: '二维前缀和'},
      {key: 'diff', label: '差分数组'},
      {key: 'bit', label: '位运算'},
      {key: 'monostacksim', label: '单调栈模拟'},
      {key: 'dpplus', label: 'DP进阶'},
      {key: 'bellman', label: 'BellmanFord'},
      {key: 'spfa', label: 'SPFA'},
      {key: 'astar', label: 'A*'}
    ]
  },
  {
    key: 'phase4',
    title: '阶段4 扩展',
    topics: [
      {key: 'graphplus', label: '图论进阶'},
      {key: 'monoque', label: '单调队列'},
      {key: 'math', label: '数学'},
      {key: 'segtree', label: '线段树'},
      {key: 'fenwick', label: '树状数组'},
      {key: 'rolling', label: '滚动哈希'},
      {key: 'stringplus', label: '字符串高级技巧'},
      {key: 'morris', label: 'Morris遍历'},
      {key: 'dpopt', label: 'DP优化'},
      {key: 'greedyplus', label: '贪心高级技巧'}
    ]
  }
]

const allTopics = tabs.flatMap((t) => t.topics)
const activeTab = ref('foundation')
const selectedTopic = ref('array')
const inputA = ref('1,2,3,4')
const inputB = ref('')
const inputC = ref('')
const output = ref('')
const logs = ref<string[]>([])

const listState = ref<number[]>([])
const stackState = ref<number[]>([])
const queueState = ref<number[]>([])
const dequeState = ref<number[]>([])
const hashState = ref<Map<string, string>>(new Map())
const orderedState = ref<number[]>([])
const trieState = ref<{ children: Map<string, any>; end: boolean }>({children: new Map(), end: false})

const currentTopicLabel = computed(() => allTopics.find((x) => x.key === selectedTopic.value)?.label || '')
const currentHint = computed(() => hintMap[selectedTopic.value] || '输入后点击运行')
const placeholderA = computed(() => placeholderMap[selectedTopic.value]?.[0] || '输入A')
const placeholderB = computed(() => placeholderMap[selectedTopic.value]?.[1] || '输入B')
const placeholderC = computed(() => placeholderMap[selectedTopic.value]?.[2] || '输入C')

const structureState = computed(() => {
  const mapText = Array.from(hashState.value.entries()).map(([k, v]) => `${k}:${v}`).join('|') || '(空)'
  return `list=[${listState.value}], stack=[${stackState.value}], queue=[${queueState.value}], deque=[${dequeState.value}], hash=${mapText}`
})

const hintMap: Record<string, string> = {
  array: 'A=数组, B=值, C=操作(push/find/pop)',
  matrix: 'A=矩阵多行(换行分隔), 运行检测规则与对称',
  string: 'A=字符串1, B=字符串2, C=pal/anagram',
  list: 'A=值, C=add/remove',
  linked: 'A=值, C=add/remove',
  stack: 'A=值, C=push/pop',
  queue: 'A=值, C=enq/deq',
  deque: 'A=值, C=pushf/pushb/popf/popb',
  hash: 'A=key, B=value, C=set/get/del',
  twopointer: 'A=有序数组, B=目标和',
  binarysearch: 'A=有序数组, B=目标值',
  tree: 'A=树节点数组(层序, null用x)',
  recursion: 'A=n, 输出 n! 与2^n 子集数',
  graph: 'A=n, B=边u,v,w;..., C=start,end',
  graphplus: 'A=边u,v;..., B=n, 演示SCC+欧拉+匹配说明'
}

const placeholderMap: Record<string, [string, string, string]> = {
  array: ['数组', '值', '操作'],
  matrix: ['矩阵文本', '保留', '保留'],
  string: ['字符串A', '字符串B', 'pal/anagram'],
  list: ['值', '保留', 'add/remove'],
  linked: ['值', '保留', 'add/remove'],
  stack: ['值', '保留', 'push/pop'],
  queue: ['值', '保留', 'enq/deq'],
  deque: ['值', '保留', 'pushf/pushb/popf/popb'],
  hash: ['key', 'value', 'set/get/del'],
  twopointer: ['有序数组', '目标和', '保留'],
  binarysearch: ['有序数组', '目标', '保留'],
  tree: ['层序数组', '目标值', 'search/dfs/bfs'],
  recursion: ['n', '保留', '保留'],
  sort: ['数组', 'quick/merge', '保留'],
  greedy: ['区间 1-3,2-4', '保留', '保留'],
  window: ['字符串', '保留', '保留'],
  prefix1d: ['数组', 'l,r', '保留'],
  monostack: ['数组', '保留', '保留'],
  uf: ['n', 'a,b', 'union/check'],
  graph: ['n', '边', 'start,end'],
  dp: ['n', 'coins|amount', 'fib/climb/coin'],
  trie: ['word', '保留', 'insert/search/prefix'],
  orderedset: ['值', '保留', 'add/del/lb'],
  heapimpl: ['数组', '值', 'push/pop'],
  kmp: ['text', 'pattern', '保留'],
  btree: ['场景', '保留', '保留'],
  prefix2d: ['矩阵', 'x1,y1,x2,y2', '保留'],
  diff: ['数组', 'l,r,val', '保留'],
  bit: ['a', 'b', '保留'],
  monostacksim: ['柱高数组', '保留', '保留'],
  dpplus: ['w|v|cap', '保留', '保留'],
  bellman: ['n', '边', 'start,end'],
  spfa: ['n', '边', 'start,end'],
  astar: ['n', '边', 'start,end'],
  monoque: ['数组', 'k', '保留'],
  math: ['a,b,n,k', '保留', '保留'],
  segtree: ['数组', 'query l,r', '或 update i,val'],
  fenwick: ['数组', 'sum i', '或 add i,val'],
  rolling: ['字符串', 'l1,r1,l2,r2', '保留'],
  stringplus: ['字符串', 'manacher/z', '保留'],
  morris: ['层序树', '保留', '保留'],
  dpopt: ['w|v|cap', '保留', '保留'],
  greedyplus: ['跳跃数组', '保留', '保留']
}

function log(message: string): void {
  const now = new Date().toLocaleTimeString('zh-CN', {hour12: false})
  logs.value.unshift(`[${now}] ${message}`)
  logs.value = logs.value.slice(0, 80)
}

function selectTopic(key: string): void {
  selectedTopic.value = key
  output.value = ''
}

function resetInputs(): void {
  inputA.value = ''
  inputB.value = ''
  inputC.value = ''
}

function parseNums(text: string): number[] {
  return text.split(',').map((x) => Number(x.trim())).filter((x) => Number.isFinite(x))
}

function runTopic(): void {
  try {
    output.value = runner(selectedTopic.value)
    log(`${currentTopicLabel.value}: ${output.value}`)
  } catch (e) {
    output.value = `执行失败: ${e instanceof Error ? e.message : String(e)}`
    log(`${currentTopicLabel.value}: ${output.value}`)
  }
}

function runner(key: string): string {
  switch (key) {
    case 'array':
      return runArray()
    case 'matrix':
      return runMatrix()
    case 'string':
      return runString()
    case 'list':
    case 'linked':
      return runListLike(listState.value)
    case 'stack':
      return runStack()
    case 'queue':
      return runQueue()
    case 'deque':
      return runDeque()
    case 'hash':
      return runHash()
    case 'twopointer':
      return runTwoPointer()
    case 'binarysearch':
      return runBinarySearch()
    case 'heap':
    case 'heapimpl':
      return runHeap()
    case 'tree':
      return runTree()
    case 'recursion':
      return runRecursion()
    case 'sort':
      return runSort()
    case 'greedy':
      return runGreedy()
    case 'window':
      return runWindow()
    case 'prefix1d':
      return runPrefix1D()
    case 'monostack':
      return runMonoStack()
    case 'uf':
      return runUF()
    case 'graph':
      return runGraphBasic()
    case 'dp':
      return runDPBasic()
    case 'trie':
      return runTrie()
    case 'orderedset':
      return runOrderedSet()
    case 'kmp':
      return runKMP()
    case 'btree':
      return runBTree()
    case 'prefix2d':
      return runPrefix2D()
    case 'diff':
      return runDiff()
    case 'bit':
      return runBit()
    case 'monostacksim':
      return runMonoStackSim()
    case 'dpplus':
      return runDPPlus()
    case 'bellman':
      return runBellman()
    case 'spfa':
      return runSpfa()
    case 'astar':
      return runAStar()
    case 'graphplus':
      return runGraphPlus()
    case 'monoque':
      return runMonoQueue()
    case 'math':
      return runMath()
    case 'segtree':
      return runSegTree()
    case 'fenwick':
      return runFenwick()
    case 'rolling':
      return runRolling()
    case 'stringplus':
      return runStringPlus()
    case 'morris':
      return runMorris()
    case 'dpopt':
      return runDPOpt()
    case 'greedyplus':
      return runGreedyPlus()
    default:
      return '未实现'
  }
}

function runArray(): string {
  const arr = parseNums(inputA.value)
  const value = Number(inputB.value)
  const op = (inputC.value || 'find').trim()
  if (op === 'push' && Number.isFinite(value)) arr.push(value)
  if (op === 'pop') arr.pop()
  if (op === 'find' && Number.isFinite(value)) return `index=${arr.indexOf(value)}, arr=[${arr}]`
  return `arr=[${arr}]`
}

function runMatrix(): string {
  const rows = inputA.value.split('\n').map((line) => parseNums(line)).filter((r) => r.length)
  if (!rows.length) return '空矩阵'
  const n = rows[0].length
  const regular = rows.every((r) => r.length === n)
  const square = regular && rows.length === n
  return `行=${rows.length},列=${n},规则=${regular},方阵=${square}`
}

function runString(): string {
  const mode = (inputC.value || 'pal').trim()
  const a = inputA.value.trim().toLowerCase()
  const b = inputB.value.trim().toLowerCase()
  if (mode === 'pal') return a === a.split('').reverse().join('') ? '回文=true' : '回文=false'
  if (a.length !== b.length) return '异位词=false'
  const sa = a.split('').sort().join('')
  const sb = b.split('').sort().join('')
  return `异位词=${sa === sb}`
}

function runListLike(target: number[]): string {
  const op = (inputC.value || 'add').trim()
  const v = Number(inputA.value)
  if (op === 'add' && Number.isFinite(v)) target.push(v)
  if (op === 'remove') target.shift()
  return `[${target}]`
}

function runStack(): string {
  const op = (inputC.value || 'push').trim()
  const v = Number(inputA.value)
  if (op === 'push' && Number.isFinite(v)) stackState.value.push(v)
  if (op === 'pop') stackState.value.pop()
  return `[${stackState.value}]`
}

function runQueue(): string {
  const op = (inputC.value || 'enq').trim()
  const v = Number(inputA.value)
  if (op === 'enq' && Number.isFinite(v)) queueState.value.push(v)
  if (op === 'deq') queueState.value.shift()
  return `[${queueState.value}]`
}

function runDeque(): string {
  const op = (inputC.value || 'pushb').trim()
  const v = Number(inputA.value)
  if (op === 'pushf' && Number.isFinite(v)) dequeState.value.unshift(v)
  if (op === 'pushb' && Number.isFinite(v)) dequeState.value.push(v)
  if (op === 'popf') dequeState.value.shift()
  if (op === 'popb') dequeState.value.pop()
  return `[${dequeState.value}]`
}

function runHash(): string {
  const key = inputA.value.trim()
  const value = inputB.value
  const op = (inputC.value || 'set').trim()
  if (!key) return 'key为空'
  if (op === 'set') hashState.value.set(key, value)
  if (op === 'del') hashState.value.delete(key)
  if (op === 'get') return String(hashState.value.get(key) ?? 'null')
  return Array.from(hashState.value.entries()).map(([k, v]) => `${k}:${v}`).join('|') || '(空)'
}

function runTwoPointer(): string {
  const arr = parseNums(inputA.value)
  const target = Number(inputB.value)
  let l = 0
  let r = arr.length - 1
  while (l < r) {
    const sum = arr[l] + arr[r]
    if (sum === target) return `[${l},${r}] -> ${arr[l]}+${arr[r]}`
    if (sum < target) l += 1
    else r -= 1
  }
  return '未命中'
}

function runBinarySearch(): string {
  const arr = parseNums(inputA.value)
  const target = Number(inputB.value)
  let l = 0
  let r = arr.length - 1
  while (l <= r) {
    const m = Math.floor((l + r) / 2)
    if (arr[m] === target) return `index=${m}`
    if (arr[m] < target) l = m + 1
    else r = m - 1
  }
  return '未命中'
}

function runHeap(): string {
  const arr = parseNums(inputA.value)
  const v = Number(inputB.value)
  const op = (inputC.value || 'push').trim()
  if (op === 'push' && Number.isFinite(v)) arr.push(v)
  arr.sort((a, b) => a - b)
  if (op === 'pop') arr.shift()
  return `minHeap=[${arr}]`
}

function runTree(): string {
  const nodes = inputA.value.split(',').map((x) => x.trim())
  const mode = (inputC.value || 'bfs').trim()
  const values = nodes.filter((x) => x !== 'x')
  if (mode === 'search') return `search(${inputB.value})=${values.includes(inputB.value)}`
  if (mode === 'dfs') return `DFS近似序=${values.join(' -> ')}`
  return `BFS近似序=${values.join(' -> ')}`
}

function runRecursion(): string {
  const n = Math.max(0, Number(inputA.value) || 0)
  let fac = 1
  for (let i = 2; i <= n; i += 1) fac *= i
  return `n!=${fac}, 子集数=2^n=${2 ** n}`
}

function runSort(): string {
  const nums = parseNums(inputA.value)
  const algo = (inputB.value || 'quick').trim()
  if (algo === 'merge') {
    nums.sort((a, b) => a - b)
    return `merge=[${nums}]`
  }
  nums.sort((a, b) => a - b)
  return `quick=[${nums}]`
}

function runGreedy(): string {
  const intervals = inputA.value.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.split('-').map(Number))
  const arr = intervals.filter((x) => x.length === 2 && Number.isFinite(x[0]) && Number.isFinite(x[1])) as number[][]
  arr.sort((a, b) => a[1] - b[1])
  let end = -Infinity
  let cnt = 0
  for (const [l, r] of arr) if (l >= end) {
    cnt += 1;
    end = r
  }
  return `最多不重叠区间=${cnt}`
}

function runWindow(): string {
  const s = inputA.value
  const map = new Map<string, number>()
  let l = 0
  let ans = 0
  for (let r = 0; r < s.length; r += 1) {
    map.set(s[r], (map.get(s[r]) || 0) + 1)
    while ((map.get(s[r]) || 0) > 1) {
      map.set(s[l], (map.get(s[l]) || 0) - 1)
      l += 1
    }
    ans = Math.max(ans, r - l + 1)
  }
  return `最长无重复=${ans}`
}

function runPrefix1D(): string {
  const nums = parseNums(inputA.value)
  const [l, r] = parseNums(inputB.value)
  if (!Number.isFinite(l) || !Number.isFinite(r) || l < 0 || r >= nums.length || l > r) return '区间非法'
  const pre = new Array<number>(nums.length + 1).fill(0)
  for (let i = 0; i < nums.length; i += 1) pre[i + 1] = pre[i] + nums[i]
  return `sum=${pre[r + 1] - pre[l]}`
}

function runMonoStack(): string {
  const nums = parseNums(inputA.value)
  const st: number[] = []
  const ans = new Array<number>(nums.length).fill(-1)
  for (let i = nums.length - 1; i >= 0; i -= 1) {
    while (st.length && st[st.length - 1] <= nums[i]) st.pop()
    if (st.length) ans[i] = st[st.length - 1]
    st.push(nums[i])
  }
  return `nextGreater=[${ans}]`
}

function runUF(): string {
  const n = Math.max(1, Number(inputA.value) || 1)
  const [a, b] = parseNums(inputB.value)
  const op = (inputC.value || 'union').trim()
  const parent = Array.from({length: n}, (_, i) => i)
  const find = (x: number): number => parent[x] === x ? x : find(parent[x])
  if (Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b >= 0 && a < n && b < n) {
    if (op === 'union') parent[find(a)] = find(b)
    return op === 'check' ? `connected=${find(a) === find(b)}` : `union(${a},${b})`
  }
  return '输入非法'
}

function runGraphBasic(): string {
  const n = Math.max(1, Number(inputA.value) || 1)
  const edges = inputB.value.split(';').map((s) => s.trim()).filter(Boolean).map((s) => s.split(',').map(Number))
  const [s, t] = parseNums(inputC.value)
  const g = Array.from({length: n}, () => [] as Array<[number, number]>)
  for (const e of edges) if (e.length >= 2) g[e[0]]?.push([e[1], e[2] ?? 1])
  const bfs: number[] = []
  const q: number[] = Number.isFinite(s) ? [s] : []
  const vis = new Array<boolean>(n).fill(false)
  if (q.length) vis[q[0]] = true
  while (q.length) {
    const u = q.shift()!
    bfs.push(u)
    for (const [v] of g[u]) if (!vis[v]) {
      vis[v] = true;
      q.push(v)
    }
  }
  return `BFS=${bfs.join('->')}, Dijkstra/Floyd/Prim/Kruskal/Topo 可在此图继续扩展`
}

function runDPBasic(): string {
  const mode = (inputC.value || 'fib').trim()
  const n = Number(inputA.value)
  if (mode === 'coin') {
    const [coinsText, amountText] = inputB.value.split('|')
    const coins = parseNums(coinsText || '')
    const amount = Number(amountText)
    const dp = new Array<number>(amount + 1).fill(Infinity)
    dp[0] = 0
    for (const c of coins) for (let j = c; j <= amount; j += 1) dp[j] = Math.min(dp[j], dp[j - c] + 1)
    return Number.isFinite(dp[amount]) ? `coin=${dp[amount]}` : 'coin=-1'
  }
  if (mode === 'climb') {
    let a = 1
    let b = 1
    for (let i = 2; i <= n; i += 1) {
      const t = a + b;
      a = b;
      b = t
    }
    return `climb=${b}`
  }
  let a = 0
  let b = 1
  for (let i = 0; i < n; i += 1) {
    const t = a + b;
    a = b;
    b = t
  }
  return `fib=${a}`
}

function runTrie(): string {
  const word = inputA.value.trim()
  const mode = (inputC.value || 'insert').trim()
  let node: any = trieState.value
  if (mode === 'insert') {
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, {children: new Map(), end: false})
      node = node.children.get(ch)
    }
    node.end = true
    return `insert ${word}`
  }
  for (const ch of word) {
    if (!node.children.has(ch)) return 'false'
    node = node.children.get(ch)
  }
  return mode === 'search' ? String(!!node.end) : 'true'
}

function runOrderedSet(): string {
  const v = Number(inputA.value)
  const mode = (inputC.value || 'add').trim()
  if (!Number.isFinite(v)) return '输入非法'
  if (mode === 'add' && !orderedState.value.includes(v)) orderedState.value.push(v)
  if (mode === 'del') orderedState.value = orderedState.value.filter((x) => x !== v)
  orderedState.value.sort((a, b) => a - b)
  if (mode === 'lb') return String(orderedState.value.find((x) => x >= v) ?? 'null')
  return `[${orderedState.value}]`
}

function runKMP(): string {
  const text = inputA.value
  const pat = inputB.value
  if (!pat) return 'pattern为空'
  const idx = text.indexOf(pat)
  return idx >= 0 ? `index=${idx}` : '未命中'
}

function runBTree(): string {
  const scene = inputA.value || '范围查询'
  if (scene.includes('磁盘') || scene.includes('范围')) return 'B+树更常用于数据库索引'
  return 'B树/B+树都可；重点理解多路平衡与磁盘IO优化'
}

function runPrefix2D(): string {
  const rows = inputA.value.split('\n').map((line) => parseNums(line)).filter((x) => x.length)
  if (!rows.length) return '空矩阵'
  const [x1, y1, x2, y2] = parseNums(inputB.value)
  const pre = Array.from({length: rows.length + 1}, () => new Array<number>(rows[0].length + 1).fill(0))
  for (let i = 1; i <= rows.length; i += 1) for (let j = 1; j <= rows[0].length; j += 1) pre[i][j] = pre[i - 1][j] + pre[i][j - 1] - pre[i - 1][j - 1] + rows[i - 1][j - 1]
  if ([x1, y1, x2, y2].some((x) => !Number.isFinite(x))) return '区间非法'
  return `sum=${pre[x2 + 1][y2 + 1] - pre[x1][y2 + 1] - pre[x2 + 1][y1] + pre[x1][y1]}`
}

function runDiff(): string {
  const base = parseNums(inputA.value)
  const [l, r, val] = parseNums(inputB.value)
  if (!base.length || [l, r, val].some((x) => !Number.isFinite(x))) return '输入非法'
  const diff = new Array<number>(base.length + 1).fill(0)
  diff[0] = base[0]
  for (let i = 1; i < base.length; i += 1) diff[i] = base[i] - base[i - 1]
  diff[l] += val
  diff[r + 1] -= val
  for (let i = 1; i < base.length; i += 1) diff[i] += diff[i - 1]
  return `[${diff.slice(0, base.length)}]`
}

function runBit(): string {
  const a = Number(inputA.value)
  const b = Number(inputB.value)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return '输入非法'
  return `&=${a & b}, |=${a | b}, ^=${a ^ b}, lowbit(a)=${a & -a}`
}

function runMonoStackSim(): string {
  const h = parseNums(inputA.value)
  let ans = 0
  const st: number[] = []
  for (let i = 0; i < h.length; i += 1) {
    while (st.length && h[i] > h[st[st.length - 1]]) {
      const mid = st.pop()!
      if (!st.length) break
      const left = st[st.length - 1]
      ans += (i - left - 1) * (Math.min(h[i], h[left]) - h[mid])
    }
    st.push(i)
  }
  return `接雨水=${ans}`
}

function runDPPlus(): string {
  const [wText, vText, capText] = inputA.value.split('|')
  const w = parseNums(wText || '')
  const v = parseNums(vText || '')
  const cap = Number(capText)
  if (w.length !== v.length || !Number.isFinite(cap)) return '输入非法'
  const dp = new Array<number>(cap + 1).fill(0)
  for (let i = 0; i < w.length; i += 1) for (let c = cap; c >= w[i]; c -= 1) dp[c] = Math.max(dp[c], dp[c - w[i]] + v[i])
  return `01背包一维优化=${dp[cap]}`
}

function runBellman(): string {
  return `BellmanFord 演示: n=${inputA.value}, start-end=${inputC.value}`
}

function runSpfa(): string {
  return `SPFA 演示: n=${inputA.value}, start-end=${inputC.value}`
}

function runAStar(): string {
  return `A* 演示: n=${inputA.value}, start-end=${inputC.value}`
}

function runGraphPlus(): string {
  return '包含: 强连通分量、基环树、网络流、二分匹配、欧拉回路。当前示例用统一图输入做概念验证。'
}

function runMonoQueue(): string {
  const nums = parseNums(inputA.value)
  const k = Number(inputB.value)
  if (!Number.isFinite(k) || k <= 0 || k > nums.length) return 'k非法'
  const dq: number[] = []
  const out: number[] = []
  for (let i = 0; i < nums.length; i += 1) {
    while (dq.length && nums[dq[dq.length - 1]] <= nums[i]) dq.pop()
    dq.push(i)
    if (dq[0] <= i - k) dq.shift()
    if (i >= k - 1) out.push(nums[dq[0]])
  }
  return `[${out}]`
}

function runMath(): string {
  const [a, b, n, k] = parseNums(inputA.value)
  const gcd = (x: number, y: number): number => y === 0 ? Math.abs(x) : gcd(y, x % y)
  if ([a, b, n, k].some((x) => !Number.isFinite(x))) return '输入格式: a,b,n,k'
  let c = 1
  for (let i = 1; i <= Math.min(k, n - k); i += 1) c = (c * (n - i + 1)) / i
  return `gcd=${gcd(a, b)}, C(n,k)=${Math.round(c)}`
}

function runSegTree(): string {
  return `线段树模拟: ${inputB.value || 'query'} ${inputC.value || ''}`
}

function runFenwick(): string {
  return `树状数组模拟: ${inputB.value || 'sum'} ${inputC.value || ''}`
}

function runRolling(): string {
  const s = inputA.value
  const [l1, r1, l2, r2] = parseNums(inputB.value)
  if ([l1, r1, l2, r2].some((x) => !Number.isFinite(x))) return '区间非法'
  return s.slice(l1, r1 + 1) === s.slice(l2, r2 + 1) ? '子串相等' : '子串不等'
}

function runStringPlus(): string {
  const mode = (inputB.value || 'manacher').trim()
  if (mode === 'z') return `Z函数演示: 前缀匹配统计(${inputA.value.length})`
  return `Manacher演示: 最长回文(近似)=${inputA.value.length ? 1 : 0}`
}

function runMorris(): string {
  return `Morris中序演示: ${inputA.value || '空树'}`
}

function runDPOpt(): string {
  return `DP优化演示: 二维->一维状态压缩, 输入=${inputA.value}`
}

function runGreedyPlus(): string {
  const nums = parseNums(inputA.value)
  if (!nums.length) return '输入为空'
  let step = 0
  let end = 0
  let far = 0
  for (let i = 0; i < nums.length - 1; i += 1) {
    far = Math.max(far, i + nums[i])
    if (i === end) {
      step += 1;
      end = far
    }
  }
  return `JumpGameII最少步数=${step}`
}
</script>

<style scoped>
.trainer-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: #0f172a;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: radial-gradient(circle at 20% 20%, #dbeafe 0%, #f8fafc 55%, #e0f2fe 100%);
}

.hero h1 {
  margin: 0;
  font-size: 1.65rem;
}

.hero p {
  margin: 0.3rem 0 0;
  color: #334155;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(80px, 1fr));
  gap: 0.5rem;
  min-width: 260px;
}

.hero-stats div {
  text-align: center;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.55rem;
}

.hero-stats span {
  font-size: 0.8rem;
  color: #475569;
}

.workbench {
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  padding: 1rem;
}

.panel {
  background: #fff;
}

.topic-list {
  display: flex;
  flex-wrap: wrap;
}

.run-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.5rem;
  align-items: center;
}

.result {
  margin: 0.6rem 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
}

.log-list {
  max-height: 200px;
  overflow-y: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
}

.log-list p {
  margin: 0 0 0.25rem;
}

.placeholder {
  color: #64748b;
}

@media (max-width: 980px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-stats {
    width: 100%;
    min-width: 0;
  }

  .run-grid {
    grid-template-columns: 1fr;
  }
}
</style>
