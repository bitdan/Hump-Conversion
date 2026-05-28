<template>
  <ToolPageLayout max-width="max-w-4xl">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-1">
          <div class="bg-gray-50 rounded-xl p-6 space-y-6">
            <div class="space-y-4">
              <label for="length" class="block text-lg font-medium text-gray-700">字符串长度</label>
              <div class="flex items-center">
                <input
                  type="number"
                  v-model="length"
                  id="length"
                  min="1"
                  class="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <span class="ml-3 text-gray-500">字符</span>
              </div>
            </div>
            
            <div class="space-y-4">
              <label for="count" class="block text-lg font-medium text-gray-700">生成数量</label>
              <div class="flex items-center">
                <input
                  type="number"
                  v-model="count"
                  id="count"
                  min="1"
                  class="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <span class="ml-3 text-gray-500">条</span>
              </div>
            </div>
          </div>

          <div class="mt-6 bg-gray-50 rounded-xl p-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">字符类型选择</h2>
            <div class="space-y-3">
              <label class="flex items-center p-3 bg-white rounded-lg shadow-sm hover:bg-blue-50 transition cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="includeNumbers" 
                  id="numbers" 
                  class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span class="ml-3 text-gray-700">数字（0-9）</span>
              </label>
              <label class="flex items-center p-3 bg-white rounded-lg shadow-sm hover:bg-blue-50 transition cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="includeLowercase" 
                  id="lowercase" 
                  class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span class="ml-3 text-gray-700">小写字母（a-z）</span>
              </label>
              <label class="flex items-center p-3 bg-white rounded-lg shadow-sm hover:bg-blue-50 transition cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="includeUppercase" 
                  id="uppercase" 
                  class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span class="ml-3 text-gray-700">大写字母（A-Z）</span>
              </label>
              <label class="flex items-center p-3 bg-white rounded-lg shadow-sm hover:bg-blue-50 transition cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="includeSpecial" 
                  id="special" 
                  class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span class="ml-3 text-gray-700">特别字符（！@＃$％^＆*-_=+）</span>
              </label>
            </div>
          </div>

          <button 
            @click="generateString" 
            class="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-medium text-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            生成字符串
          </button>
        </div>

        <div class="lg:col-span-2">
          <div class="bg-gray-50 rounded-xl p-6 h-full">
            <h2 class="text-xl font-semibold text-gray-800 mb-6">生成结果</h2>
            <div v-if="generatedStrings.length" class="grid gap-4">
              <div v-for="(str, index) in generatedStrings" :key="index" class="bg-white p-5 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between">
                  <p class="font-mono text-lg text-blue-600 select-all break-all flex-1 mr-4">{{ str }}</p>
                  <button 
                    @click="copyString(str)"
                    class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="复制"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="h-[calc(100%-3rem)] flex items-center justify-center text-gray-500 text-lg">
              点击左侧按钮生成字符串
            </div>
          </div>
        </div>
      </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'

const length = ref(10)
const count = ref(5)
const generatedStrings = ref<string[]>([])
const includeNumbers = ref(true)
const includeLowercase = ref(true)
const includeUppercase = ref(true)
const includeSpecial = ref(true)

const generateString = () => {
  let characters = ''
  if (includeNumbers.value) characters += '0123456789'
  if (includeLowercase.value) characters += 'abcdefghijklmnopqrstuvwxyz'
  if (includeUppercase.value) characters += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (includeSpecial.value) characters += '！@＃$％^＆*-_=+'

  if (!characters) {
    alert('请选择至少一个字符集')
    return
  }

  generatedStrings.value = []
  for (let j = 0; j < count.value; j++) {
    let result = ''
    for (let i = 0; i < length.value; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length)
      result += characters[randomIndex]
    }
    generatedStrings.value.push(result)
  }
}

const copyString = async (str: string) => {
  try {
    await navigator.clipboard.writeText(str)
  } catch (err) {
    // 降级方案：使用传统的复制方法
    const textArea = document.createElement('textarea')
    textArea.value = str
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
    } catch (fallbackErr) {
      alert('复制失败，请手动选择复制')
    }
    document.body.removeChild(textArea)
  }
}
</script>
