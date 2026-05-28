<script setup lang="ts">
import {computed, ref} from 'vue'
import DOMPurify from 'dompurify'
import ToolPageLayout from '@/components/ToolPageLayout.vue'

const fileName = ref('简历')
const markdownContent = ref(``)

const previewRef = ref<HTMLElement | null>(null)
const editorRef = ref<any>(null)
const pageMarginMm = ref(8)
const baseFontSize = ref(13.5)
const lineHeight = ref(1.4)
const LAYOUT_LIMITS = {
  margin: {min: 5, max: 25, step: 1},
  fontSize: {min: 5, max: 20, step: 0.5},
  lineHeight: {min: 1.1, max: 2, step: 0.1}
}
const QUICK_LAYOUTS = [
  {label: '紧凑', margin: 6, fontSize: 12.5, lineHeight: 1.35},
  {label: '标准', margin: 8, fontSize: 13.5, lineHeight: 1.4},
  {label: '宽松', margin: 12, fontSize: 14, lineHeight: 1.6}
]
const fontFamily = ref('pingfang-medium')
const fontFamilyOptions = [
  {title: '苹果方正Medium', value: 'pingfang-medium'},
  {title: '阿里普惠体2-55-Regular', value: 'alibaba-55'},
  {title: '思源黑体2.0 Normal', value: 'source-han-sans'},
  {title: '思源宋体', value: 'source-han-serif'},
  {title: 'Times-New-Roman', value: 'times-new-roman'}
]
const fontFamilyMap: Record<string, string> = {
  'pingfang-medium': '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  'alibaba-55': '"Alibaba PuHuiTi 2.0", "AlibabaPuHuiTi-2-55-Regular", "PingFang SC", "Microsoft YaHei", sans-serif',
  'source-han-sans': '"Source Han Sans SC", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  'source-han-serif': '"Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", "STSong", serif',
  'times-new-roman': '"Times New Roman", Times, serif'
}
const renderedHtml = computed(() => DOMPurify.sanitize(markdownToHtml(markdownContent.value)))
const previewStyle = computed(() => ({
  padding: `${pageMarginMm.value}mm`,
  fontSize: `${baseFontSize.value}px`,
  lineHeight: String(lineHeight.value),
  fontFamily: fontFamilyMap[fontFamily.value] || fontFamilyMap['pingfang-medium']
}))

function tidyMarkdown() {
  const text = markdownContent.value
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[–—]/g, '-')
      .trim()
  markdownContent.value = text
}

function exportToPdf() {
  if (!previewRef.value) return
  const win = window.open('', '_blank')
  if (!win) return

  const title = `${fileName.value || 'resume'}.pdf`
  const content = previewRef.value.innerHTML
  win.document.write(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: ${pageMarginMm.value}mm; }
    html, body { margin: 0; padding: 0; background: #fff; color: #0f172a; font-family: ${fontFamilyMap[fontFamily.value] || fontFamilyMap['pingfang-medium']}; }
    .resume-preview { font-size: ${baseFontSize.value}px; line-height: ${lineHeight.value}; }
    .resume-preview h1, .resume-preview h2, .resume-preview h3, .resume-preview h4 { margin: 0.55em 0 0.3em; font-weight: 700; }
    .resume-preview h1 { font-size: 28px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; text-align: center; }
    .resume-preview h2 { font-size: 18px; margin-top: 1em; color: #0f172a; border-left: 4px solid #2563eb; padding-left: 10px; }
    .resume-preview h3 { font-size: 15px; color: #111827; }
    .resume-preview h4 { font-size: 14px; color: #1f2937; }
    .resume-preview p { margin: 0.28em 0; color: #334155; }
    .resume-preview ul, .resume-preview ol { margin: 0.35em 0 0.65em 1.2em; padding: 0; }
    .resume-preview li { margin: 0.2em 0; color: #1f2937; }
    .resume-preview hr { border: none; border-top: 1px solid #e2e8f0; margin: 0.85em 0; }
    .resume-preview blockquote { margin: 0.7em 0; padding: 0.5em 0.9em; background: #f8fafc; border-left: 3px solid #93c5fd; color: #334155; }
    .resume-preview code { background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-family: Consolas, Monaco, monospace; font-size: 0.92em; }
    .resume-preview pre { background: #0f172a; color: #f8fafc; padding: 12px; border-radius: 8px; overflow: auto; white-space: pre-wrap; }
    .resume-preview pre code { background: transparent; padding: 0; color: inherit; }
    .resume-preview a { color: #1d4ed8; text-decoration: none; }
    .resume-preview p[align="center"] { text-align: center; color: #0f172a; }
    .resume-preview p[align="center"] strong { font-size: 30px; letter-spacing: 0.4px; }
  </style>
</head>
<body>
  <article class="resume-preview">${content}</article>
</body>
</html>`)
  win.document.close()

  setTimeout(() => {
    win.focus()
    win.print()
  }, 180)
}

function getEditorEl(): HTMLTextAreaElement | null {
  const root = editorRef.value?.$el as HTMLElement | undefined
  if (!root) return null
  return root.querySelector('textarea')
}

function wrapSelection(prefix: string, suffix: string, placeholder: string) {
  const el = getEditorEl()
  if (!el) return
  const start = el.selectionStart ?? 0
  const end = el.selectionEnd ?? 0
  const selected = el.value.slice(start, end)
  const content = selected || placeholder
  const replaced = `${prefix}${content}${suffix}`
  el.setRangeText(replaced, start, end, 'select')
  markdownContent.value = el.value
  el.focus()
}

function prefixSelection(prefix: string) {
  const el = getEditorEl()
  if (!el) return
  const start = el.selectionStart ?? 0
  const end = el.selectionEnd ?? 0
  const selected = el.value.slice(start, end) || '内容'
  const lines = selected.split('\n').map(line => line ? `${prefix}${line}` : line)
  const replaced = lines.join('\n')
  el.setRangeText(replaced, start, end, 'select')
  markdownContent.value = el.value
  el.focus()
}

function updateMargin(value: unknown) {
  const n = Number(value)
  if (Number.isNaN(n)) return
  pageMarginMm.value = Number(Math.min(LAYOUT_LIMITS.margin.max, Math.max(LAYOUT_LIMITS.margin.min, n)).toFixed(0))
}

function updateFontSize(value: unknown) {
  const n = Number(value)
  if (Number.isNaN(n)) return
  baseFontSize.value = Number(Math.min(LAYOUT_LIMITS.fontSize.max, Math.max(LAYOUT_LIMITS.fontSize.min, n)).toFixed(1))
}

function updateLineHeight(value: unknown) {
  const n = Number(value)
  if (Number.isNaN(n)) return
  lineHeight.value = Number(Math.min(LAYOUT_LIMITS.lineHeight.max, Math.max(LAYOUT_LIMITS.lineHeight.min, n)).toFixed(2))
}

function applyQuickLayout(layout: { margin: number; fontSize: number; lineHeight: number }) {
  updateMargin(layout.margin)
  updateFontSize(layout.fontSize)
  updateLineHeight(layout.lineHeight)
}

function transformLineType(transform: (line: string) => string) {
  const el = getEditorEl()
  if (!el) return

  const fullText = el.value
  const selectStart = el.selectionStart ?? 0
  const selectEnd = el.selectionEnd ?? 0
  const start = fullText.lastIndexOf('\n', Math.max(selectStart - 1, 0)) + 1
  const endBreak = fullText.indexOf('\n', selectEnd)
  const end = endBreak === -1 ? fullText.length : endBreak

  const selectedBlock = fullText.slice(start, end)
  const transformed = selectedBlock
      .split('\n')
      .map(line => transform(line))
      .join('\n')

  el.setRangeText(transformed, start, end, 'select')
  markdownContent.value = el.value
  el.focus()
}

function setHeading(level: number) {
  const headingPrefix = `${'#'.repeat(level)} `
  transformLineType(line => {
    if (!line.trim()) return line
    const stripped = line.replace(/^\s{0,3}#{1,6}\s+/, '').trimStart()
    return `${headingPrefix}${stripped}`
  })
}

function setParagraph() {
  transformLineType(line => line.replace(/^\s{0,3}#{1,6}\s+/, ''))
}

function onEditorKeydown(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return

  const key = event.key.toLowerCase()
  if (key >= '0' && key <= '6') {
    event.preventDefault()
    if (key === '0') {
      setParagraph()
    } else {
      setHeading(Number(key))
    }
    return
  }

  if (key === 'b') {
    event.preventDefault()
    wrapSelection('**', '**', '加粗文本')
    return
  }

  if (key === 'i') {
    event.preventDefault()
    wrapSelection('*', '*', '斜体文本')
    return
  }

  if (key === 'u') {
    event.preventDefault()
    wrapSelection('<u>', '</u>', '下划线文本')
    return
  }

  if (event.shiftKey && key === 'h') {
    event.preventDefault()
    wrapSelection('<mark>', '</mark>', '高亮文本')
  }
}

function markdownToHtml(markdown: string): string {
  const codeBlocks: string[] = []
  const withTokens = markdown.replace(/```([\s\S]*?)```/g, (_, code: string) => {
    const token = `__CODE_BLOCK_${codeBlocks.length}__`
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`)
    return token
  })

  const lines = withTokens.split('\n')
  const blocks: string[] = []
  const paragraphBuffer: string[] = []
  let listType: 'ul' | 'ol' | null = null
  const listItems: string[] = []
  let blockquoteBuffer: string[] = []
  let inHtmlBlock = false
  let htmlBlockTag = ''

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return
    const text = paragraphBuffer.join(' ').trim()
    if (text) blocks.push(`<p>${applyInlineFormat(text)}</p>`)
    paragraphBuffer.length = 0
  }

  const flushList = () => {
    if (!listType || !listItems.length) return
    blocks.push(`<${listType}>${listItems.join('')}</${listType}>`)
    listItems.length = 0
    listType = null
  }

  const flushBlockquote = () => {
    if (!blockquoteBuffer.length) return
    blocks.push(`<blockquote>${blockquoteBuffer.map(line => `<p>${applyInlineFormat(line)}</p>`).join('')}</blockquote>`)
    blockquoteBuffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (inHtmlBlock) {
      blocks.push(rawLine)
      if (new RegExp(`</${htmlBlockTag}>`, 'i').test(line)) {
        inHtmlBlock = false
        htmlBlockTag = ''
      }
      continue
    }

    if (!line) {
      flushParagraph()
      flushList()
      flushBlockquote()
      continue
    }

    if (/^__CODE_BLOCK_\d+__$/.test(line)) {
      flushParagraph()
      flushList()
      flushBlockquote()
      blocks.push(line)
      continue
    }

    if (isRawHtmlLine(rawLine)) {
      flushParagraph()
      flushList()
      flushBlockquote()
      blocks.push(rawLine)
      const openTag = extractOpeningBlockTag(rawLine)
      if (openTag && !new RegExp(`</${openTag}>`, 'i').test(line)) {
        inHtmlBlock = true
        htmlBlockTag = openTag
      }
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      flushBlockquote()
      const level = heading[1].length
      blocks.push(`<h${level}>${applyInlineFormat(heading[2])}</h${level}>`)
      continue
    }

    if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) {
      flushParagraph()
      flushList()
      flushBlockquote()
      blocks.push('<hr />')
      continue
    }

    const unordered = line.match(/^\s{0,3}[-*+]\s+(.+)$/)
    if (unordered) {
      flushParagraph()
      flushBlockquote()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(`<li>${applyInlineFormat(unordered[1])}</li>`)
      continue
    }

    const ordered = line.match(/^\s{0,3}\d+\.\s+(.+)$/)
    if (ordered) {
      flushParagraph()
      flushBlockquote()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(`<li>${applyInlineFormat(ordered[1])}</li>`)
      continue
    }

    const blockquote = line.match(/^>\s?(.+)$/)
    if (blockquote) {
      flushParagraph()
      flushList()
      blockquoteBuffer.push(blockquote[1])
      continue
    }

    flushList()
    flushBlockquote()
    paragraphBuffer.push(line)
  }

  flushParagraph()
  flushList()
  flushBlockquote()

  let html = blocks.join('\n')
  codeBlocks.forEach((block, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, block)
  })
  return html
}

function isRawHtmlLine(line: string): boolean {
  const trimmed = line.trim()
  return /^<\/?[a-zA-Z][\w-]*(\s[^>]*)?>/.test(trimmed)
}

function applyInlineFormat(content: string): string {
  const codeSnippets: string[] = []
  const htmlSnippets: string[] = []
  let text = content.replace(/`([^`]+)`/g, (_, code: string) => {
    const token = `__INLINE_CODE_${codeSnippets.length}__`
    codeSnippets.push(`<code>${escapeHtml(code)}</code>`)
    return token
  })

  text = text.replace(/<(u|mark)>([\s\S]*?)<\/\1>/gi, (_, tag: string, inner: string) => {
    const token = `__INLINE_HTML_${htmlSnippets.length}__`
    htmlSnippets.push(`<${tag.toLowerCase()}>${escapeHtml(inner)}</${tag.toLowerCase()}>`)
    return token
  })

  text = escapeHtml(text)
  text = text.replace(/\[([^\]]+)]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  codeSnippets.forEach((html, index) => {
    text = text.replace(`__INLINE_CODE_${index}__`, html)
  })
  htmlSnippets.forEach((html, index) => {
    text = text.replace(`__INLINE_HTML_${index}__`, html)
  })
  return text
}

function extractOpeningBlockTag(line: string): string {
  const trimmed = line.trim()
  const match = trimmed.match(/^<([a-zA-Z][\w-]*)(\s[^>]*)?>/)
  if (!match) return ''
  const tag = match[1].toLowerCase()
  const inlineTags = new Set(['strong', 'em', 'span', 'u', 'mark', 'a', 'code', 'small', 'b', 'i'])
  if (inlineTags.has(tag)) return ''
  if (/\/>$/.test(trimmed)) return ''
  if (/^<\//.test(trimmed)) return ''
  return tag
}

function escapeHtml(text: string): string {
  return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
}
</script>

<template>
  <ToolPageLayout :card="false" max-width="max-w-[1450px]">
    <div class="mx-auto max-w-[1450px]">
      <div class="mb-4 rounded-xl bg-white/90 px-3 py-3 shadow-sm">
        <div class="top-toolbar">
          <div class="toolbar-group">
            <v-btn size="small" variant="tonal" @click="wrapSelection('**', '**', '加粗文本')">加粗</v-btn>
            <v-btn size="small" variant="tonal" @click="wrapSelection('*', '*', '斜体文本')">斜体</v-btn>
            <v-btn size="small" variant="tonal" @click="wrapSelection('<u>', '</u>', '下划线文本')">下划线</v-btn>
            <v-btn size="small" variant="tonal" @click="wrapSelection('<mark>', '</mark>', '高亮文本')">高亮</v-btn>
            <v-btn size="small" variant="tonal" @click="prefixSelection('- ')">列表</v-btn>
            <v-btn size="small" variant="tonal" @click="prefixSelection('### ')">小标题</v-btn>
          </div>
          <div class="toolbar-group toolbar-group-right">
            <div class="quick-layouts">
              <span class="quick-layouts-label">快速配置</span>
              <v-btn
                  v-for="layout in QUICK_LAYOUTS"
                  :key="layout.label"
                  size="small"
                  variant="tonal"
                  @click="applyQuickLayout(layout)"
              >
                {{ layout.label }}
              </v-btn>
            </div>
            <v-text-field
                :model-value="String(pageMarginMm)"
                label="页边距(mm)"
                variant="outlined"
                density="compact"
                type="number"
                :min="LAYOUT_LIMITS.margin.min"
                :max="LAYOUT_LIMITS.margin.max"
                :step="LAYOUT_LIMITS.margin.step"
                hide-details
                class="cfg-field"
                @update:model-value="updateMargin"
            />
            <v-text-field
                :model-value="String(baseFontSize)"
                label="字号(px)"
                variant="outlined"
                density="compact"
                type="number"
                :min="LAYOUT_LIMITS.fontSize.min"
                :max="LAYOUT_LIMITS.fontSize.max"
                :step="LAYOUT_LIMITS.fontSize.step"
                hide-details
                class="cfg-field"
                @update:model-value="updateFontSize"
            />
            <v-text-field
                :model-value="String(lineHeight)"
                label="行高"
                variant="outlined"
                density="compact"
                type="number"
                :min="LAYOUT_LIMITS.lineHeight.min"
                :max="LAYOUT_LIMITS.lineHeight.max"
                :step="LAYOUT_LIMITS.lineHeight.step"
                hide-details
                class="cfg-field"
                @update:model-value="updateLineHeight"
            />
            <v-select
                v-model="fontFamily"
                :items="fontFamilyOptions"
                item-title="title"
                item-value="value"
                label="字体"
                variant="outlined"
                density="compact"
                hide-details
                class="cfg-font"
            />
            <v-text-field
                v-model="fileName"
                variant="outlined"
                density="compact"
                hide-details
                class="cfg-file bg-white rounded-lg"
                label="导出文件名"
            />
            <v-btn variant="tonal" prepend-icon="mdi-format-align-left" @click="tidyMarkdown">整理</v-btn>
            <v-btn color="primary" prepend-icon="mdi-file-pdf-box" @click="exportToPdf">导出 PDF</v-btn>
          </div>
        </div>
      </div>

      <div class="resume-layout gap-4 items-start">
        <v-card class="rounded-xl">
          <v-card-title class="text-base font-semibold text-slate-700">Markdown 原文</v-card-title>
          <v-card-text>
            <div class="mb-3 text-xs text-slate-500">
              快捷键：Ctrl/Cmd+1~6 标题级别，Ctrl/Cmd+0 段落，Ctrl/Cmd+B 加粗，Ctrl/Cmd+I 斜体，Ctrl/Cmd+U
              下划线，Ctrl/Cmd+Shift+H 高亮
            </div>
            <v-textarea
                ref="editorRef"
                v-model="markdownContent"
                auto-grow
                variant="outlined"
                class="font-mono"
                :rows="34"
                placeholder="粘贴完整简历 Markdown（不会拆分内容）"
                hide-details
                @keydown="onEditorKeydown"
            />
          </v-card-text>
        </v-card>

        <v-card class="rounded-xl">
          <v-card-title class="text-base font-semibold text-slate-700">简历预览（A4）</v-card-title>
          <v-card-text>
            <div class="preview-scroll rounded-lg bg-slate-100 p-3 md:p-4">
              <article
                  ref="previewRef"
                  class="resume-preview bg-white mx-auto shadow-md"
                  :style="previewStyle"
                  v-html="renderedHtml"
              />
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>
  </ToolPageLayout>
</template>

<style scoped>
.font-mono {
  font-family: Consolas, Monaco, "Courier New", monospace;
}

.resume-layout {
  display: grid;
  grid-template-columns: 1fr;
}

.top-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.toolbar-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.toolbar-group-right {
  justify-content: flex-end;
  margin-left: auto;
}

.quick-layouts {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 2px;
}

.quick-layouts-label {
  font-size: 12px;
  color: #64748b;
}

.cfg-field {
  width: 120px;
}

.cfg-font {
  width: 170px;
}

.cfg-file {
  width: 180px;
}

.preview-scroll {
  max-height: none;
  overflow: visible;
}

.resume-preview {
  width: 210mm;
  min-height: 297mm;
  color: #0f172a;
}

:deep(.resume-preview h1),
:deep(.resume-preview h2),
:deep(.resume-preview h3),
:deep(.resume-preview h4) {
  margin: 0.55em 0 0.3em;
  font-weight: 700;
}

:deep(.resume-preview h1) {
  font-size: 28px;
  border-bottom: 1px solid #cbd5e1;
  padding-bottom: 10px;
  text-align: center;
}

:deep(.resume-preview h2) {
  font-size: 18px;
  margin-top: 1em;
  border-left: 4px solid #2563eb;
  padding-left: 10px;
}

:deep(.resume-preview h3) {
  font-size: 15px;
  color: #111827;
}

:deep(.resume-preview h4) {
  font-size: 14px;
  color: #1f2937;
}

:deep(.resume-preview p) {
  margin: 0.28em 0;
  color: #334155;
}

:deep(.resume-preview ul),
:deep(.resume-preview ol) {
  margin: 0.35em 0 0.65em 1.2em;
  padding: 0;
}

:deep(.resume-preview ul) {
  list-style-type: disc;
}

:deep(.resume-preview li) {
  margin: 0.2em 0;
  color: #1f2937;
}

:deep(.resume-preview ul li::marker) {
  color: #000;
}

:deep(.resume-preview hr) {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 0.85em 0;
}

:deep(.resume-preview blockquote) {
  margin: 0.7em 0;
  padding: 0.5em 0.9em;
  background: #f8fafc;
  border-left: 3px solid #93c5fd;
  color: #334155;
}

:deep(.resume-preview code) {
  background: #f1f5f9;
  padding: 2px 5px;
  border-radius: 4px;
  font-family: Consolas, Monaco, monospace;
  font-size: 0.92em;
}

:deep(.resume-preview pre) {
  background: #0f172a;
  color: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  overflow: auto;
  white-space: pre-wrap;
}

:deep(.resume-preview pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}

:deep(.resume-preview a) {
  color: #1d4ed8;
  text-decoration: none;
}

:deep(.resume-preview p[align="center"]) {
  text-align: center;
  color: #0f172a;
}

:deep(.resume-preview p[align="center"] strong) {
  font-size: 30px;
  letter-spacing: 0.4px;
}

@media (max-width: 1280px) {
  .resume-preview {
    width: 100%;
    min-height: auto;
  }
}

@media (min-width: 1280px) {
  .resume-layout {
    grid-template-columns: 45% 55%;
  }
}

@media print {
  .preview-scroll {
    overflow: visible;
    max-height: none;
    padding: 0;
  }

  .resume-preview {
    width: 100%;
    min-height: auto;
    box-shadow: none;
  }
}
</style>
