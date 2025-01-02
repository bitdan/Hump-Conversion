<template>
  <div class="max-w-7xl mx-auto p-4">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <v-text-field
          v-model="className"
          label="类名"
          variant="outlined"
          density="comfortable"
          hide-details
          class="w-48"
          placeholder="Root"
          @input="autoConvert"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <!-- 左侧输入 -->
      <div>
        <v-textarea
          v-model="inputJson"
          rows="25"
          variant="outlined"
          placeholder="在此粘贴 JSON 数据，将自动格式化并转换..."
          class="font-mono"
          hide-details
          :error-messages="error ? [error] : []"
          @input="autoConvert"
        />
      </div>

      <!-- 右侧输出 -->
      <div>
        <v-textarea
          v-model="outputCode"
          rows="25"
          variant="outlined"
          readonly
          placeholder="Java类将显示在这里..."
          class="font-mono"
          hide-details
        />
      </div>
    </div>

    <!-- 复制按钮 -->
    <div class="mt-4 flex justify-end">
      <v-btn
        color="primary"
        variant="text"
        @click="copyToClipboard"
        :disabled="!outputCode"
        prepend-icon="mdi-content-copy"
      >
        复制结果
      </v-btn>
    </div>

    <!-- 提示消息 -->
    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      :timeout="2000"
    >
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { convertJsonToJava } from '../utils/jsonConverter'
import { debounce } from '../utils/helpers'

// 状态定义
const inputJson = ref('')
const outputCode = ref('')
const error = ref('')
const showSnackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const className = ref('Root')

// 自动格式化和转换
const autoConvert = debounce(() => {
  if (!inputJson.value.trim()) {
    outputCode.value = ''
    error.value = ''
    return
  }

  try {
    // 尝试解析和格式化JSON
    const parsed = JSON.parse(inputJson.value)
    const formatted = JSON.stringify(parsed, null, 2)
    
    // 只有当格式化后的内容不同时才更新输入框
    if (formatted !== inputJson.value) {
      inputJson.value = formatted
    }
    
    // 转换为Java类
    outputCode.value = convertJsonToJava(parsed, className.value || 'Root')
    error.value = ''
  } catch (e) {
    error.value = '无效的 JSON 格式'
    outputCode.value = ''
  }
}, 500)

// 监听类名变化
watch(className, autoConvert)

// 复制到剪贴板
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(outputCode.value)
    showSuccessMessage('已复制到剪贴板')
  } catch (e) {
    showErrorMessage('复制失败')
  }
}

// 显示成功消息
function showSuccessMessage(message: string) {
  snackbarColor.value = 'success'
  snackbarText.value = message
  showSnackbar.value = true
}

// 显示错误消息
function showErrorMessage(message: string) {
  snackbarColor.value = 'error'
  snackbarText.value = message
  showSnackbar.value = true
}
</script>

<style scoped>
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
</style> 