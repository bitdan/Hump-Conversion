<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center py-8 px-4">
    <div class="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-8">
      <div class="text-center mb-8">
        <h1 class="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          文字转二维码
        </h1>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-1">
          <div class="bg-gray-50 rounded-xl p-6 space-y-6">
            <div class="space-y-4">
              <label for="qr-text" class="block text-lg font-medium text-gray-700">输入内容</label>
              <textarea
                id="qr-text"
                v-model="text"
                rows="5"
                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
                placeholder="请输入要生成二维码的内容"
              />
            </div>
          </div>
          <div class="flex flex-col gap-4 mt-6">
            <button
              @click="handleGenerate"
              class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-medium text-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              生成二维码
            </button>
            <button
              v-if="qrValue"
              @click="downloadQrCode"
              class="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl font-medium text-lg hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              下载二维码
            </button>
          </div>
        </div>
        <div class="lg:col-span-2">
          <div class="bg-gray-50 rounded-xl p-8 h-full flex flex-col items-center justify-center shadow-lg">
            <h2 class="text-xl font-semibold text-gray-800 mb-6">二维码预览</h2>
            <div v-if="qrValue" class="flex flex-col items-center space-y-6">
              <div class="relative flex flex-col items-center">
                <VueQrcode
                  ref="qrcodeRef"
                  :value="qrValue"
                  :size="240"
                  level="M"
                  class="shadow-lg rounded-lg bg-white p-4"
                />
              </div>
              <p class="text-gray-500 break-all max-w-full text-center">{{ qrValue }}</p>
            </div>
            <div v-else class="h-[calc(100%-3rem)] flex items-center justify-center text-gray-500 text-lg">
              请输入内容并点击生成二维码
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
// @ts-ignore
import VueQrcode from '@chenfengyuan/vue-qrcode'

const text = ref('')
const qrValue = ref('')
const qrcodeRef = ref<any>(null)

function handleGenerate() {
  qrValue.value = text.value.trim()
}

function downloadQrCode() {
  if (!qrcodeRef.value) return
  // 获取canvas元素
  const canvas = qrcodeRef.value.$el?.querySelector('canvas') || qrcodeRef.value.$el
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) return
  const dataUrl = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = 'qrcode.png'
  link.click()
}
</script>