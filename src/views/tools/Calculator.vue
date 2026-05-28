<template>
  <ToolPageLayout max-width="max-w-4xl">
      <!-- 计算区域 -->
      <div class="space-y-4 mb-6">
        <!-- 当前输入行 -->
        <div class="flex gap-4 items-center">
          <v-text-field
            v-model="currentInput"
            placeholder="输入数学表达式，如：2 + 3 * 4"
            variant="outlined"
            class="flex-1 bg-white/80 rounded-xl"
            hide-details
            @keydown.enter="calculateAndAddLine"
            @keydown.escape="clearAll"
            ref="inputField"
          />
          <v-btn
            @click="calculateAndAddLine"
            color="primary"
            variant="elevated"
            class="rounded-xl"
            :disabled="!currentInput.trim()"
          >
            计算
          </v-btn>
          <v-btn
            @click="clearAll"
            color="error"
            variant="outlined"
            class="rounded-xl"
          >
            清空
          </v-btn>
        </div>
      </div>

      <!-- 计算历史 -->
      <div class="space-y-3 max-h-96 overflow-y-auto">
        <div
          v-for="(line, index) in calculationLines"
          :key="index"
          class="bg-white/80 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 hover:shadow-md"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="text-sm text-gray-600 mb-1">第 {{ index + 1 }} 行</div>
              <div class="font-mono text-lg">
                <span class="text-gray-800">{{ line.expression }}</span>
                <span class="text-gray-500 mx-2">=</span>
                <span 
                  class="font-bold"
                  :class="line.isError ? 'text-red-600' : 'text-green-600'"
                >
                  {{ line.result }}
                </span>
              </div>
            </div>
            <div class="flex gap-2">
              <v-btn
                @click="copyResult(line.result)"
                size="small"
                variant="text"
                color="primary"
                class="min-w-0"
              >
                <v-icon size="small">mdi-content-copy</v-icon>
              </v-btn>
              <v-btn
                @click="deleteLine(index)"
                size="small"
                variant="text"
                color="error"
                class="min-w-0"
              >
                <v-icon size="small">mdi-delete</v-icon>
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- 统计信息 -->
      <div v-if="calculationLines.length > 0" class="mt-6 p-4 bg-blue-50/80 rounded-xl">
        <div class="flex justify-between items-center text-sm text-gray-600">
          <span>总计算行数: {{ calculationLines.length }}</span>
          <span>成功计算: {{ successfulCalculations }}</span>
          <span>错误计算: {{ errorCalculations }}</span>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="mt-8 p-4 bg-gray-50/80 rounded-xl">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">使用说明</h3>
        <ul class="text-sm text-gray-600 space-y-1">
          <li>• 支持基本数学运算：+、-、*、/、()</li>
          <li>• 支持幂运算：** 或 ^</li>
          <li>• 支持数学函数：Math.sin、Math.cos、Math.sqrt 等</li>
          <li>• 按回车键或点击"计算"按钮计算结果</li>
          <li>• 计算结果会自动带入下一行，方便连续计算</li>
          <li>• 按ESC键或点击"清空"按钮清空所有内容</li>
          <li>• 点击复制按钮复制计算结果</li>
        </ul>
      </div>
  </ToolPageLayout>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'

const currentInput = ref('')
const calculationLines = ref([])
const inputField = ref(null)
const copiedIndex = ref(-1)

// 计算统计
const successfulCalculations = computed(() => 
  calculationLines.value.filter(line => !line.isError).length
)

const errorCalculations = computed(() => 
  calculationLines.value.filter(line => line.isError).length
)

// 安全的数学表达式计算
const safeEval = (expression) => {
  try {
    // 移除所有空格
    const cleanExpression = expression.replace(/\s/g, '')
    
    // 安全检查：只允许数字、运算符、括号和Math函数
    const allowedPattern = /^[0-9+\-*/.()^Math\s,sin|cos|tan|sqrt|abs|floor|ceil|round|max|min|pow|log|exp]*$/
    if (!allowedPattern.test(cleanExpression)) {
      throw new Error('包含不安全的字符')
    }
    
    // 替换 ^ 为 ** (幂运算)
    const processedExpression = cleanExpression.replace(/\^/g, '**')
    
    // 使用Function构造器进行安全计算
    const result = new Function('Math', `return ${processedExpression}`)(Math)
    
    // 检查结果是否为有效数字
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('计算结果无效')
    }
    
    return result
  } catch (error) {
    throw new Error(`计算错误: ${error.message}`)
  }
}

// 格式化数字结果
const formatResult = (result) => {
  if (Number.isInteger(result)) {
    return result.toString()
  }
  // 保留6位小数，去除末尾的0
  return parseFloat(result.toFixed(6)).toString()
}

// 计算并添加到历史
const calculateAndAddLine = async () => {
  const expression = currentInput.value.trim()
  if (!expression) return
  
  try {
    const result = safeEval(expression)
    const formattedResult = formatResult(result)
    
    calculationLines.value.push({
      expression,
      result: formattedResult,
      isError: false,
      timestamp: new Date()
    })
    
    // 将计算结果带入下一行
    currentInput.value = formattedResult
    
    // 聚焦到输入框
    await nextTick()
    inputField.value?.focus()
    
  } catch (error) {
    calculationLines.value.push({
      expression,
      result: error.message,
      isError: true,
      timestamp: new Date()
    })
    
    // 如果是错误，清空当前输入
    currentInput.value = ''
    
    // 聚焦到输入框
    await nextTick()
    inputField.value?.focus()
  }
}

// 清空所有内容
const clearAll = () => {
  calculationLines.value = []
  currentInput.value = ''
  copiedIndex.value = -1
  nextTick(() => {
    inputField.value?.focus()
  })
}

// 删除指定行
const deleteLine = (index) => {
  calculationLines.value.splice(index, 1)
}

// 复制结果到剪贴板
const copyResult = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    // 可以添加复制成功的提示
  } catch (err) {
    console.error('复制失败:', err)
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

// 组件挂载后聚焦输入框
onMounted(() => {
  inputField.value?.focus()
})
</script>
