<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- 标题区域 -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          JSON 编辑器
        </h1>
        <p class="text-gray-600 mt-2">支持自动格式化、转义字符处理、语法验证等功能</p>
      </div>

      <!-- 主要内容区域 -->
      <div class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-6">
        <!-- 工具栏 -->
        <div class="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div class="flex flex-wrap items-center gap-3">
            <v-btn
              color="primary"
              variant="tonal"
              density="comfortable"
              @click="formatJson"
              :disabled="!jsonInput.trim()"
              class="text-sm"
            >
              <v-icon icon="mdi-code-json" size="small" class="mr-1" />
              格式化
            </v-btn>
            
            <v-btn
              color="secondary"
              variant="tonal"
              density="comfortable"
              @click="minifyJson"
              :disabled="!jsonInput.trim()"
              class="text-sm"
            >
              <v-icon icon="mdi-compress" size="small" class="mr-1" />
              压缩
            </v-btn>
            
            <v-btn
              color="info"
              variant="tonal"
              density="comfortable"
              @click="addEscapeCharacters"
              :disabled="!jsonInput.trim()"
              class="text-sm"
            >
              <v-icon icon="mdi-format-text" size="small" class="mr-1" />
              添加转义
            </v-btn>
            
            <v-btn
              color="warning"
              variant="tonal"
              density="comfortable"
              @click="removeEscapeCharacters"
              :disabled="!jsonInput.trim()"
              class="text-sm"
            >
              <v-icon icon="mdi-format-text-variant" size="small" class="mr-1" />
              移除转义
            </v-btn>
            
            <v-btn
              color="success"
              variant="tonal"
              density="comfortable"
              @click="copyToClipboard"
              :disabled="!jsonInput.trim()"
              class="text-sm"
            >
              <v-icon icon="mdi-content-copy" size="small" class="mr-1" />
              复制
            </v-btn>
            
            <v-btn
              color="error"
              variant="tonal"
              density="comfortable"
              @click="clearAll"
              :disabled="!jsonInput.trim()"
              class="text-sm"
            >
              <v-icon icon="mdi-delete" size="small" class="mr-1" />
              清空
            </v-btn>
          </div>
          
          <div class="flex items-center gap-2">
            <v-switch
              v-model="autoFormat"
              color="primary"
              density="compact"
              hide-details
              class="text-sm"
            >
              <template #label>
                <span class="text-sm text-gray-600">自动格式化</span>
              </template>
            </v-switch>
          </div>
        </div>

        <!-- 状态栏 -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-4">
            <v-chip
              v-if="isValidJson"
              color="success"
              size="small"
              variant="tonal"
            >
              <v-icon icon="mdi-check-circle" size="small" class="mr-1" />
              有效 JSON
            </v-chip>
            <v-chip
              v-else-if="jsonInput.trim()"
              color="error"
              size="small"
              variant="tonal"
            >
              <v-icon icon="mdi-alert-circle" size="small" class="mr-1" />
              {{ errorMessage || '无效 JSON' }}
            </v-chip>
            <v-chip
              v-if="jsonInput.trim()"
              color="info"
              size="small"
              variant="tonal"
            >
              <v-icon icon="mdi-text" size="small" class="mr-1" />
              {{ jsonInput.length }} 字符
            </v-chip>
          </div>
          
          <div class="text-sm text-gray-500">
            行 {{ currentLine }} | 列 {{ currentColumn }}
          </div>
        </div>

        <!-- JSON 编辑器 -->
        <div class="relative">
          <v-textarea
            ref="jsonTextarea"
            v-model="jsonInput"
            rows="20"
            variant="outlined"
            placeholder="在此输入或粘贴 JSON 数据..."
            class="font-mono bg-white rounded-lg transition-all duration-200 hover:shadow-md"
            hide-details
            @input="handleInput"
            @keydown="handleKeydown"
            @click="updateCursorPosition"
            @keyup="updateCursorPosition"
            :error="!isValidJson && jsonInput.trim() !== ''"
            :error-messages="!isValidJson && jsonInput.trim() !== '' ? [errorMessage] : []"
          />
          
          <!-- 行号显示 -->
          <div class="absolute left-0 top-0 bottom-0 w-12 bg-gray-50 border-r border-gray-200 rounded-l-lg flex flex-col items-center py-3 text-xs text-gray-500 font-mono overflow-hidden">
            <div
              v-for="(line, index) in lineNumbers"
              :key="index"
              class="leading-6 h-6 flex items-center justify-center"
            >
              {{ index + 1 }}
            </div>
          </div>
        </div>

        <!-- 示例 JSON -->
        <div class="mt-6">
          <v-expansion-panels variant="accordion">
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon icon="mdi-lightbulb-outline" class="mr-2" />
                示例 JSON
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="space-y-3">
                  <div class="flex flex-wrap gap-2">
                    <v-btn
                      v-for="example in examples"
                      :key="example.name"
                      size="small"
                      variant="outlined"
                      @click="loadExample(example.data)"
                      class="text-xs"
                    >
                      {{ example.name }}
                    </v-btn>
                  </div>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
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
import { ref, computed, watch, nextTick } from 'vue'
import { debounce } from '../../utils/helpers'

// 状态定义
const jsonInput = ref('')
const autoFormat = ref(true)
const showSnackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const currentLine = ref(1)
const currentColumn = ref(1)
const jsonTextarea = ref()

// 示例数据
const examples = [
  {
    name: '用户信息',
    data: {
      "id": 1,
      "name": "张三",
      "email": "zhangsan@example.com",
      "profile": {
        "age": 25,
        "city": "北京",
        "hobbies": ["读书", "游泳", "编程"]
      },
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  },
  {
    name: 'API 响应',
    data: {
      "code": 200,
      "message": "success",
      "data": {
        "users": [
          {
            "id": 1,
            "username": "admin",
            "role": "administrator"
          },
          {
            "id": 2,
            "username": "user",
            "role": "user"
          }
        ],
        "pagination": {
          "page": 1,
          "limit": 10,
          "total": 2
        }
      }
    }
  },
  {
    name: '配置信息',
    data: {
      "app": {
        "name": "My App",
        "version": "1.0.0",
        "debug": false
      },
      "database": {
        "host": "localhost",
        "port": 5432,
        "name": "myapp_db",
        "ssl": true
      },
      "features": {
        "auth": true,
        "notifications": false,
        "analytics": true
      }
    }
  }
]

// 计算属性
const isValidJson = computed(() => {
  if (!jsonInput.value.trim()) return true
  try {
    JSON.parse(jsonInput.value)
    return true
  } catch {
    return false
  }
})

const errorMessage = computed(() => {
  if (!jsonInput.value.trim()) return ''
  try {
    JSON.parse(jsonInput.value)
    return ''
  } catch (e) {
    return e instanceof Error ? e.message : 'JSON 格式错误'
  }
})

const lineNumbers = computed(() => {
  return jsonInput.value.split('\n')
})

// 自动格式化处理
const handleInput = debounce(() => {
  if (autoFormat.value && isValidJson.value) {
    try {
      const parsed = JSON.parse(jsonInput.value)
      const formatted = JSON.stringify(parsed, null, 2)
      if (formatted !== jsonInput.value) {
        jsonInput.value = formatted
      }
    } catch {
      // 忽略格式化错误，保持用户输入
    }
  }
  updateCursorPosition()
}, 300)

// 更新光标位置
function updateCursorPosition() {
  nextTick(() => {
    if (jsonTextarea.value) {
      const textarea = jsonTextarea.value.$el.querySelector('textarea')
      if (textarea) {
        const cursorPos = textarea.selectionStart
        const textBeforeCursor = jsonInput.value.substring(0, cursorPos)
        const lines = textBeforeCursor.split('\n')
        currentLine.value = lines.length
        currentColumn.value = lines[lines.length - 1].length + 1
      }
    }
  })
}

// 键盘事件处理
function handleKeydown(event: KeyboardEvent) {
  // Tab 键处理
  if (event.key === 'Tab') {
    event.preventDefault()
    const textarea = event.target as HTMLTextAreaElement
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    
    // 插入两个空格
    const newValue = jsonInput.value.substring(0, start) + '  ' + jsonInput.value.substring(end)
    jsonInput.value = newValue
    
    // 设置光标位置
    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2
    })
  }
}

// 格式化 JSON
function formatJson() {
  if (!jsonInput.value.trim()) return
  
  try {
    const parsed = JSON.parse(jsonInput.value)
    jsonInput.value = JSON.stringify(parsed, null, 2)
    showSuccessMessage('JSON 格式化成功')
  } catch (e) {
    showErrorMessage('JSON 格式错误，无法格式化')
  }
}

// 压缩 JSON
function minifyJson() {
  if (!jsonInput.value.trim()) return
  
  try {
    const parsed = JSON.parse(jsonInput.value)
    jsonInput.value = JSON.stringify(parsed)
    showSuccessMessage('JSON 压缩成功')
  } catch (e) {
    showErrorMessage('JSON 格式错误，无法压缩')
  }
}

// 添加转义字符
function addEscapeCharacters() {
  if (!jsonInput.value.trim()) return
  
  try {
    // 先验证 JSON 是否有效
    JSON.parse(jsonInput.value)
    
    // 添加转义字符
    const escaped = jsonInput.value
      .replace(/\\/g, '\\\\')  // 反斜杠
      .replace(/"/g, '\\"')    // 双引号
      .replace(/\n/g, '\\n')   // 换行符
      .replace(/\r/g, '\\r')   // 回车符
      .replace(/\t/g, '\\t')   // 制表符
    
    jsonInput.value = escaped
    showSuccessMessage('转义字符添加成功')
  } catch (e) {
    showErrorMessage('JSON 格式错误，无法添加转义字符')
  }
}

// 移除转义字符
function removeEscapeCharacters() {
  if (!jsonInput.value.trim()) return
  
  try {
    // 移除转义字符
    const unescaped = jsonInput.value
      .replace(/\\n/g, '\n')   // 换行符
      .replace(/\\r/g, '\r')   // 回车符
      .replace(/\\t/g, '\t')   // 制表符
      .replace(/\\"/g, '"')    // 双引号
      .replace(/\\\\/g, '\\')  // 反斜杠
    
    jsonInput.value = unescaped
    
    // 尝试格式化
    if (autoFormat.value) {
      const parsed = JSON.parse(jsonInput.value)
      jsonInput.value = JSON.stringify(parsed, null, 2)
    }
    
    showSuccessMessage('转义字符移除成功')
  } catch (e) {
    showErrorMessage('移除转义字符后 JSON 格式错误')
  }
}

// 复制到剪贴板
async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(jsonInput.value)
    showSuccessMessage('已复制到剪贴板')
  } catch (e) {
    showErrorMessage('复制失败')
  }
}

// 清空内容
function clearAll() {
  jsonInput.value = ''
  showSuccessMessage('内容已清空')
}

// 加载示例
function loadExample(data: any) {
  jsonInput.value = JSON.stringify(data, null, 2)
  showSuccessMessage('示例已加载')
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

// 监听自动格式化设置变化
watch(autoFormat, (newVal) => {
  if (newVal && isValidJson.value) {
    formatJson()
  }
})
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
  padding-left: 3rem !important;
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

/* 按钮样式 */
:deep(.v-btn) {
  text-transform: none !important;
  font-weight: 500 !important;
}

/* 芯片样式 */
:deep(.v-chip.v-chip--size-small) {
  font-size: 0.75rem !important;
  height: 24px !important;
}

/* 开关样式 */
:deep(.v-switch .v-label) {
  font-size: 0.875rem !important;
}

/* 扩展面板样式 */
:deep(.v-expansion-panel-title) {
  font-weight: 500 !important;
}

/* 行号样式 */
.line-numbers {
  user-select: none;
  pointer-events: none;
}
</style>
