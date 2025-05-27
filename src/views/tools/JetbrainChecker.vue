<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh]">
    <v-progress-circular indeterminate color="primary" class="mb-4" />
    <p class="text-lg text-gray-700">已在新标签页打开 Jetbrain 激活工具页面…<br />如未自动打开，<a href="https://3.jetbra.in/" target="_blank" class="text-blue-600 underline">请点击这里</a>。</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(function () {
  window.open('https://3.jetbra.in/', '_blank')
})
</script> 