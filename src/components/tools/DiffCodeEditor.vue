<template>
  <div ref="editorHost" class="diff-code-editor" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { basicSetup } from 'codemirror'
import { Compartment, EditorState } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { EditorView, placeholder as placeholderExtension } from '@codemirror/view'
import { MergeView, goToNextChunk, goToPreviousChunk } from '@codemirror/merge'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { xml } from '@codemirror/lang-xml'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { css } from '@codemirror/lang-css'
import { markdown } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

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

const props = withDefaults(defineProps<{
  left: string
  right: string
  leftLanguage?: CodeEditorLanguage
  rightLanguage?: CodeEditorLanguage
  collapseUnchanged?: boolean
}>(), {
  leftLanguage: 'text',
  rightLanguage: 'text',
  collapseUnchanged: false
})

const emit = defineEmits<{
  'update:left': [value: string]
  'update:right': [value: string]
  chunksChange: [count: number]
}>()

const editorHost = ref<HTMLElement>()
const leftLanguageCompartment = new Compartment()
const rightLanguageCompartment = new Compartment()
let mergeView: MergeView | undefined
let applyingLeft = false
let applyingRight = false

const editorHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--color-primary-dark)', fontWeight: '600' },
  { tag: [tags.string, tags.attributeValue], color: 'var(--color-success)' },
  { tag: tags.number, color: 'var(--color-warning)' },
  { tag: [tags.bool, tags.keyword], color: 'var(--color-info)', fontWeight: '600' },
  { tag: [tags.typeName, tags.className, tags.heading], color: 'var(--color-primary-dark)', fontWeight: '600' },
  { tag: tags.comment, color: 'var(--color-text-subtle)', fontStyle: 'italic' }
])

function languageExtensions(language: CodeEditorLanguage): Extension {
  switch (language) {
    case 'json':
      return json()
    case 'yaml':
      return yaml()
    case 'xml':
      return xml()
    case 'html':
      return html()
    case 'javascript':
      return javascript({ jsx: true })
    case 'typescript':
      return javascript({ typescript: true, jsx: true })
    case 'css':
      return css()
    case 'markdown':
      return markdown()
    default:
      return []
  }
}

function sharedExtensions(placeholder: string): Extension[] {
  return [
    basicSetup,
    syntaxHighlighting(editorHighlightStyle),
    placeholderExtension(placeholder),
    EditorView.theme({
      '&': {
        height: '100%',
        color: 'var(--color-text)',
        backgroundColor: 'var(--color-surface)',
        fontSize: '0.875rem'
      },
      '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        lineHeight: '1.5'
      },
      '.cm-content': {
        padding: '8px 0',
        caretColor: 'var(--color-primary)'
      },
      '.cm-line': {
        padding: '0 10px'
      },
      '.cm-gutters': {
        color: 'var(--color-text-subtle)',
        backgroundColor: 'var(--color-bg-alt)',
        borderRight: '1px solid var(--color-border)'
      },
      '.cm-activeLine, .cm-activeLineGutter': {
        backgroundColor: 'var(--color-primary-light)'
      }
    })
  ]
}

function notifyChunks() {
  queueMicrotask(() => emit('chunksChange', mergeView?.chunks.length ?? 0))
}

onMounted(() => {
  if (!editorHost.value) {
    return
  }

  mergeView = new MergeView({
    a: {
      doc: props.left,
      extensions: [
        ...sharedExtensions('输入或加载文件 A...'),
        leftLanguageCompartment.of(languageExtensions(props.leftLanguage)),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !applyingLeft) {
            emit('update:left', update.state.doc.toString())
            notifyChunks()
          }
        })
      ]
    },
    b: {
      doc: props.right,
      extensions: [
        ...sharedExtensions('输入或加载文件 B...'),
        rightLanguageCompartment.of(languageExtensions(props.rightLanguage)),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !applyingRight) {
            emit('update:right', update.state.doc.toString())
            notifyChunks()
          }
        })
      ]
    },
    parent: editorHost.value,
    highlightChanges: true,
    gutter: true,
    collapseUnchanged: props.collapseUnchanged ? { margin: 3, minSize: 6 } : undefined,
    diffConfig: { scanLimit: 1000, timeout: 1000 }
  })
  notifyChunks()
})

watch(() => props.left, value => {
  if (!mergeView || value === mergeView.a.state.doc.toString()) {
    return
  }
  applyingLeft = true
  try {
    mergeView.a.dispatch({
      changes: { from: 0, to: mergeView.a.state.doc.length, insert: value }
    })
  } finally {
    applyingLeft = false
  }
  notifyChunks()
})

watch(() => props.right, value => {
  if (!mergeView || value === mergeView.b.state.doc.toString()) {
    return
  }
  applyingRight = true
  try {
    mergeView.b.dispatch({
      changes: { from: 0, to: mergeView.b.state.doc.length, insert: value }
    })
  } finally {
    applyingRight = false
  }
  notifyChunks()
})

watch(() => props.leftLanguage, language => {
  mergeView?.a.dispatch({
    effects: leftLanguageCompartment.reconfigure(languageExtensions(language))
  })
})

watch(() => props.rightLanguage, language => {
  mergeView?.b.dispatch({
    effects: rightLanguageCompartment.reconfigure(languageExtensions(language))
  })
})

watch(() => props.collapseUnchanged, collapseUnchanged => {
  mergeView?.reconfigure({
    collapseUnchanged: collapseUnchanged ? { margin: 3, minSize: 6 } : undefined
  })
})

function nextChange() {
  if (mergeView) {
    goToNextChunk(mergeView.b)
  }
}

function previousChange() {
  if (mergeView) {
    goToPreviousChunk(mergeView.b)
  }
}

defineExpose({
  nextChange,
  previousChange
})

onBeforeUnmount(() => {
  mergeView?.destroy()
})
</script>

<style scoped>
.diff-code-editor {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-element);
  background: var(--color-surface);
}

.diff-code-editor :deep(.cm-mergeView),
.diff-code-editor :deep(.cm-mergeViewEditors),
.diff-code-editor :deep(.cm-mergeViewEditor) {
  height: 100%;
  min-height: 0;
}

.diff-code-editor :deep(.cm-mergeView) {
  overflow: auto;
}

.diff-code-editor :deep(.cm-mergeViewEditor) {
  min-width: 0;
}

.diff-code-editor :deep(.cm-merge-a .cm-changedLine) {
  background: var(--color-error-light);
}

.diff-code-editor :deep(.cm-merge-b .cm-changedLine) {
  background: var(--color-success-light);
}
</style>
