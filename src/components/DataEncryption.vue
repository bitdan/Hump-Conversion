<template>
  <div class="max-w-4xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6">数据加密解密工具</h1>
    
    <!-- 操作类型选择 -->
    <div class="mb-6">
      <div class="flex gap-2 mb-4">
        <button 
          @click="operationType = 'encrypt'"
          :class="[
            'px-4 py-2 rounded border',
            operationType === 'encrypt' 
              ? 'bg-blue-500 text-white border-blue-500' 
              : 'border-gray-300 hover:border-blue-500'
          ]"
        >
          加密
        </button>
        <button 
          @click="operationType = 'decrypt'"
          :class="[
            'px-4 py-2 rounded border',
            operationType === 'decrypt' 
              ? 'bg-blue-500 text-white border-blue-500' 
              : 'border-gray-300 hover:border-blue-500'
          ]"
        >
          解密
        </button>
      </div>

      <!-- 加密方式选择 -->
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="method in methods"
          :key="method.value"
          @click="currentMethod = method.value"
          :class="[
            'px-4 py-2 rounded border',
            currentMethod === method.value
              ? 'bg-blue-500 text-white border-blue-500'
              : 'border-gray-300 hover:border-blue-500'
          ]"
        >
          {{ method.label }}
        </button>
      </div>
    </div>

    <!-- AES密钥输入框 -->
    <div v-if="currentMethod === 'aes'" class="mb-4">
      <label class="block mb-2">密钥:</label>
      <input
        v-model="aesKey"
        type="text"
        placeholder="请输入AES密钥"
        class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <!-- 输入区域 -->
    <div class="mb-6">
      <label class="block mb-2">
        {{ operationType === 'encrypt' ? '待加密内容:' : '待解密内容:' }}
      </label>
      <textarea
        v-model="inputText"
        :placeholder="operationType === 'encrypt' ? '请输入要加密的内容' : '请输入要解密的内容'"
        rows="4"
        class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      ></textarea>
    </div>

    <!-- 结果展示 -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <div class="flex justify-between items-center mb-2">
        <h3 class="font-medium">
          {{ operationType === 'encrypt' ? '加密结果:' : '解密结果:' }}
        </h3>
        <button
          @click="copyToClipboard(result)"
          class="text-blue-500 hover:text-blue-600"
        >
          复制
        </button>
      </div>
      <div class="bg-white p-3 rounded border break-all min-h-[60px]">
        {{ result || '等待输入...' }}
      </div>
    </div>

    <!-- 提示消息 -->
    <div 
      v-if="message.show"
      :class="[
        'fixed top-4 right-4 px-4 py-2 rounded shadow-lg transition-opacity duration-300',
        message.type === 'success' ? 'bg-green-500' : 'bg-red-500',
        'text-white'
      ]"
    >
      {{ message.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { base64, md5, aes, urlSafeBase64 } from '../utils/crypto'

const inputText = ref('')
const aesKey = ref('your-secret-key')
const operationType = ref<'encrypt' | 'decrypt'>('encrypt')
const currentMethod = ref<'base64' | 'urlSafeBase64' | 'md5' | 'aes'>('base64')

const message = ref({
  show: false,
  text: '',
  type: 'success'
})

const methods = [
  { label: 'Base64', value: 'base64' },
  { label: 'URL Safe Base64', value: 'urlSafeBase64' },
  { label: 'MD5', value: 'md5' },
  { label: 'AES', value: 'aes' }
]

const result = computed(() => {
  if (!inputText.value) return ''
  
  try {
    if (operationType.value === 'encrypt') {
      switch (currentMethod.value) {
        case 'base64':
          return base64.encode(inputText.value)
        case 'urlSafeBase64':
          return urlSafeBase64.encode(inputText.value)
        case 'md5':
          return md5(inputText.value)
        case 'aes':
          return aes.encrypt(inputText.value, aesKey.value)
        default:
          return ''
      }
    } else {
      if (currentMethod.value === 'md5') {
        return 'MD5是单向加密,无法解密'
      }
      switch (currentMethod.value) {
        case 'base64':
          return base64.decode(inputText.value)
        case 'urlSafeBase64':
          return urlSafeBase64.decode(inputText.value)
        case 'aes':
          return aes.decrypt(inputText.value, aesKey.value)
        default:
          return ''
      }
    }
  } catch (e) {
    return operationType.value === 'encrypt' ? '加密失败' : '解密失败'
  }
})

function showMessage(text: string, type: 'success' | 'error' = 'success') {
  message.value = {
    show: true,
    text,
    type
  }
  setTimeout(() => {
    message.value.show = false
  }, 2000)
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showMessage('复制成功')
  } catch (err) {
    showMessage('复制失败', 'error')
  }
}
</script> 