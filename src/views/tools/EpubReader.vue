<template>
  <ToolPageLayout theme="none" :card="false" hide-header max-width="max-w-full">
    <div class="epub-page" :class="{ 'sidebar-collapsed': !showSidebar }">
    <aside v-if="showSidebar" class="epub-sidebar">
      <div class="sidebar-header">
        <div>
          <h1>EPUB 阅读器</h1>
          <p>{{ bookTitle || '打开本地 EPUB 文件开始阅读' }}</p>
        </div>
        <div class="sidebar-actions">
          <v-btn icon="mdi-folder-open-outline" variant="tonal" color="primary" @click="triggerFileInput"/>
        </div>
      </div>

      <v-btn
          block
          class="sidebar-toggle-button"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-panel-left-close"
          @click="showSidebar = false"
      >
        隐藏左侧面板
      </v-btn>

      <input ref="fileInput" type="file" accept=".epub,application/epub+zip" class="hidden-input"
             @change="handleFileChange">

      <label
          class="drop-zone"
          :class="{ dragging: isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
      >
        <v-icon icon="mdi-book-open-page-variant-outline" size="36"/>
        <span>选择或拖入 EPUB 文件</span>
        <small>文件只在浏览器本地解析</small>
        <input type="file" accept=".epub,application/epub+zip" @change="handleFileChange">
      </label>

      <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="my-3">
        {{ errorMessage }}
      </v-alert>

      <section v-if="hasBook" class="control-panel">
        <div class="control-row">
          <span>字号</span>
          <v-slider
              v-model="fontSize"
              :min="14"
              :max="24"
              :step="1"
              density="compact"
              hide-details
              color="primary"
          />
          <strong>{{ fontSize }}</strong>
        </div>

        <div class="theme-grid">
          <button
              v-for="item in themeOptions"
              :key="item.value"
              type="button"
              :class="['theme-button', { active: theme === item.value }]"
              @click="theme = item.value"
          >
            <span :style="{ background: item.swatch }"/>
            {{ item.label }}
          </button>
        </div>

        <div class="chapter-actions">
          <v-btn variant="tonal" color="primary" prepend-icon="mdi-chevron-left" :disabled="currentChapterIndex <= 0"
                 @click="goPreviousChapter">
            上一章
          </v-btn>
          <v-btn variant="tonal" color="primary" append-icon="mdi-chevron-right"
                 :disabled="currentChapterIndex >= chapters.length - 1" @click="goNextChapter">
            下一章
          </v-btn>
        </div>

        <div class="progress-block">
          <div>
            <span>阅读进度</span>
            <strong>{{ Math.round(totalProgress) }}%</strong>
          </div>
          <v-progress-linear :model-value="totalProgress" color="primary" height="8" rounded/>
        </div>
      </section>

      <section v-if="chapters.length" class="toc-panel">
        <button type="button" class="toc-title" @click="showToc = !showToc">
          <span>目录</span>
          <v-icon :icon="showToc ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="20"/>
        </button>
        <div v-show="showToc" class="toc-list">
          <button
              v-for="(chapter, index) in chapters"
              :key="chapter.href"
              type="button"
              :class="['toc-item', { active: index === currentChapterIndex }]"
              @click="openChapter(index)"
          >
            <span>{{ index + 1 }}</span>
            <strong>{{ chapter.title }}</strong>
          </button>
        </div>
      </section>
    </aside>

    <aside v-else class="epub-sidebar-rail">
      <button type="button" class="rail-open-button" @click="showSidebar = true">
        <v-icon icon="mdi-panel-left-open" size="20"/>
        <span>显示侧栏</span>
      </button>
      <v-btn icon="mdi-folder-open-outline" variant="text" @click="triggerFileInput"/>
      <div class="rail-title">EPUB</div>
    </aside>

    <main class="reader-shell" :class="`theme-${theme}`">

      <div v-if="!hasBook" class="empty-state">
        <v-icon icon="mdi-book-open-blank-variant-outline" size="72"/>
        <h2>本地 EPUB 阅读页面</h2>
        <p>支持解析书籍元数据、目录、章节内容和常见图片资源。上传后可在左侧切换章节和阅读主题。</p>
        <v-btn color="primary" prepend-icon="mdi-upload" @click="triggerFileInput">打开 EPUB</v-btn>
      </div>

      <template v-else>
        <header class="reader-toolbar">
          <div>
            <span>{{ currentChapterIndex + 1 }} / {{ chapters.length }}</span>
            <strong>{{ currentChapter?.title }}</strong>
          </div>
          <div class="toolbar-actions">
            <v-btn
                :icon="showSidebar ? 'mdi-panel-left-close' : 'mdi-panel-left-open'"
                variant="text"
                @click="showSidebar = !showSidebar"
            />
            <v-btn icon="mdi-format-font-size-decrease" variant="text" :disabled="fontSize <= 14" @click="fontSize--"/>
            <v-btn icon="mdi-format-font-size-increase" variant="text" :disabled="fontSize >= 24" @click="fontSize++"/>
            <v-btn icon="mdi-reload" variant="text" @click="reloadCurrentChapter"/>
          </div>
        </header>

        <div class="reader-frame-wrap">
          <v-progress-linear v-if="isLoading" indeterminate color="primary" class="loading-bar"/>
          <iframe
              ref="readerFrame"
              title="EPUB 阅读区域"
              class="reader-frame"
              :srcdoc="currentChapterHtml"
              @load="handleFrameLoad"
          />
        </div>
      </template>
    </main>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify'
import JSZip from 'jszip'
import {computed, nextTick, onBeforeUnmount, ref, watch} from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'

interface ManifestItem {
  id: string
  href: string
  fullPath: string
  mediaType: string
  properties: string
}

interface Chapter {
  id: string
  href: string
  title: string
  mediaType: string
}

const fileInput = ref<HTMLInputElement>()
const readerFrame = ref<HTMLIFrameElement>()
const isDragging = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const bookTitle = ref('')
const chapters = ref<Chapter[]>([])
const currentChapterIndex = ref(0)
const currentChapterHtml = ref('')
const fontSize = ref(18)
const theme = ref<'paper' | 'white' | 'dark'>('paper')
const chapterProgress = ref(0)
const showSidebar = ref(true)
const showToc = ref(true)

let zipArchive: JSZip | null = null
let manifestItems = new Map<string, ManifestItem>()
let resourceUrls = new Map<string, string>()
let frameScrollHandler: (() => void) | null = null

const themeOptions = [
  {value: 'paper' as const, label: '纸张', swatch: '#f4ecd8'},
  {value: 'white' as const, label: '白色', swatch: '#ffffff'},
  {value: 'dark' as const, label: '深色', swatch: '#151922'}
]

const hasBook = computed(() => chapters.value.length > 0)
const currentChapter = computed(() => chapters.value[currentChapterIndex.value])
const totalProgress = computed(() => {
  if (!chapters.value.length) return 0
  return ((currentChapterIndex.value + chapterProgress.value / 100) / chapters.value.length) * 100
})

watch([fontSize, theme], () => {
  if (hasBook.value) reloadCurrentChapter()
})

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await loadEpub(file)
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) await loadEpub(file)
}

async function loadEpub(file: File) {
  errorMessage.value = ''
  isLoading.value = true
  cleanupBook()

  try {
    zipArchive = await JSZip.loadAsync(file)
    const containerXml = await readZipText('META-INF/container.xml')
    const rootFilePath = parseRootFilePath(containerXml)
    const opfText = await readZipText(rootFilePath)
    const opfBasePath = rootFilePath.includes('/') ? rootFilePath.slice(0, rootFilePath.lastIndexOf('/') + 1) : ''
    const parsed = await parsePackageDocument(opfText, opfBasePath)

    bookTitle.value = parsed.title || file.name.replace(/\.epub$/i, '')
    manifestItems = parsed.manifest
    chapters.value = parsed.chapters
    await prepareResourceUrls()

    if (!chapters.value.length) {
      throw new Error('未找到可阅读的章节内容')
    }

    currentChapterIndex.value = 0
    await openChapter(0)
  } catch (error) {
    cleanupBook()
    errorMessage.value = error instanceof Error ? error.message : 'EPUB 解析失败'
  } finally {
    isLoading.value = false
  }
}

function cleanupBook() {
  resourceUrls.forEach(url => URL.revokeObjectURL(url))
  resourceUrls = new Map()
  zipArchive = null
  manifestItems = new Map()
  bookTitle.value = ''
  chapters.value = []
  currentChapterHtml.value = ''
  chapterProgress.value = 0
  frameScrollHandler = null
}

async function readZipText(path: string) {
  return getZipEntry(path).async('string')
}

async function readZipBytes(path: string) {
  return getZipEntry(path).async('uint8array')
}

function getZipEntry(path: string) {
  if (!zipArchive) throw new Error('未加载 EPUB 文件')
  const normalizedPath = normalizePath(path)
  const entry = zipArchive.file(normalizedPath)
  if (!entry) throw new Error(`EPUB 缺少文件：${normalizedPath}`)
  return entry
}

function parseRootFilePath(containerXml: string) {
  const doc = new DOMParser().parseFromString(containerXml, 'application/xml')
  const rootFile = doc.getElementsByTagName('rootfile')[0]
  const fullPath = rootFile?.getAttribute('full-path')
  if (!fullPath) throw new Error('EPUB 未声明 OPF 包文件')
  return normalizePath(fullPath)
}

async function parsePackageDocument(opfText: string, opfBasePath: string) {
  const doc = new DOMParser().parseFromString(opfText, 'application/xml')
  const title = doc.getElementsByTagName('dc:title')[0]?.textContent?.trim() || doc.getElementsByTagName('title')[0]?.textContent?.trim() || ''
  const manifest = new Map<string, ManifestItem>()

  Array.from(doc.getElementsByTagName('item')).forEach(item => {
    const id = item.getAttribute('id') || ''
    const href = item.getAttribute('href') || ''
    if (!id || !href) return

    manifest.set(id, {
      id,
      href,
      fullPath: normalizePath(opfBasePath + href),
      mediaType: item.getAttribute('media-type') || '',
      properties: item.getAttribute('properties') || ''
    })
  })

  const navLabels = await parseNavigationLabels(doc, manifest)
  const chapters = Array.from(doc.getElementsByTagName('itemref'))
      .map((itemRef, index) => {
        const idref = itemRef.getAttribute('idref') || ''
        const item = manifest.get(idref)
        if (!item || !isDocumentMediaType(item.mediaType)) return null
        const title = navLabels.get(item.fullPath) || navLabels.get(stripFragment(item.fullPath)) || `章节 ${index + 1}`
        return {id: idref, href: item.fullPath, title, mediaType: item.mediaType}
      })
      .filter((item): item is Chapter => !!item)

  return {title, manifest, chapters}
}

async function parseNavigationLabels(opfDoc: Document, manifest: Map<string, ManifestItem>) {
  const labels = new Map<string, string>()
  const navItem = Array.from(manifest.values()).find(item => item.properties.includes('nav'))
  const ncxId = opfDoc.getElementsByTagName('spine')[0]?.getAttribute('toc')
  const ncxItem = ncxId ? manifest.get(ncxId) : Array.from(manifest.values()).find(item => item.mediaType.includes('dtbncx'))

  if (navItem) {
    try {
      const navText = await readZipText(navItem.fullPath)
      const navDoc = new DOMParser().parseFromString(navText, 'text/html')
      Array.from(navDoc.querySelectorAll('a[href]')).forEach(link => {
        const href = link.getAttribute('href')
        const label = link.textContent?.trim().replace(/\s+/g, ' ')
        if (href && label) {
          const resolved = resolveRelativePath(navItem.fullPath, href)
          labels.set(resolved, label)
          labels.set(stripFragment(resolved), label)
        }
      })
    } catch {
      // Some books omit or ship malformed nav documents; fall back to spine order.
    }
  }

  if (ncxItem) {
    try {
      const ncxText = await readZipText(ncxItem.fullPath)
      const ncxDoc = new DOMParser().parseFromString(ncxText, 'application/xml')
      Array.from(ncxDoc.getElementsByTagName('navPoint')).forEach(point => {
        const src = point.getElementsByTagName('content')[0]?.getAttribute('src')
        const label = point.getElementsByTagName('text')[0]?.textContent?.trim()
        if (src && label) {
          const resolved = resolveRelativePath(ncxItem.fullPath, src)
          labels.set(resolved, label)
          labels.set(stripFragment(resolved), label)
        }
      })
    } catch {
      // NCX is optional in EPUB 3 and unreliable in older files.
    }
  }

  return labels
}

async function prepareResourceUrls() {
  const tasks = Array.from(manifestItems.values())
      .filter(item => !isDocumentMediaType(item.mediaType) && zipArchive?.file(item.fullPath))
      .map(async item => {
        const bytes = await readZipBytes(item.fullPath)
        const url = URL.createObjectURL(new Blob([bytes], {type: item.mediaType || 'application/octet-stream'}))
        resourceUrls.set(item.fullPath, url)
      })

  await Promise.all(tasks)
}

async function openChapter(index: number) {
  const chapter = chapters.value[index]
  if (!chapter) return

  isLoading.value = true
  currentChapterIndex.value = index
  chapterProgress.value = 0

  try {
    const rawHtml = await readZipText(chapter.href)
    currentChapterHtml.value = buildChapterHtml(rawHtml, chapter.href)
    await nextTick()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '章节加载失败'
  } finally {
    isLoading.value = false
  }
}

function buildChapterHtml(rawHtml: string, chapterPath: string) {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html')
  rewriteResourceAttributes(doc, chapterPath)

  const bodyHtml = doc.body?.innerHTML || rawHtml
  const headHtml = doc.head?.innerHTML || ''
  const cleanHead = DOMPurify.sanitize(headHtml, {
    ADD_TAGS: ['style', 'link'],
    ADD_ATTR: ['rel', 'href', 'type', 'media']
  })
  const cleanBody = DOMPurify.sanitize(bodyHtml, {ADD_TAGS: ['svg', 'use'], ADD_ATTR: ['xlink:href', 'viewBox']})
  const colors = getThemeColors()

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <base target="_self">
  ${cleanHead}
  <style>
    :root {
      color-scheme: ${theme.value === 'dark' ? 'dark' : 'light'};
      font-size: ${fontSize.value}px;
      background: ${colors.background};
      color: ${colors.text};
    }
    body {
      margin: 0 auto;
      max-width: 820px;
      min-height: 100vh;
      padding: 48px 64px 72px;
      background: ${colors.background};
      color: ${colors.text};
      font-family: "Noto Serif SC", "Source Han Serif SC", Georgia, "Times New Roman", serif;
      line-height: 1.85;
      overflow-wrap: break-word;
    }
    p { margin: 0 0 1em; }
    h1, h2, h3, h4, h5, h6 { line-height: 1.35; margin: 1.4em 0 0.75em; color: ${colors.heading}; }
    img, svg, video { max-width: 100%; height: auto; }
    a { color: ${colors.link}; text-decoration-thickness: 1px; }
    blockquote { border-left: 4px solid ${colors.border}; margin: 1em 0; padding-left: 1em; color: ${colors.muted}; }
    table { border-collapse: collapse; max-width: 100%; }
    td, th { border: 1px solid ${colors.border}; padding: 0.4em 0.6em; }
    @media (max-width: 720px) {
      body { padding: 28px 22px 48px; }
    }
  </style>
</head>
<body>${cleanBody}</body>
</html>`
}

function rewriteResourceAttributes(doc: Document, chapterPath: string) {
  const attributes = ['src', 'href', 'xlink:href']
  doc.querySelectorAll('*').forEach(element => {
    attributes.forEach(attribute => {
      const value = element.getAttribute(attribute)
      if (!value || value.startsWith('#') || value.startsWith('data:') || /^https?:\/\//i.test(value)) return

      const [resourcePath, fragment] = value.split('#')
      const resolved = resolveRelativePath(chapterPath, resourcePath)
      const url = resourceUrls.get(resolved)
      if (url) {
        element.setAttribute(attribute, fragment ? `${url}#${fragment}` : url)
      } else if (isDocumentMediaPath(resolved)) {
        element.setAttribute(attribute, '#')
      }
    })
  })
}

function handleFrameLoad() {
  const frameWindow = readerFrame.value?.contentWindow
  const frameDocument = readerFrame.value?.contentDocument
  if (!frameWindow || !frameDocument) return

  if (frameScrollHandler) frameWindow.removeEventListener('scroll', frameScrollHandler)

  frameScrollHandler = () => {
    const root = frameDocument.documentElement
    const scrollable = Math.max(root.scrollHeight - frameWindow.innerHeight, 1)
    chapterProgress.value = Math.min(100, Math.max(0, (frameWindow.scrollY / scrollable) * 100))
  }

  frameWindow.addEventListener('scroll', frameScrollHandler, {passive: true})
  frameScrollHandler()
}

function goPreviousChapter() {
  if (currentChapterIndex.value > 0) openChapter(currentChapterIndex.value - 1)
}

function goNextChapter() {
  if (currentChapterIndex.value < chapters.value.length - 1) openChapter(currentChapterIndex.value + 1)
}

function reloadCurrentChapter() {
  openChapter(currentChapterIndex.value)
}

function getThemeColors() {
  if (theme.value === 'dark') {
    return {
      background: '#151922',
      text: '#d8dee9',
      heading: '#f8fafc',
      muted: '#a7b0c0',
      border: '#344054',
      link: '#8ab4f8'
    }
  }
  if (theme.value === 'white') {
    return {
      background: '#ffffff',
      text: '#243044',
      heading: '#0f172a',
      muted: '#64748b',
      border: '#d7dde8',
      link: '#2563eb'
    }
  }
  return {
    background: '#f4ecd8',
    text: '#35291d',
    heading: '#1f1a14',
    muted: '#74624e',
    border: '#d7c7a8',
    link: '#9a4f17'
  }
}

function isDocumentMediaType(mediaType: string) {
  return /xhtml|html/i.test(mediaType)
}

function isDocumentMediaPath(path: string) {
  return /\.(xhtml|html|htm)$/i.test(stripFragment(path))
}

function stripFragment(path: string) {
  return path.split('#')[0]
}

function resolveRelativePath(fromPath: string, relativePath: string) {
  if (!relativePath) return normalizePath(fromPath)
  const basePath = fromPath.includes('/') ? fromPath.slice(0, fromPath.lastIndexOf('/') + 1) : ''
  return normalizePath(basePath + relativePath)
}

function normalizePath(path: string) {
  const [pathPart, fragment] = path.replace(/\\/g, '/').split('#')
  const segments: string[] = []

  pathPart.split('/').forEach(segment => {
    if (!segment || segment === '.') return
    if (segment === '..') segments.pop()
    else segments.push(decodeURIComponent(segment))
  })

  const normalized = segments.join('/')
  return fragment ? `${normalized}#${fragment}` : normalized
}

onBeforeUnmount(() => {
  cleanupBook()
})
</script>

<style scoped>
.epub-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  background: #e9edf3;
}

.epub-page.sidebar-collapsed {
  grid-template-columns: 56px minmax(0, 1fr);
}

.epub-sidebar {
  min-height: 100vh;
  padding: 18px;
  background: #f8fafc;
  border-right: 1px solid rgba(15, 23, 42, 0.1);
  overflow-y: auto;
}

.epub-sidebar-rail {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 12px 8px;
  background: #f8fafc;
  border-right: 1px solid rgba(15, 23, 42, 0.1);
}

.rail-title {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  writing-mode: vertical-rl;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.sidebar-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 4px;
}

.sidebar-toggle-button {
  margin-bottom: 12px;
}

.rail-open-button {
  width: 40px;
  min-height: 108px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.rail-open-button span {
  writing-mode: vertical-rl;
  letter-spacing: 0;
}

.rail-open-button:hover {
  background: #dbeafe;
}

.sidebar-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  font-weight: 800;
}

.sidebar-header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.4;
}

.hidden-input {
  display: none;
}

.drop-zone {
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 20px 14px;
  border: 1px dashed #94a3b8;
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.drop-zone.dragging {
  border-color: #2563eb;
  background: #eff6ff;
}

.drop-zone input {
  display: none;
}

.drop-zone span {
  font-weight: 700;
}

.drop-zone small {
  color: #64748b;
}

.control-panel,
.toc-panel {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  background: #ffffff;
}

.control-row {
  display: grid;
  grid-template-columns: auto minmax(120px, 1fr) 28px;
  gap: 10px;
  align-items: center;
  color: #475569;
  font-size: 14px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.theme-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  height: 36px;
  border: 1px solid #d7dde8;
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
}

.theme-button.active {
  border-color: #2563eb;
  color: #1d4ed8;
  background: #eff6ff;
  font-weight: 700;
}

.theme-button span {
  width: 14px;
  height: 14px;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 50%;
}

.chapter-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 14px;
}

.progress-block {
  margin-top: 14px;
}

.progress-block > div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  color: #475569;
  font-size: 13px;
}

.toc-title {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #0f172a;
  font-weight: 800;
  text-align: left;
}

.toc-list {
  display: grid;
  gap: 2px;
}

.toc-item {
  width: 100%;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #475569;
  text-align: left;
}

.toc-item:hover,
.toc-item.active {
  background: #eef2ff;
  color: #1d4ed8;
}

.toc-item span {
  display: inline-flex;
  justify-content: center;
  color: #94a3b8;
  font-size: 12px;
}

.toc-item strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
}

.reader-shell {
  position: relative;
  min-width: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.reader-shell.theme-paper {
  background: #d8cdb7;
}

.reader-shell.theme-white {
  background: #eef2f7;
}

.reader-shell.theme-dark {
  background: #0d1118;
}

.empty-state {
  max-width: 520px;
  margin: auto;
  padding: 32px;
  color: #334155;
  text-align: center;
}

.empty-state h2 {
  margin: 14px 0 8px;
  color: #0f172a;
  font-size: 30px;
}

.empty-state p {
  margin: 0 0 20px;
  color: #64748b;
  line-height: 1.7;
}

.reader-toolbar {
  height: 60px;
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.88);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(10px);
}

.theme-dark .reader-toolbar {
  background: rgba(21, 25, 34, 0.9);
  color: #d8dee9;
  border-bottom-color: rgba(216, 222, 233, 0.12);
}

.reader-toolbar > div:first-child {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.reader-toolbar span {
  color: #64748b;
  font-size: 12px;
}

.reader-toolbar strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 2px;
}

.reader-frame-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}

.loading-bar {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  right: 0;
}

.reader-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  background: transparent;
}

@media (max-width: 900px) {
  .epub-page {
    grid-template-columns: 1fr;
  }

  .epub-page.sidebar-collapsed {
    grid-template-columns: 44px minmax(0, 1fr);
  }

  .epub-sidebar {
    min-height: auto;
    border-right: 0;
    border-bottom: 1px solid rgba(15, 23, 42, 0.1);
  }

  .epub-sidebar-rail {
    min-height: 70vh;
    padding: 8px 4px;
  }

  .toc-panel {
    max-height: 260px;
    overflow-y: auto;
  }

  .reader-shell {
    min-height: 70vh;
  }
}
</style>
