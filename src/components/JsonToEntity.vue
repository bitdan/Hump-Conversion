<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- 标题区域 -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          JSON 转 Java 实体类
        </h1>
      </div>

      <!-- 主要内容区域 -->
      <div class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6">
        <!-- 类名输入 -->
        <div class="mb-8">
          <label class="block text-sm font-medium text-gray-700 mb-2">类名</label>
          <v-text-field
            v-model="className"
            variant="outlined"
            density="comfortable"
            hide-details
            placeholder="Root"
            @input="autoConvert"
            class="max-w-xs bg-white rounded-lg"
          />
        </div>

        <div class="grid grid-cols-2 gap-8">
          <!-- 左侧输入 -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">JSON 输入</span>
              <v-chip
                v-if="error"
                color="error"
                size="small"
                class="text-xs"
              >
                {{ error }}
              </v-chip>
            </div>
            <v-textarea
              v-model="inputJson"
              rows="25"
              variant="outlined"
              placeholder="在此粘贴 JSON 数据，将自动格式化并转换..."
              class="font-mono bg-white rounded-lg transition-all duration-200 hover:shadow-md"
              hide-details
              @input="autoConvert"
            />
          </div>

          <!-- 右侧输出 -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">Java 类输出</span>
              <v-btn
                color="primary"
                variant="tonal"
                density="comfortable"
                @click="copyToClipboard"
                :disabled="!outputCode"
                class="text-xs"
                elevation="0"
              >
                <v-icon icon="mdi-content-copy" size="small" class="mr-1" />
                复制代码
              </v-btn>
            </div>
            <v-textarea
              v-model="outputCode"
              rows="25"
              variant="outlined"
              readonly
              placeholder="Java类将显示在这里..."
              class="font-mono bg-white rounded-lg transition-all duration-200"
              hide-details
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 提示消息 -->
    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      :timeout="2000"
      location="top"
      class="!rounded-lg"
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

:deep(.v-field) {
  border-radius: 0.75rem !important;
  background-color: white !important;
  transition: all 0.2s ease-in-out;
}

:deep(.v-field.v-field--focused) {
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1) !important;
}

:deep(.v-field.v-field--error) {
  background-color: rgb(254 242 242) !important;
}

:deep(.v-textarea textarea) {
  padding: 0.75rem !important;
  line-height: 1.5 !important;
  font-size: 0.875rem !important;
}

/* 自定义滚动条样式 */
:deep(.v-textarea textarea::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

:deep(.v-textarea textarea::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.v-textarea textarea::-webkit-scrollbar-thumb) {
  background-color: #cbd5e1;
  border-radius: 3px;
}

:deep(.v-textarea textarea::-webkit-scrollbar-thumb:hover) {
  background-color: #94a3b8;
}

/* 动画效果 */
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

/* 错误提示样式 */
:deep(.v-chip.v-chip--size-small) {
  font-size: 0.75rem !important;
  height: 24px !important;
}
</style> 