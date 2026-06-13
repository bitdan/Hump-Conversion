<template>
  <ToolPageLayout :card="false" :hide-header="true" density="workspace" max-width="max-w-full">
    <div class="codeshot-workspace">
      <div class="codeshot-toolbar glass-card">
        <v-select
          v-model="language"
          :items="languageOptions"
          label="语言"
          prepend-inner-icon="mdi-code-tags"
          density="compact"
          variant="outlined"
          hide-details
          class="toolbar-select"
        />
        <v-select
          v-model="themeName"
          :items="themeOptions"
          label="代码主题"
          prepend-inner-icon="mdi-palette-outline"
          density="compact"
          variant="outlined"
          hide-details
          class="toolbar-select"
        />
        <v-select
          v-model="backgroundName"
          :items="backgroundOptions"
          label="画布背景"
          prepend-inner-icon="mdi-image-filter-hdr"
          density="compact"
          variant="outlined"
          hide-details
          class="toolbar-select"
        />

        <v-divider vertical />
        <v-btn size="small" variant="text" prepend-icon="mdi-code-braces" @click="loadSample">
          示例
        </v-btn>

        <v-menu :close-on-content-click="false" location="bottom end">
          <template #activator="{ props }">
            <v-btn v-bind="props" size="small" variant="text" prepend-icon="mdi-tune-variant">
              截图设置
            </v-btn>
          </template>
          <div class="settings-menu solid-card">
            <div class="setting-item">
              <span>字体大小</span>
              <v-slider v-model="fontSize" :min="12" :max="24" :step="1" density="compact" thumb-label hide-details />
            </div>
            <div class="setting-item">
              <span>画布留白</span>
              <v-slider
                v-model="framePadding"
                :min="24"
                :max="96"
                :step="4"
                density="compact"
                thumb-label
                hide-details
              />
            </div>
            <v-switch v-model="showLineNumbers" label="显示行号" density="compact" hide-details inset />
            <v-switch v-model="showHeader" label="显示标题栏" density="compact" hide-details inset />
            <v-select
              v-model="windowStyle"
              :items="windowStyleOptions"
              label="窗口样式"
              density="compact"
              variant="outlined"
              hide-details
            />
          </div>
        </v-menu>

        <v-spacer />
        <span class="toolbar-summary">{{ codeLines.length }} 行</span>
        <v-btn
          size="small"
          color="primary"
          prepend-icon="mdi-content-copy"
          :loading="copying"
          @click="copyImage"
        >
          复制图片
        </v-btn>
      </div>

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        density="compact"
        closable
        @click:close="errorMessage = ''"
      >
        {{ errorMessage }}
      </v-alert>

      <div class="codeshot-main">
        <section class="editor-panel solid-card" @dragover.prevent @drop.prevent="handleDrop">
          <header class="panel-header">
            <div>
              <strong>代码编辑</strong>
              <span>支持拖入代码文件</span>
            </div>
            <v-chip size="x-small" color="primary" variant="tonal">{{ languageLabel }}</v-chip>
          </header>
          <CodeEditor
            v-model="code"
            :language="editorLanguage"
            :line-wrapping="false"
            placeholder="输入、粘贴或拖入代码..."
            class="source-editor"
          />
        </section>

        <section class="preview-panel solid-card">
          <header class="panel-header">
            <div>
              <strong>截图预览</strong>
              <span>复制图片时会导出完整画布</span>
            </div>
          </header>

          <div class="shot-scroll">
            <div ref="shotRef" class="shot-stage" :style="stageStyle">
              <article class="code-window" :style="windowThemeStyle">
                <header v-if="showHeader" class="window-header" :class="`window-header--${windowStyle}`">
                  <div v-if="windowStyle === 'mac'" class="mac-controls">
                    <span class="control control--close"></span>
                    <span class="control control--minimize"></span>
                    <span class="control control--maximize"></span>
                  </div>
                  <div v-else class="tab-title">
                    <v-icon icon="mdi-code-tags" size="16" />
                  </div>
                  <span class="file-title">{{ languageLabel }}</span>
                  <span class="header-spacer"></span>
                </header>

                <div class="editor-frame" :style="editorFrameStyle">
                  <pre class="code-block" :style="codeBlockStyle"><code v-html="highlightedCode"></code></pre>
                </div>
              </article>
            </div>
          </div>
        </section>
      </div>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import html2canvas from 'html2canvas'
import ToolPageLayout from '@/components/ToolPageLayout.vue'
import CodeEditor from '@/components/tools/CodeEditor.vue'

type ThemeName = 'midnight' | 'light' | 'terminal' | 'rose'
type BackgroundName = 'aurora' | 'paper' | 'graphite' | 'sunset'
type WindowStyle = 'mac' | 'minimal'
type EditorLanguage =
  | 'json'
  | 'html'
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'python'
  | 'sql'
  | 'text'

interface Theme {
  title: string
  value: ThemeName
  background: string
  foreground: string
  border: string
  header: string
  muted: string
  line: string
  keyword: string
  string: string
  number: string
  comment: string
  function: string
  operator: string
}

interface Background {
  title: string
  value: BackgroundName
  style: string
}

interface CodeSegment {
  type: 'plain' | 'string' | 'comment'
  value: string
}

const sampleCode = `type User = {
  id: number
  name: string
  roles: string[]
}

async function loadUser(id: number): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`)
  if (!response.ok) {
    throw new Error('User request failed')
  }

  return response.json()
}`

const code = ref(normalizeCode(sampleCode))
const language = ref('typescript')
const themeName = ref<ThemeName>('midnight')
const backgroundName = ref<BackgroundName>('paper')
const windowStyle = ref<WindowStyle>('mac')
const fontSize = ref(16)
const framePadding = ref(56)
const showLineNumbers = ref(true)
const showHeader = ref(true)
const copying = ref(false)
const errorMessage = ref('')
const shotRef = ref<HTMLElement | null>(null)

const languageOptions = [
  { title: 'TypeScript', value: 'typescript' },
  { title: 'JavaScript', value: 'javascript' },
  { title: 'Vue', value: 'vue' },
  { title: 'Java', value: 'java' },
  { title: 'Python', value: 'python' },
  { title: 'SQL', value: 'sql' },
  { title: 'JSON', value: 'json' },
  { title: 'Shell', value: 'shell' },
  { title: '纯文本', value: 'text' }
]

const themes: Record<ThemeName, Theme> = {
  midnight: {
    title: 'Midnight',
    value: 'midnight',
    background: '#0f172a',
    foreground: '#e5e7eb',
    border: 'rgba(148, 163, 184, 0.28)',
    header: '#111827',
    muted: '#94a3b8',
    line: '#64748b',
    keyword: '#93c5fd',
    string: '#86efac',
    number: '#fca5a5',
    comment: '#718096',
    function: '#fcd34d',
    operator: '#c4b5fd'
  },
  light: {
    title: 'Porcelain',
    value: 'light',
    background: '#ffffff',
    foreground: '#1f2937',
    border: 'rgba(100, 116, 139, 0.24)',
    header: '#f8fafc',
    muted: '#64748b',
    line: '#94a3b8',
    keyword: '#2563eb',
    string: '#15803d',
    number: '#c2410c',
    comment: '#64748b',
    function: '#7c3aed',
    operator: '#0891b2'
  },
  terminal: {
    title: 'Terminal',
    value: 'terminal',
    background: '#06130f',
    foreground: '#d1fae5',
    border: 'rgba(74, 222, 128, 0.24)',
    header: '#092017',
    muted: '#6ee7b7',
    line: '#44866f',
    keyword: '#34d399',
    string: '#fde68a',
    number: '#67e8f9',
    comment: '#4b8f76',
    function: '#bef264',
    operator: '#f0abfc'
  },
  rose: {
    title: 'Rose Ink',
    value: 'rose',
    background: '#2b1620',
    foreground: '#fff1f2',
    border: 'rgba(251, 113, 133, 0.26)',
    header: '#3a1c29',
    muted: '#fda4af',
    line: '#b65d70',
    keyword: '#f9a8d4',
    string: '#fef08a',
    number: '#fdba74',
    comment: '#c08497',
    function: '#a7f3d0',
    operator: '#c4b5fd'
  }
}

const backgrounds: Record<BackgroundName, Background> = {
  aurora: {
    title: 'Aurora',
    value: 'aurora',
    style: 'linear-gradient(135deg, #0f766e 0%, #2563eb 48%, #7c3aed 100%)'
  },
  paper: {
    title: 'Paper',
    value: 'paper',
    style: 'linear-gradient(135deg, #f8fafc 0%, #dbeafe 50%, #fef3c7 100%)'
  },
  graphite: {
    title: 'Graphite',
    value: 'graphite',
    style: 'linear-gradient(135deg, #111827 0%, #334155 55%, #0f172a 100%)'
  },
  sunset: {
    title: 'Sunset',
    value: 'sunset',
    style: 'linear-gradient(135deg, #f97316 0%, #e11d48 52%, #312e81 100%)'
  }
}

const windowStyleOptions = [
  { title: 'macOS 窗口', value: 'mac' },
  { title: '极简标题栏', value: 'minimal' }
]

const themeOptions = Object.values(themes).map(item => ({ title: item.title, value: item.value }))
const backgroundOptions = Object.values(backgrounds).map(item => ({ title: item.title, value: item.value }))
const activeTheme = computed(() => themes[themeName.value])
const languageLabel = computed(() => languageOptions.find(item => item.value === language.value)?.title || 'Text')
const editorLanguage = computed<EditorLanguage>(() => {
  if (language.value === 'vue') return 'html'
  if (language.value === 'shell') return 'text'
  return language.value as EditorLanguage
})

const stageStyle = computed(() => ({
  background: backgrounds[backgroundName.value].style,
  padding: `${framePadding.value}px`
}))

const windowThemeStyle = computed(() => ({
  background: activeTheme.value.background,
  color: activeTheme.value.foreground,
  borderColor: activeTheme.value.border
}))

const codeBlockStyle = computed(() => ({
  fontSize: `${fontSize.value}px`,
  lineHeight: '1.62',
  color: activeTheme.value.foreground,
  tabSize: String(tabSize.value)
}))

const editorFrameStyle = computed(() => ({
  minWidth: `${Math.max(680, maxLineLength.value * fontSize.value * 0.64 + (showLineNumbers.value ? 98 : 52))}px`,
  minHeight: `${Math.max(260, codeLines.value.length * fontSize.value * 1.62 + 48)}px`
}))

const codeLines = computed(() => normalizeCode(code.value).split('\n'))
const tabSize = computed(() => language.value === 'java' ? 4 : 2)
const maxLineLength = computed(() => codeLines.value.reduce((max, line) => Math.max(max, visualLineLength(line)), 0))

const highlightedCode = computed(() => codeLines.value.map((line, index) => {
  const content = highlightLine(line, language.value)
  const lineNumber = showLineNumbers.value
    ? `<span class="line-number" style="color:${activeTheme.value.line}">${String(index + 1).padStart(2, ' ')}</span>`
    : ''
  return `<span class="code-line">${lineNumber}<span class="line-code">${content || '&nbsp;'}</span></span>`
}).join(''))

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeCode(value: string) {
  return value.replace(/\r\n/g, '\n')
}

function visualLineLength(line: string) {
  let length = 0
  for (const char of line) {
    length += char === '\t' ? tabSize.value - (length % tabSize.value) : 1
  }
  return length
}

function token(color: string, value: string, className: string) {
  return `<span class="${className}" style="color:${color}">${value}</span>`
}

function highlightLine(line: string, mode: string) {
  const theme = activeTheme.value
  if (!line.trim()) return ''
  if (mode === 'text') return escapeHtml(line)

  return splitLineSegments(line, mode).map(segment => {
    if (segment.type === 'string') return token(theme.string, escapeHtml(segment.value), 'syntax-string')
    if (segment.type === 'comment') return token(theme.comment, escapeHtml(segment.value), 'syntax-comment')
    return highlightPlainText(segment.value, mode)
  }).join('')
}

function splitLineSegments(line: string, mode: string): CodeSegment[] {
  const segments: CodeSegment[] = []
  const commentIndex = findCommentIndex(line, mode)
  const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line
  let buffer = ''
  let quote: string | null = null
  let stringBuffer = ''

  for (let index = 0; index < codePart.length; index += 1) {
    const char = codePart[index]
    const previous = codePart[index - 1]
    if (quote) {
      stringBuffer += char
      if (char === quote && previous !== '\\') {
        segments.push({ type: 'string', value: stringBuffer })
        quote = null
        stringBuffer = ''
      }
    } else if (char === '"' || char === '\'' || char === '`') {
      if (buffer) segments.push({ type: 'plain', value: buffer })
      buffer = ''
      quote = char
      stringBuffer = char
    } else {
      buffer += char
    }
  }

  if (stringBuffer) segments.push({ type: 'string', value: stringBuffer })
  if (buffer) segments.push({ type: 'plain', value: buffer })
  if (commentIndex >= 0) segments.push({ type: 'comment', value: line.slice(commentIndex) })
  return segments
}

function findCommentIndex(line: string, mode: string) {
  const markers = mode === 'python' || mode === 'shell' ? ['#'] : mode === 'sql' ? ['--'] : ['//']
  let quote: string | null = null

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const previous = line[index - 1]
    if (quote) {
      if (char === quote && previous !== '\\') quote = null
    } else if (char === '"' || char === '\'' || char === '`') {
      quote = char
    } else if (markers.some(marker => line.startsWith(marker, index))) {
      return index
    }
  }
  return -1
}

function highlightPlainText(value: string, mode: string) {
  const theme = activeTheme.value
  const keywordSet = new Set(keywordList(mode).map(item => mode === 'sql' ? item.toUpperCase() : item))
  let output = ''
  let index = 0

  while (index < value.length) {
    const rest = value.slice(index)
    const word = rest.match(/^[A-Za-z_$][\w$]*/)
    if (word) {
      const text = word[0]
      const key = mode === 'sql' ? text.toUpperCase() : text
      if (keywordSet.has(key)) {
        output += token(theme.keyword, escapeHtml(text), 'syntax-keyword')
      } else if (/^\s*\(/.test(value.slice(index + text.length))) {
        output += token(theme.function, escapeHtml(text), 'syntax-function')
      } else {
        output += escapeHtml(text)
      }
      index += text.length
      continue
    }

    const number = rest.match(/^-?\d+(\.\d+)?/)
    if (number) {
      output += token(theme.number, escapeHtml(number[0]), 'syntax-number')
      index += number[0].length
      continue
    }

    const operator = rest.match(/^(===|!==|==|!=|=>|<=|>=|&&|\|\||[+\-*\/=<>])/)
    if (operator) {
      output += token(theme.operator, escapeHtml(operator[0]), 'syntax-operator')
      index += operator[0].length
      continue
    }

    output += escapeHtml(value[index])
    index += 1
  }
  return output
}

function keywordList(mode: string) {
  const common = 'const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|throw|new|class|extends|import|from|export|default|async|await|type|interface|public|private|protected|static|final|void|true|false|null|undefined'
  const maps: Record<string, string> = {
    typescript: common,
    javascript: common,
    vue: `${common}|template|script|style|setup|ref|computed|watch`,
    java: 'public|private|protected|class|interface|enum|extends|implements|static|final|void|int|long|double|float|boolean|String|new|return|if|else|for|while|switch|case|break|continue|try|catch|throw|throws|null|true|false|package|import',
    python: 'def|class|return|if|elif|else|for|while|try|except|raise|import|from|as|with|lambda|yield|async|await|None|True|False|self|in|is|not|and|or',
    sql: 'SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|LIMIT|INSERT|INTO|UPDATE|DELETE|CREATE|TABLE|ALTER|DROP|AND|OR|NOT|NULL|IS|AS|COUNT|SUM|AVG|MAX|MIN',
    shell: 'if|then|else|fi|for|while|do|done|case|esac|function|export|echo|cd|grep|awk|sed|curl|git|npm|mvn'
  }
  return maps[mode]?.split('|') ?? []
}

function loadSample() {
  code.value = normalizeCode(sampleCode)
  language.value = 'typescript'
}

async function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  code.value = normalizeCode(await file.text())
  language.value = detectLanguage(file.name)
}

function detectLanguage(name: string) {
  const extension = name.split('.').pop()?.toLowerCase()
  const languages: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    vue: 'vue',
    java: 'java',
    py: 'python',
    sql: 'sql',
    json: 'json',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell'
  }
  return languages[extension || ''] || 'text'
}

async function copyImage() {
  if (!shotRef.value) return
  copying.value = true
  errorMessage.value = ''
  try {
    const canvas = await renderShotCanvas()
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('复制失败：图片生成失败')
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      throw new Error('当前浏览器不支持复制图片到剪贴板')
    }
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '复制失败'
  } finally {
    copying.value = false
  }
}

async function renderShotCanvas() {
  if (!shotRef.value) throw new Error('截图区域不存在')
  await nextTick()
  return html2canvas(shotRef.value, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    width: shotRef.value.scrollWidth,
    height: shotRef.value.scrollHeight,
    windowWidth: shotRef.value.scrollWidth,
    windowHeight: shotRef.value.scrollHeight,
    scrollX: 0,
    scrollY: 0
  })
}
</script>

<style scoped>
.codeshot-workspace {
  height: calc(100dvh - 32px);
  min-height: 620px;
  display: flex;
  flex-direction: column;
  gap: var(--space-tight);
  overflow: hidden;
}

.codeshot-toolbar {
  min-height: 50px;
  display: flex;
  align-items: center;
  gap: var(--space-tight);
  padding: 6px var(--space-tight);
  overflow-x: auto;
}

.toolbar-select {
  width: 170px;
  flex: 0 0 170px;
}

.toolbar-summary,
.panel-header span {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.settings-menu {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.setting-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: var(--space-tight);
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.codeshot-main {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(360px, 0.85fr) minmax(0, 1.4fr);
  gap: var(--space-tight);
}

.editor-panel,
.preview-panel {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--space-tight);
  padding: var(--space-tight);
  overflow: hidden;
}

.panel-header {
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-tight);
}

.panel-header > div {
  display: flex;
  align-items: baseline;
  gap: var(--space-tight);
  min-width: 0;
}

.source-editor {
  min-height: 0;
}

.shot-scroll {
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-element);
  background: var(--color-bg);
}

.shot-stage {
  width: max-content;
  min-width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.code-window {
  width: max-content;
  min-width: 680px;
  overflow: hidden;
  border: 1px solid;
  border-radius: var(--radius-element);
  box-shadow: 0 26px 70px rgba(2, 6, 23, 0.32);
}

.window-header {
  min-height: 46px;
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 92px;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  background: v-bind('activeTheme.header');
  border-bottom: 1px solid v-bind('activeTheme.border');
}

.window-header--minimal {
  grid-template-columns: 24px minmax(0, 1fr) 24px;
}

.mac-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-pill);
}

.control--close {
  background: #ff5f57;
}

.control--minimize {
  background: #ffbd2e;
}

.control--maximize {
  background: #28c840;
}

.tab-title {
  color: v-bind('activeTheme.muted');
}

.file-title {
  justify-self: center;
  color: v-bind('activeTheme.foreground');
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
}

.editor-frame {
  width: max-content;
}

.code-block {
  width: max-content;
  min-width: 100%;
  margin: 0;
  padding: 22px 0;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  white-space: pre;
}

.code-block :deep(.code-line) {
  display: flex;
  align-items: flex-start;
  min-height: 1.62em;
  padding: 0 26px;
}

.code-block :deep(.line-number) {
  min-width: 34px;
  padding-right: 18px;
  text-align: right;
  user-select: none;
}

.code-block :deep(.line-code) {
  min-width: max-content;
}

@media (max-width: 1100px) {
  .codeshot-main {
    grid-template-columns: minmax(300px, 0.75fr) minmax(0, 1.25fr);
  }
}

@media (max-width: 820px) {
  .codeshot-workspace {
    height: auto;
    min-height: calc(100dvh - 24px);
    overflow: visible;
  }

  .codeshot-main {
    grid-template-columns: 1fr;
    grid-template-rows: 420px minmax(520px, 1fr);
  }
}
</style>
