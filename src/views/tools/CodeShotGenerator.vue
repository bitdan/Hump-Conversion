<template>
  <div class="codeshot-page">
    <header class="hero">
      <h1>linger-format</h1>
    </header>

    <main class="carbon-board">
      <div class="board-controls">
        <nav class="toolbar">
          <v-select
              v-model="themeName"
              :items="themeOptions"
              class="toolbar-select toolbar-select--theme"
              density="compact"
              variant="outlined"
              hide-details
              prepend-inner-icon="mdi-palette"
          />
          <v-select
              v-model="language"
              :items="languageOptions"
              class="toolbar-select toolbar-select--language"
              density="compact"
              variant="outlined"
              hide-details
              prepend-inner-icon="mdi-web"
          />
          <v-select
              v-model="backgroundName"
              :items="backgroundOptions"
              class="toolbar-select toolbar-select--short background-swatch"
              :style="backgroundSwatchStyle"
              density="compact"
              variant="outlined"
              hide-details
          />
          <v-text-field
              v-model="fileName"
              class="toolbar-field"
              density="compact"
              variant="outlined"
              hide-details
              prepend-inner-icon="mdi-file-code-outline"
              placeholder="example.ts"
          />
        </nav>

        <div class="action-dock">
          <v-menu :close-on-content-click="false" location="bottom end">
            <template #activator="{ props }">
              <v-btn v-bind="props" icon="mdi-cog" variant="outlined" class="icon-btn"/>
            </template>
            <div class="settings-menu">
              <div class="setting-item">
                <span>字体大小</span>
                <v-slider v-model="fontSize" :min="12" :max="24" :step="1" density="compact" thumb-label hide-details/>
              </div>
              <div class="setting-item">
                <span>画布留白</span>
                <v-slider v-model="framePadding" :min="24" :max="96" :step="4" density="compact" thumb-label
                          hide-details/>
              </div>
              <v-switch v-model="showLineNumbers" label="行号" density="compact" hide-details inset/>
              <v-switch v-model="showHeader" label="标题栏" density="compact" hide-details inset/>
              <v-select v-model="windowStyle" :items="windowStyleOptions" density="compact" variant="outlined"
                        hide-details/>
            </div>
          </v-menu>
          <v-btn icon="mdi-content-copy" variant="outlined" class="icon-btn" :loading="copying" @click="copyImage"/>
          <v-btn class="export-btn" variant="outlined" append-icon="mdi-chevron-down" :loading="exporting"
                 @click="downloadImage">
            EXPORT
          </v-btn>
        </div>
      </div>

      <section class="shot-scroll">
        <div ref="shotRef" class="shot-stage" :style="stageStyle" @dragover.prevent @drop.prevent="handleDrop">
          <article class="code-window" :style="windowThemeStyle">
            <header v-if="showHeader" class="window-header" :class="`window-header--${windowStyle}`">
              <div v-if="windowStyle === 'mac'" class="mac-controls">
                <span class="control close"></span>
                <span class="control minimize"></span>
                <span class="control maximize"></span>
              </div>
              <div v-else class="tab-title">
                <v-icon icon="mdi-code-tags" size="16"/>
              </div>
              <span class="file-title">{{ fileName || 'snippet' }}</span>
              <span class="language-badge">{{ languageLabel }}</span>
            </header>

            <div class="editor-frame" :style="editorFrameStyle">
              <pre class="code-block" :style="codeBlockStyle"><code v-html="highlightedCode"></code></pre>
              <textarea
                  :value="code"
                  class="code-editor"
                  :style="editorInputStyle"
                  wrap="off"
                  spellcheck="false"
                  aria-label="代码编辑器"
                  @input="handleEditorInput"
                  @paste="handlePaste"
              />
            </div>
          </article>
        </div>
      </section>

      <div v-if="errorMessage" class="error-text">{{ errorMessage }}</div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, ref} from 'vue'
import html2canvas from 'html2canvas'

type ThemeName = 'midnight' | 'light' | 'terminal' | 'rose'
type BackgroundName = 'aurora' | 'paper' | 'graphite' | 'sunset'
type WindowStyle = 'mac' | 'minimal'

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
const backgroundName = ref<BackgroundName>('aurora')
const windowStyle = ref<WindowStyle>('mac')
const fileName = ref('example.ts')
const fontSize = ref(16)
const framePadding = ref(56)
const showLineNumbers = ref(true)
const showHeader = ref(true)
const exporting = ref(false)
const copying = ref(false)
const errorMessage = ref('')
const shotRef = ref<HTMLElement | null>(null)

const languageOptions = [
  {title: 'TypeScript', value: 'typescript'},
  {title: 'JavaScript', value: 'javascript'},
  {title: 'Vue', value: 'vue'},
  {title: 'Java', value: 'java'},
  {title: 'Python', value: 'python'},
  {title: 'SQL', value: 'sql'},
  {title: 'JSON', value: 'json'},
  {title: 'Shell', value: 'shell'},
  {title: '纯文本', value: 'text'}
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
  {title: 'macOS 窗口', value: 'mac'},
  {title: '极简标题栏', value: 'minimal'}
]

const themeOptions = Object.values(themes).map(item => ({title: item.title, value: item.value}))
const backgroundOptions = Object.values(backgrounds).map(item => ({title: item.title, value: item.value}))
const activeTheme = computed(() => themes[themeName.value])
const languageLabel = computed(() => languageOptions.find(item => item.value === language.value)?.title || 'Text')

const stageStyle = computed(() => ({
  background: backgrounds[backgroundName.value].style,
  padding: `${framePadding.value}px`
}))

const backgroundSwatchStyle = computed(() => ({
  background: backgrounds[backgroundName.value].style
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
  minWidth: `${Math.max(860, maxLineLength.value * fontSize.value * 0.64 + (showLineNumbers.value ? 98 : 52))}px`,
  minHeight: `${Math.max(260, codeLines.value.length * fontSize.value * 1.62 + 48)}px`
}))

const editorInputStyle = computed(() => ({
  ...codeBlockStyle.value,
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  lineHeight: '1.62',
  paddingLeft: showLineNumbers.value ? '78px' : '26px'
}))

const codeLines = computed(() => code.value.replace(/\r\n/g, '\n').split('\n'))
const tabSize = computed(() => language.value === 'java' ? 4 : 2)
const maxLineLength = computed(() => {
  return codeLines.value.reduce((max, line) => Math.max(max, visualLineLength(line)), 0)
})

const highlightedCode = computed(() => {
  return codeLines.value.map((line, index) => {
    const content = highlightLine(line, language.value)
    const lineNumber = showLineNumbers.value
        ? `<span class="line-number" style="color:${activeTheme.value.line}">${String(index + 1).padStart(2, ' ')}</span>`
        : ''
    return `<span class="code-line">${lineNumber}<span class="line-code">${content || '&nbsp;'}</span></span>`
  }).join('')
})

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
    if (char === '\t') {
      length += tabSize.value - (length % tabSize.value)
    } else {
      length += 1
    }
  }
  return length
}

function handleEditorInput(event: Event) {
  code.value = (event.target as HTMLTextAreaElement).value
}

function handlePaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text')
  if (!text) return

  event.preventDefault()
  code.value = normalizeCode(text)
}

function token(color: string, value: string, className: string) {
  return `<span class="${className}" style="color:${color}">${value}</span>`
}

function highlightLine(line: string, mode: string) {
  const theme = activeTheme.value
  if (!line.trim()) return ''

  if (mode === 'text') return escapeHtml(line)
  return splitLineSegments(line, mode).map(segment => {
    if (segment.type === 'string') {
      return token(theme.string, escapeHtml(segment.value), 'syntax-string')
    }
    if (segment.type === 'comment') {
      return token(theme.comment, escapeHtml(segment.value), 'syntax-comment')
    }
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

  for (let i = 0; i < codePart.length; i += 1) {
    const char = codePart[i]
    const previous = codePart[i - 1]
    if (quote) {
      stringBuffer += char
      if (char === quote && previous !== '\\') {
        segments.push({type: 'string', value: stringBuffer})
        quote = null
        stringBuffer = ''
      }
      continue
    }

    if (char === '"' || char === '\'' || char === '`') {
      if (buffer) {
        segments.push({type: 'plain', value: buffer})
        buffer = ''
      }
      quote = char
      stringBuffer = char
      continue
    }

    buffer += char
  }

  if (stringBuffer) {
    segments.push({type: 'string', value: stringBuffer})
  }
  if (buffer) {
    segments.push({type: 'plain', value: buffer})
  }
  if (commentIndex >= 0) {
    segments.push({type: 'comment', value: line.slice(commentIndex)})
  }

  return segments
}

function findCommentIndex(line: string, mode: string) {
  const markers = mode === 'python' || mode === 'shell'
      ? ['#']
      : mode === 'sql'
          ? ['--']
          : ['//']
  let quote: string | null = null

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const previous = line[i - 1]
    if (quote) {
      if (char === quote && previous !== '\\') quote = null
      continue
    }
    if (char === '"' || char === '\'' || char === '`') {
      quote = char
      continue
    }
    if (markers.some(marker => line.startsWith(marker, i))) {
      return i
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
      const afterWord = value.slice(index + text.length)
      const isFunction = /^\s*\(/.test(afterWord)
      const key = mode === 'sql' ? text.toUpperCase() : text
      if (keywordSet.has(key)) {
        output += token(theme.keyword, escapeHtml(text), 'syntax-keyword')
      } else if (isFunction) {
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
  fileName.value = 'example.ts'
}

async function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  if (!file) return

  code.value = normalizeCode(await file.text())
  fileName.value = file.name
  language.value = detectLanguage(file.name)
}

function detectLanguage(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
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
  return map[ext || ''] || 'text'
}

async function downloadImage() {
  if (!shotRef.value) return
  exporting.value = true
  errorMessage.value = ''
  try {
    const canvas = await renderShotCanvas()
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `${(fileName.value || 'code-shot').replace(/[^\w.-]+/g, '-')}.png`
    link.click()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '导出失败'
  } finally {
    exporting.value = false
  }
}

async function copyImage() {
  if (!shotRef.value) return
  copying.value = true
  errorMessage.value = ''
  try {
    const canvas = await renderShotCanvas()
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      throw new Error('复制失败：图片生成失败')
    }
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      throw new Error('当前浏览器不支持复制图片到剪贴板')
    }
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '复制失败'
  } finally {
    copying.value = false
  }
}

async function renderShotCanvas() {
  if (!shotRef.value) {
    throw new Error('截图区域不存在')
  }
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
.codeshot-page {
  min-height: 100vh;
  background: #111111;
  color: #ffffff;
  padding: 28px 24px 42px;
}

.hero {
  max-width: 940px;
  margin: 0 auto;
  text-align: center;
}

.hero h1 {
  margin: 0;
  color: transparent;
  -webkit-text-stroke: 2px #fff200;
  text-stroke: 2px #fff200;
  font-family: Arial Black, Impact, sans-serif;
  font-size: 82px;
  line-height: 0.95;
  letter-spacing: 0;
}

.hero p {
  margin: 8px 0 0;
  color: #ffffff;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.32;
}

.carbon-board {
  max-width: min(1240px, calc(100vw - 48px));
  margin: 62px auto 0;
  border: 3px solid #f8fafc;
  border-radius: 8px;
  padding: 16px;
  background: #111111;
}

.board-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  min-width: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}

.toolbar-select {
  width: 176px;
  flex: 0 0 176px;
}

.toolbar-select--theme {
  width: 184px;
  flex-basis: 184px;
}

.toolbar-select--language {
  width: 172px;
  flex-basis: 172px;
}

.toolbar-select--short {
  width: 54px;
  flex-basis: 54px;
}

.toolbar-field {
  width: 128px;
  flex: 0 0 128px;
}

.toolbar :deep(.v-field) {
  background: #111111;
  color: #ffffff;
  border-radius: 3px;
}

.toolbar :deep(.v-field__outline) {
  --v-field-border-opacity: 1;
  color: #ffffff;
}

.toolbar :deep(.v-field__input),
.toolbar :deep(.v-select__selection-text),
.toolbar :deep(.v-icon) {
  color: #ffffff;
}

.background-swatch {
  border-radius: 3px;
}

.background-swatch :deep(.v-field) {
  background: transparent;
}

.background-swatch :deep(.v-field__input) {
  padding: 0;
}

.background-swatch :deep(.v-select__selection),
.background-swatch :deep(.v-field__append-inner) {
  display: none;
}

.icon-btn {
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 50%;
  color: #ffffff;
}

.action-dock {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: 8px;
  min-width: 0;
}

.action-dock :deep(.v-btn) {
  border-color: #ffffff;
}

.export-btn {
  height: 48px;
  min-width: 104px;
  border-radius: 4px;
  color: #9b5cff;
  letter-spacing: 1.5px;
  font-weight: 700;
}

.settings-menu {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #171717;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  color: #ffffff;
}

.setting-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.shot-scroll {
  overflow: auto;
}

.shot-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: max-content;
  min-width: 100%;
  min-height: 372px;
}

.code-window {
  width: max-content;
  min-width: 900px;
  max-width: none;
  border: 1px solid;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 26px 70px rgba(2, 6, 23, 0.32);
}

.window-header {
  min-height: 46px;
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  background: v-bind('activeTheme.header');
  border-bottom: 1px solid v-bind('activeTheme.border');
}

.window-header--minimal {
  grid-template-columns: 24px minmax(0, 1fr) auto;
}

.mac-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.close {
  background: #ff5f57;
}

.minimize {
  background: #ffbd2e;
}

.maximize {
  background: #28c840;
}

.tab-title {
  color: v-bind('activeTheme.muted');
}

.file-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: v-bind('activeTheme.foreground');
  font-size: 13px;
  font-weight: 700;
}

.language-badge {
  color: v-bind('activeTheme.muted');
  font-size: 12px;
}

.code-block {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 22px 0;
  overflow: hidden;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  white-space: pre;
  width: max-content;
  min-width: 100%;
  tab-size: v-bind('tabSize');
  pointer-events: none;
}

.editor-frame {
  position: relative;
  width: max-content;
}

.code-editor {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 22px 26px;
  border: 0;
  outline: 0;
  resize: none;
  overflow: hidden;
  background: transparent;
  color: transparent;
  -webkit-text-fill-color: transparent;
  caret-color: v-bind('activeTheme.foreground');
  font-family: Consolas, Monaco, 'Courier New', monospace;
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
  tab-size: v-bind('tabSize');
}

.code-editor::selection {
  background: rgba(96, 165, 250, 0.34);
  color: transparent;
}

.code-block :deep(.code-line) {
  display: flex;
  align-items: flex-start;
  min-height: 1.62em;
  padding: 0 26px;
}

.code-block :deep(.line-number) {
  flex: 0 0 auto;
  min-width: 34px;
  padding-right: 18px;
  text-align: right;
  user-select: none;
}

.code-block :deep(.line-code) {
  flex: 0 0 auto;
  min-width: max-content;
}

.error-text {
  color: #dc2626;
  font-size: 13px;
  margin-top: 12px;
}

@media (max-width: 1040px) {
  .carbon-board {
    max-width: calc(100vw - 32px);
  }

  .board-controls {
    flex-wrap: wrap;
  }

  .toolbar {
    flex-wrap: wrap;
  }

  .toolbar-select,
  .toolbar-select--short,
  .toolbar-field {
    flex: 1 1 220px;
    width: auto;
  }

  .action-dock {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .codeshot-page {
    padding: 20px 16px 32px;
  }

  .hero h1 {
    font-size: 60px;
  }

  .hero p {
    font-size: 18px;
  }

  .carbon-board {
    margin-top: 36px;
    padding: 12px;
  }

  .shot-stage {
    min-width: 100%;
  }

  .settings-menu {
    width: min(320px, calc(100vw - 32px));
  }
}
</style>
