<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-md">
    <div class="container mx-auto px-4 py-16">
      <!-- Hero Section -->
      <div class="text-center mb-16 animate-fade-in">
        <h1 class="text-6xl font-bold text-white mb-6 animate-title">
          欢迎来到 <span class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">开发者工具</span>
        </h1>
        <p class="text-xl text-white/90 mb-8 animate-subtitle">
          您的日常任务终极开发者工具包
        </p>
        <router-link
            to="/case-converter"
            class="inline-block px-8 py-4 bg-white text-purple-600 rounded-2xl font-semibold
                 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
        >
          开始使用 →
        </router-link>
      </div>

      <!-- Features Grid -->
      <div class="grid md:grid-cols-3 gap-8 animate-fade-in-up">
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
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const features = ref([
  {
    icon: '⚡',
    title: '快速高效',
    description: '以闪电般的处理速度即时转换您的文本'
  },
  {
    icon: '🎨',
    title: '现代设计',
    description: '为最佳用户体验提供简洁直观的界面'
  },
  {
    icon: '🛠️',
    title: '强大工具',
    description: '触手可及的完整开发者工具套件'
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
