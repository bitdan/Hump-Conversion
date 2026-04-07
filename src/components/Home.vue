<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-900 rounded-md">
    <div class="container mx-auto px-4 py-16">
      <!-- Hero Section -->
      <div class="text-center mb-16 animate-fade-in">
        <h1 class="text-5xl md:text-6xl font-bold text-white mb-6 animate-title">
          Tool Hub
          <span class="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">
            在线开发者工具箱与小游戏集合
          </span>
        </h1>
        <p class="text-xl text-white/90 mb-4 animate-subtitle">
          提供在线驼峰转换、JSON 编辑器、文件 Diff、二维码生成、时间戳转换、AI 工作台和网页小游戏。
        </p>
        <p class="max-w-3xl mx-auto text-base md:text-lg text-cyan-50/80 mb-8">
          面向开发者、测试、运维和日常办公场景，打开即用，不依赖本地安装。
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <router-link
              to="/tools/case-converter"
              class="inline-block px-8 py-4 bg-white text-slate-900 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            进入在线工具
          </router-link>
          <router-link
              to="/games/gomoku"
              class="inline-block px-8 py-4 bg-cyan-400/20 text-white border border-cyan-200/30 rounded-2xl font-semibold hover:bg-cyan-300/30 transition-all duration-300"
          >
            查看小游戏
          </router-link>
        </div>
      </div>

      <!-- Features Grid -->
      <div class="grid md:grid-cols-3 gap-8 animate-fade-in-up mb-12">
        <div v-for="(feature, index) in features"
             :key="index"
             class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 transform hover:scale-105 transition-all duration-300
                    border border-white/20 shadow-xl hover:shadow-2xl"
        >
          <div class="text-4xl mb-4 bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center">
            {{ feature.icon }}
          </div>
          <h3 class="text-xl font-semibold text-white mb-2">{{ feature.title }}</h3>
          <p class="text-white/80">{{ feature.description }}</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-8">
        <section class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/15">
          <h2 class="text-2xl font-semibold text-white mb-4">热门工具</h2>
          <ul class="space-y-3 text-cyan-50/90">
            <li>
              <router-link to="/tools/case-converter" class="hover:text-white">在线驼峰转换工具</router-link>
            </li>
            <li>
              <router-link to="/tools/json-editor" class="hover:text-white">在线 JSON 编辑器</router-link>
            </li>
            <li>
              <router-link to="/tools/file-diff" class="hover:text-white">文件 Diff 对比工具</router-link>
            </li>
            <li>
              <router-link to="/tools/timestamp" class="hover:text-white">时间戳转换工具</router-link>
            </li>
            <li>
              <router-link to="/tools/qr-code-generator" class="hover:text-white">文字转二维码工具</router-link>
            </li>
            <li>
              <router-link to="/tools/two-factor-manager" class="hover:text-white">2FA 管理台</router-link>
            </li>
          </ul>
        </section>
        <section class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/15">
          <h2 class="text-2xl font-semibold text-white mb-4">网站说明</h2>
          <p class="text-cyan-50/85 leading-7">
            Tool Hub 是一个聚合型在线工具站，覆盖文本处理、文件处理、编码转换、AI 工作台与休闲小游戏。
            如果你在寻找“在线驼峰转换”“JSON 编辑器”“文件对比”“时间戳工具”等页面，这里都可以直接使用。
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref} from 'vue'

const features = ref([
  {
    icon: '⚡',
    title: '快速高效',
    description: '打开网页即可使用，无需安装，适合日常开发与办公处理'
  },
  {
    icon: '🧰',
    title: '工具齐全',
    description: '覆盖驼峰转换、JSON 编辑、文件 Diff、二维码、时间戳等高频需求'
  },
  {
    icon: '🎮',
    title: '工具 + 游戏',
    description: '除了在线工具，还提供五子棋、数独、扫雷等网页小游戏'
  }
])
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 1s ease-out;
}

.animate-fade-in-up {
  animation: fadeInUp 1s ease-out;
}

.animate-title {
  animation: slideIn 1s ease-out;
}

.animate-subtitle {
  animation: slideIn 1s ease-out 0.2s backwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
