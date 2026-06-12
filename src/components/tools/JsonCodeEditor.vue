<template>
  <div ref="editorHost" class="json-code-editor" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { EditorView, placeholder } from '@codemirror/view'
import { json } from '@codemirror/lang-json'
import { lintGutter, linter } from '@codemirror/lint'
import type { Diagnostic } from '@codemirror/lint'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
  cursorChange: [position: { line: number; column: number }]
}>()

const editorHost = ref<HTMLElement>()
let editorView: EditorView | undefined
let applyingExternalValue = false

const jsonHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--color-primary-dark)', fontWeight: '600' },
  { tag: tags.string, color: 'var(--color-success)' },
  { tag: tags.number, color: 'var(--color-warning)' },
  { tag: tags.bool, color: 'var(--color-info)', fontWeight: '600' },
  { tag: tags.null, color: 'var(--color-text-muted)', fontStyle: 'italic' },
  { tag: [tags.squareBracket, tags.brace], color: 'var(--color-text)' },
  { tag: tags.separator, color: 'var(--color-text-subtle)' }
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

function emitCursorPosition(view: EditorView) {
  const head = view.state.selection.main.head
  const line = view.state.doc.lineAt(head)
  emit('cursorChange', {
    line: line.number,
    column: head - line.from + 1
  })
}

onMounted(() => {
  if (!editorHost.value) {
    return
  }

  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      basicSetup,
      json(),
      lintGutter(),
      linter(view => createJsonDiagnostic(view.state.doc.toString()), { delay: 250 }),
      syntaxHighlighting(jsonHighlightStyle),
      placeholder('在此输入或粘贴 JSON 数据...'),
      EditorView.lineWrapping,
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

onBeforeUnmount(() => {
  editorView?.destroy()
})
</script>

<style scoped>
.json-code-editor {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-element);
  background: var(--color-surface);
}

.json-code-editor:focus-within {
  border-color: var(--color-primary);
}
</style>
