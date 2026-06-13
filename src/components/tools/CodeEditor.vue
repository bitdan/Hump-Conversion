<template>
  <div ref="editorHost" class="code-editor" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { basicSetup } from 'codemirror'
import { Compartment, EditorState } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { EditorView, placeholder as placeholderExtension } from '@codemirror/view'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import { xml } from '@codemirror/lang-xml'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { css } from '@codemirror/lang-css'
import { markdown } from '@codemirror/lang-markdown'
import { java } from '@codemirror/lang-java'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { lintGutter, linter } from '@codemirror/lint'
import type { Diagnostic } from '@codemirror/lint'
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
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
  | 'java'
  | 'python'
  | 'sql'
  | 'shell'
  | 'text'

const props = withDefaults(defineProps<{
  modelValue: string
  language?: CodeEditorLanguage
  placeholder?: string
  lineWrapping?: boolean
}>(), {
  language: 'text',
  placeholder: '在此输入或粘贴内容...',
  lineWrapping: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
  cursorChange: [position: { line: number; column: number }]
}>()

const editorHost = ref<HTMLElement>()
const languageCompartment = new Compartment()
const wrappingCompartment = new Compartment()
const shellLanguage = StreamLanguage.define(shell)
let editorView: EditorView | undefined
let applyingExternalValue = false

const editorHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--color-primary-dark)', fontWeight: '600' },
  { tag: [tags.string, tags.attributeValue], color: 'var(--color-success)' },
  { tag: tags.number, color: 'var(--color-warning)' },
  { tag: [tags.bool, tags.keyword], color: 'var(--color-info)', fontWeight: '600' },
  { tag: tags.null, color: 'var(--color-text-muted)', fontStyle: 'italic' },
  { tag: [tags.typeName, tags.className, tags.heading], color: 'var(--color-primary-dark)', fontWeight: '600' },
  { tag: [tags.function(tags.variableName), tags.labelName], color: 'var(--color-primary)' },
  { tag: tags.comment, color: 'var(--color-text-subtle)', fontStyle: 'italic' },
  { tag: [tags.squareBracket, tags.brace, tags.paren], color: 'var(--color-text)' },
  { tag: [tags.separator, tags.operator], color: 'var(--color-text-muted)' }
])

function createJsonDiagnostic(text: string): Diagnostic[] {
  if (!text.trim()) {
    return []
  }

  try {
    JSON.parse(text)
    return []
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON 格式错误'
    const positionMatch = message.match(/position\s+(\d+)/i)
    const position = Math.min(Number(positionMatch?.[1] ?? 0), text.length)
    return [{
      from: position,
      to: Math.min(position + 1, text.length),
      severity: 'error',
      message
    }]
  }
}

function languageExtensions(language: CodeEditorLanguage): Extension {
  switch (language) {
    case 'json':
      return [json(), linter(view => createJsonDiagnostic(view.state.doc.toString()), { delay: 250 })]
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
    case 'java':
      return java()
    case 'python':
      return python()
    case 'sql':
      return sql()
    case 'shell':
      return shellLanguage
    default:
      return []
  }
}

function wrappingExtension(enabled: boolean): Extension {
  return enabled ? EditorView.lineWrapping : []
}

function emitCursorPosition(view: EditorView) {
  const head = view.state.selection.main.head
  const line = view.state.doc.lineAt(head)
  emit('cursorChange', {
    line: line.number,
    column: head - line.from + 1
  })
}

function focus() {
  editorView?.focus()
}

function insertText(text: string) {
  if (!editorView) return
  const { from, to } = editorView.state.selection.main
  editorView.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
    scrollIntoView: true
  })
  editorView.focus()
}

function wrapSelection(before: string, after = before, placeholder = '文本') {
  if (!editorView) return
  const { from, to } = editorView.state.selection.main
  const selected = editorView.state.doc.sliceString(from, to)
  const content = selected || placeholder
  const inserted = `${before}${content}${after}`
  const selectionStart = from + before.length
  editorView.dispatch({
    changes: { from, to, insert: inserted },
    selection: selected
      ? { anchor: from + inserted.length }
      : { anchor: selectionStart, head: selectionStart + content.length },
    scrollIntoView: true
  })
  editorView.focus()
}

function prefixSelection(prefix: string) {
  if (!editorView) return
  const { from, to } = editorView.state.selection.main
  const startLine = editorView.state.doc.lineAt(from)
  const endLine = editorView.state.doc.lineAt(to)
  const selectedLines = editorView.state.doc.sliceString(startLine.from, endLine.to)
  const inserted = selectedLines.split('\n').map(line => `${prefix}${line}`).join('\n')
  editorView.dispatch({
    changes: { from: startLine.from, to: endLine.to, insert: inserted },
    selection: { anchor: startLine.from + inserted.length },
    scrollIntoView: true
  })
  editorView.focus()
}

defineExpose({
  focus,
  insertText,
  wrapSelection,
  prefixSelection
})

onMounted(() => {
  if (!editorHost.value) {
    return
  }

  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      basicSetup,
      lintGutter(),
      languageCompartment.of(languageExtensions(props.language)),
      wrappingCompartment.of(wrappingExtension(props.lineWrapping)),
      syntaxHighlighting(editorHighlightStyle),
      placeholderExtension(props.placeholder),
      EditorView.updateListener.of(update => {
        if (update.docChanged && !applyingExternalValue) {
          const value = update.state.doc.toString()
          emit('update:modelValue', value)
          emit('change', value)
        }
        if (update.docChanged || update.selectionSet) {
          emitCursorPosition(update.view)
        }
      }),
      EditorView.theme({
        '&': {
          height: '100%',
          color: 'var(--color-text)',
          backgroundColor: 'var(--color-surface)',
          fontSize: '0.875rem'
        },
        '&.cm-focused': {
          outline: '2px solid var(--color-primary-light)'
        },
        '.cm-scroller': {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          lineHeight: '1.5'
        },
        '.cm-content': {
          padding: '12px 0',
          caretColor: 'var(--color-primary)'
        },
        '.cm-line': {
          padding: '0 14px'
        },
        '.cm-gutters': {
          color: 'var(--color-text-subtle)',
          backgroundColor: 'var(--color-bg-alt)',
          borderRight: '1px solid var(--color-border)'
        },
        '.cm-activeLine, .cm-activeLineGutter': {
          backgroundColor: 'var(--color-primary-light)'
        },
        '.cm-selectionBackground, ::selection': {
          backgroundColor: 'var(--color-primary-light) !important'
        },
        '.cm-placeholder': {
          color: 'var(--color-text-subtle)'
        },
        '.cm-lintRange-error': {
          backgroundImage: 'none',
          borderBottom: '2px dotted var(--color-error)'
        },
        '.cm-tooltip-lint': {
          color: 'var(--color-text)',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-element)',
          boxShadow: 'var(--shadow-card)'
        }
      })
    ]
  })

  editorView = new EditorView({
    state,
    parent: editorHost.value
  })
  emitCursorPosition(editorView)
})

watch(() => props.modelValue, value => {
  if (!editorView || value === editorView.state.doc.toString()) {
    return
  }

  applyingExternalValue = true
  try {
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: value
      }
    })
  } finally {
    applyingExternalValue = false
  }
})

watch(() => props.language, language => {
  editorView?.dispatch({
    effects: languageCompartment.reconfigure(languageExtensions(language))
  })
})

watch(() => props.lineWrapping, enabled => {
  editorView?.dispatch({
    effects: wrappingCompartment.reconfigure(wrappingExtension(enabled))
  })
})

onBeforeUnmount(() => {
  editorView?.destroy()
})
</script>

<style scoped>
.code-editor {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-element);
  background: var(--color-surface);
}

.code-editor:focus-within {
  border-color: var(--color-primary);
}
</style>
