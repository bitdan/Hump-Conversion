<template>
  <div class="page-container">
    <div class="max-w-7xl mx-auto">
      <div class="page-header">
        <div>
          <h1>进制转换工具</h1>
          <p>支持 2~36 进制互转，可带前导负号与分组显示</p>
        </div>
      </div>

      <div class="glass-card p-6">
        <div class="grid grid-cols-2 gap-8">
          <!-- 左侧输入 -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">左侧进制</label>
              <v-select
                v-model="leftBase"
                :items="bases"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="comfortable"
                hide-details
                class="bg-white rounded-lg"
                @update:model-value="onLeftBaseChange"
              />
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">左侧数值</span>
              <v-chip v-if="leftError" color="error" size="small" class="text-xs">{{ leftError }}</v-chip>
            </div>

            <v-textarea
              v-model="leftValue"
              rows="12"
              variant="outlined"
              placeholder="在此输入要转换的数值，支持 2~36 进制，可带前导负号"
              class="font-mono bg-white rounded-lg transition-all duration-200 hover:shadow-md"
              hide-details
              @input="onLeftInput"
            />

            <div class="flex justify-end">
              <v-btn
                color="primary"
                variant="tonal"
                density="comfortable"
                class="text-xs"
                elevation="0"
                :disabled="!leftValue"
                @click="copyLeft"
              >
                <v-icon icon="mdi-content-copy" size="small" class="mr-1" />复制左侧
              </v-btn>
            </div>
          </div>

          <!-- 右侧输入 -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">右侧进制</label>
              <v-select
                v-model="rightBase"
                :items="bases"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="comfortable"
                hide-details
                class="bg-white rounded-lg"
                @update:model-value="onRightBaseChange"
              />
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">右侧数值</span>
              <v-chip v-if="rightError" color="error" size="small" class="text-xs">{{ rightError }}</v-chip>
            </div>

            <v-textarea
              v-model="rightValue"
              rows="12"
              variant="outlined"
              placeholder="在此输入要转换的数值，支持 2~36 进制，可带前导负号"
              class="font-mono bg-white rounded-lg transition-all duration-200 hover:shadow-md"
              hide-details
              @input="onRightInput"
            />

            <div class="grid grid-cols-2 gap-4">
              <v-text-field
                label="分组长度（可选）"
                v-model.number="groupSize"
                type="number"
                min="0"
                variant="outlined"
                density="comfortable"
                hide-details
                placeholder="0 表示不分组"
                class="bg-white rounded-lg"
                @input="triggerReformat"
              />
              <v-select
                label="分组分隔符"
                v-model="groupSeparator"
                :items="separators"
                variant="outlined"
                density="comfortable"
                hide-details
                class="bg-white rounded-lg"
                @update:model-value="triggerReformat"
              />
            </div>

            <div class="flex justify-end">
              <v-btn
                color="primary"
                variant="tonal"
                density="comfortable"
                class="text-xs"
                elevation="0"
                :disabled="!rightValue"
                @click="copyRight"
              >
                <v-icon icon="mdi-content-copy" size="small" class="mr-1" />复制右侧
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </div>

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
import { debounce } from '../../utils/helpers'

const bases = Array.from({ length: 35 }, (_, i) => i + 2).map(value => ({
  value,
  label: `${value} 进制`,
}))

const separators = [
  { title: '空格', value: ' ' },
  { title: '下划线', value: '_' },
  { title: '逗号', value: ',' },
  { title: '无', value: '' },
]

const leftValue = ref('')
const rightValue = ref('')
const leftError = ref('')
const rightError = ref('')
const leftBase = ref(10)
const rightBase = ref(16)
const groupSize = ref<number>(0)
const groupSeparator = ref<string>(' ')

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

function isValidInBase(raw: string, base: number): boolean {
  const s = raw.trim()
  if (!s) return false
  const neg = s[0] === '-'
  const body = neg ? s.slice(1) : s
  if (!body) return false
  const re = new RegExp(`^[${DIGITS.slice(0, base)}]+$`, 'i')
  return re.test(body)
}

function parseToBigInt(raw: string, base: number): bigint {
  const s = raw.trim().toLowerCase()
  const neg = s[0] === '-'
  const body = neg ? s.slice(1) : s
  let value = BigInt(0)
  for (const ch of body) {
    const digit = BigInt(DIGITS.indexOf(ch))
    value = value * BigInt(base) + digit
  }
  return neg ? -value : value
}

function bigIntToBase(n: bigint, base: number): string {
  const neg = n < BigInt(0)
  let x = neg ? -n : n
  if (x === BigInt(0)) return '0'
  const b = BigInt(base)
  let out = ''
  while (x > BigInt(0)) {
    const rem = Number(x % b)
    out = DIGITS[rem] + out
    x = x / b
  }
  return neg ? `-${out}` : out
}

function groupString(s: string, size: number, sep: string): string {
  if (!size || size <= 0) return s
  const neg = s.startsWith('-')
  const body = neg ? s.slice(1) : s
  const parts: string[] = []
  for (let i = body.length; i > 0; i -= size) {
    const start = Math.max(0, i - size)
    parts.unshift(body.slice(start, i))
  }
  return neg ? `-${parts.join(sep)}` : parts.join(sep)
}

let isUpdatingLeft = false
let isUpdatingRight = false

function convertLeftToRight() {
  const raw = leftValue.value
  if (!raw.trim()) {
    rightValue.value = ''
    rightError.value = ''
    return
  }
  if (leftBase.value < 2 || leftBase.value > 36 || rightBase.value < 2 || rightBase.value > 36) {
    rightError.value = '进制范围必须在 2~36 之间'
    rightValue.value = ''
    return
  }
  if (!isValidInBase(raw, leftBase.value)) {
    rightError.value = `输入包含超出 ${leftBase.value} 进制的字符`
    rightValue.value = ''
    return
  }
  try {
    const big = parseToBigInt(raw, leftBase.value)
    const converted = bigIntToBase(big, rightBase.value)
    rightValue.value = groupString(converted, groupSize.value, groupSeparator.value)
    rightError.value = ''
  } catch (e) {
    rightError.value = '转换失败，请检查输入'
    rightValue.value = ''
  }
}

function convertRightToLeft() {
  const raw = rightValue.value
  if (!raw.trim()) {
    leftValue.value = ''
    leftError.value = ''
    return
  }
  if (leftBase.value < 2 || leftBase.value > 36 || rightBase.value < 2 || rightBase.value > 36) {
    leftError.value = '进制范围必须在 2~36 之间'
    leftValue.value = ''
    return
  }
  if (!isValidInBase(raw, rightBase.value)) {
    leftError.value = `输入包含超出 ${rightBase.value} 进制的字符`
    leftValue.value = ''
    return
  }
  try {
    const big = parseToBigInt(raw, rightBase.value)
    const converted = bigIntToBase(big, leftBase.value)
    leftValue.value = groupString(converted, groupSize.value, groupSeparator.value)
    leftError.value = ''
  } catch (e) {
    leftError.value = '转换失败，请检查输入'
    leftValue.value = ''
  }
}

const lastEdited = ref<'left' | 'right' | null>(null)

const onLeftInput = debounce(() => {
  if (isUpdatingLeft) return
  lastEdited.value = 'left'
  isUpdatingRight = true
  convertLeftToRight()
  isUpdatingRight = false
}, 300)

const onRightInput = debounce(() => {
  if (isUpdatingRight) return
  lastEdited.value = 'right'
  isUpdatingLeft = true
  convertRightToLeft()
  isUpdatingLeft = false
}, 300)

function onLeftBaseChange() {
  if (lastEdited.value === 'right') {
    onRightInput()
  } else {
    onLeftInput()
  }
}

function onRightBaseChange() {
  if (lastEdited.value === 'left') {
    onLeftInput()
  } else {
    onRightInput()
  }
}

function triggerReformat() {
  if (lastEdited.value === 'right') {
    onRightInput()
  } else {
    onLeftInput()
  }
}

const showSnackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

async function copyLeft() {
  try {
    await navigator.clipboard.writeText(leftValue.value)
    showSuccess('已复制左侧内容')
  } catch (e) {
    showError('复制失败')
  }
}

async function copyRight() {
  try {
    await navigator.clipboard.writeText(rightValue.value)
    showSuccess('已复制右侧内容')
  } catch (e) {
    showError('复制失败')
  }
}

function showSuccess(message: string) {
  snackbarColor.value = 'success'
  snackbarText.value = message
  showSnackbar.value = true
}

function showError(message: string) {
  snackbarColor.value = 'error'
  snackbarText.value = message
  showSnackbar.value = true
}
</script>

<style scoped>
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

::deep(.v-field) {
  border-radius: 0.75rem !important;
  background-color: white !important;
  transition: all 0.2s ease-in-out;
}

::deep(.v-field.v-field--focused) {
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1) !important;
}

::deep(.v-field.v-field--error) {
  background-color: rgb(254 242 242) !important;
}

::deep(.v-textarea textarea) {
  padding: 0.75rem !important;
  line-height: 1.5 !important;
  font-size: 0.875rem !important;
}

::deep(.v-textarea textarea::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

::deep(.v-textarea textarea::-webkit-scrollbar-track) {
  background: transparent;
}

::deep(.v-textarea textarea::-webkit-scrollbar-thumb) {
  background-color: #cbd5e1;
  border-radius: 3px;
}

::deep(.v-textarea textarea::-webkit-scrollbar-thumb:hover) {
  background-color: #94a3b8;
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

::deep(.v-chip.v-chip--size-small) {
  font-size: 0.75rem !important;
  height: 24px !important;
}
</style>


