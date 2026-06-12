<template>
  <ToolPageLayout :card="false" :hide-header="true" density="workspace" max-width="max-w-full">
    <div class="json-workspace glass-card">
      <div class="json-toolbar">
        <div class="json-actions">
          <v-btn
            color="primary"
            variant="tonal"
            density="compact"
            size="small"
            prepend-icon="mdi-code-json"
            :disabled="!jsonInput.trim()"
            @click="formatJson"
          >
            格式化
          </v-btn>

          <v-btn
            color="secondary"
            variant="tonal"
            density="compact"
            size="small"
            prepend-icon="mdi-compress"
            :disabled="!jsonInput.trim()"
            @click="minifyJson"
          >
            压缩
          </v-btn>

          <v-btn
            color="info"
            variant="tonal"
            density="compact"
            size="small"
            prepend-icon="mdi-format-text"
            :disabled="!jsonInput.trim()"
            @click="addEscapeCharacters"
          >
            添加转义
          </v-btn>

          <v-btn
            color="warning"
            variant="tonal"
            density="compact"
            size="small"
            prepend-icon="mdi-format-text-variant"
            :disabled="!jsonInput.trim()"
            @click="removeEscapeCharacters"
          >
            移除转义
          </v-btn>

          <v-btn
            color="success"
            variant="tonal"
            density="compact"
            size="small"
            prepend-icon="mdi-content-copy"
            :disabled="!jsonInput.trim()"
            @click="copyToClipboard"
          >
            复制
          </v-btn>

          <v-btn
            color="error"
            variant="tonal"
            density="compact"
            size="small"
            prepend-icon="mdi-delete"
            :disabled="!jsonInput.trim()"
            @click="clearAll"
          >
            清空
          </v-btn>
        </div>
      </div>

      <div class="json-status">
        <div class="json-status__summary">
          <v-chip :color="isValidJson ? 'success' : 'error'" size="small" variant="tonal">
            <v-icon :icon="isValidJson ? 'mdi-check-circle' : 'mdi-alert-circle'" start />
            {{ isValidJson ? '有效 JSON' : errorMessage }}
          </v-chip>
          <v-chip v-if="jsonInput.trim()" color="info" size="small" variant="tonal">
            <v-icon icon="mdi-text" start />
            {{ jsonInput.length }} 字符
          </v-chip>
        </div>

        <div class="json-status__controls">
          <v-switch
            v-model="autoFormat"
            color="primary"
            density="compact"
            hide-details
            label="自动格式化"
          />
          <span class="json-cursor">行 {{ currentLine }} | 列 {{ currentColumn }}</span>
        </div>
      </div>

      <CodeEditor
        v-model="jsonInput"
        language="json"
        placeholder="在此输入或粘贴 JSON 数据..."
        class="json-editor"
        @change="handleEditorChange"
        @cursor-change="updateCursorPosition"
      />
    </div>

    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      :timeout="2000"
      location="top"
    >
      {{ snackbarText }}
    </v-snackbar>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolPageLayout from '../../components/ToolPageLayout.vue'
import CodeEditor from '../../components/tools/CodeEditor.vue'
import { debounce } from '../../utils/helpers'
import {
  escapeJsonText,
  formatJsonWithNestedStrings,
  minifyJsonWithNestedStrings,
  unescapeJsonText
} from '../../utils/jsonFormatter'

const jsonInput = ref('')
const autoFormat = ref(true)
const showSnackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const currentLine = ref(1)
const currentColumn = ref(1)

const isValidJson = computed(() => {
  if (!jsonInput.value.trim()) {
    return true
  }
  try {
    JSON.parse(jsonInput.value)
    return true
  } catch {
    return false
  }
})

const errorMessage = computed(() => {
  if (!jsonInput.value.trim()) {
    return ''
  }
  try {
    JSON.parse(jsonInput.value)
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : 'JSON 格式错误'
  }
})

const handleEditorChange = debounce(() => {
  if (!autoFormat.value || !isValidJson.value || !jsonInput.value.trim()) {
    return
  }

  try {
    const result = formatJsonWithNestedStrings(jsonInput.value)
    if (result.text !== jsonInput.value) {
      jsonInput.value = result.text
    }
  } catch {
    // 编辑过程中保留当前内容，由 CodeMirror 标记语法错误。
  }
}, 300)

function updateCursorPosition(position: { line: number; column: number }) {
  currentLine.value = position.line
  currentColumn.value = position.column
}

function formatJson() {
  if (!jsonInput.value.trim()) {
    return
  }

  try {
    const result = formatJsonWithNestedStrings(jsonInput.value)
    jsonInput.value = result.text
    showSuccessMessage(getFormatSuccessMessage(result.expandedStringCount))
  } catch {
    showErrorMessage('JSON 格式错误，无法格式化')
  }
}

function minifyJson() {
  if (!jsonInput.value.trim()) {
    return
  }

  try {
    const result = minifyJsonWithNestedStrings(jsonInput.value)
    jsonInput.value = result.text
    showSuccessMessage(getFormatSuccessMessage(result.expandedStringCount, true))
  } catch {
    showErrorMessage('JSON 格式错误，无法压缩')
  }
}

function getFormatSuccessMessage(expandedStringCount: number, minified = false) {
  const action = minified ? '压缩' : '格式化'
  return expandedStringCount === 0
    ? `JSON ${action}成功`
    : `JSON ${action}成功，已展开 ${expandedStringCount} 个转义 JSON 字段`
}

function addEscapeCharacters() {
  if (!jsonInput.value.trim()) {
    return
  }

  try {
    jsonInput.value = escapeJsonText(jsonInput.value)
    showSuccessMessage('转义字符添加成功')
  } catch {
    showErrorMessage('JSON 格式错误，无法添加转义字符')
  }
}

function removeEscapeCharacters() {
  if (!jsonInput.value.trim()) {
    return
  }

  try {
    const unescaped = unescapeJsonText(jsonInput.value)
    jsonInput.value = autoFormat.value
      ? formatJsonWithNestedStrings(unescaped).text
      : unescaped
    showSuccessMessage('转义字符移除成功')
  } catch {
    showErrorMessage('移除转义字符后 JSON 格式错误')
  }
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(jsonInput.value)
    showSuccessMessage('已复制到剪贴板')
  } catch {
    showErrorMessage('复制失败')
  }
}

function clearAll() {
  jsonInput.value = ''
  showSuccessMessage('内容已清空')
}

function showSuccessMessage(message: string) {
  snackbarColor.value = 'success'
  snackbarText.value = message
  showSnackbar.value = true
}

function showErrorMessage(message: string) {
  snackbarColor.value = 'error'
  snackbarText.value = message
  showSnackbar.value = true
}

watch(autoFormat, enabled => {
  if (enabled && isValidJson.value && jsonInput.value.trim()) {
    formatJson()
  }
})
</script>

<style scoped>
.json-workspace {
  height: calc(100dvh - 32px);
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-tight);
  overflow: hidden;
}

.json-toolbar {
  flex: 0 0 auto;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.json-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  width: max-content;
  min-width: 100%;
  white-space: nowrap;
}

.json-actions :deep(.v-btn) {
  flex: 0 0 auto;
}

.json-status {
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-tight);
  flex: 0 0 auto;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  overflow-x: auto;
  white-space: nowrap;
}

.json-status__summary,
.json-status__controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.json-status__controls :deep(.v-switch) {
  flex: 0 0 auto;
}

.json-status__controls :deep(.v-label) {
  font-size: 0.75rem;
}

.json-cursor {
  min-width: 74px;
  text-align: right;
}

.json-editor {
  flex: 1;
  min-height: 0;
}

@media (max-width: 960px) {
  .json-workspace {
    height: calc(100dvh - 80px);
  }

  .json-status {
    min-height: 30px;
  }
}
</style>
