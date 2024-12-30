<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
    <div class="container mx-auto px-4 py-16">
      <!-- Hero Section -->
      <div class="text-center mb-16 animate-fade-in">
        <h1 class="text-6xl font-bold text-white mb-6 animate-title">
          Welcome to <span class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">DevTools</span>
        </h1>
        <p class="text-xl text-white/90 mb-8 animate-subtitle">
          Your Ultimate Developer's Toolkit for Everyday Tasks
        </p>
        <router-link
            to="/case-converter"
            class="inline-block px-8 py-4 bg-white text-purple-600 rounded-full font-semibold
                 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
        >
          Get Started →
        </router-link>
      </div>

      <!-- Features Grid -->
      <div class="grid md:grid-cols-3 gap-8 animate-fade-in-up">
        <div v-for="(feature, index) in features"
             :key="index"
             class="bg-white/10 backdrop-blur-lg rounded-xl p-6 transform hover:scale-105 transition-all duration-300"
        >
          <div class="text-3xl mb-4">{{ feature.icon }}</div>
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
    title: 'Fast & Efficient',
    description: 'Transform your text instantly with lightning-fast processing speeds'
  },
  {
    icon: '🎨',
    title: 'Modern Design',
    description: 'Clean and intuitive interface for the best user experience'
  },
  {
    icon: '🛠️',
    title: 'Powerful Tools',
    description: 'Complete suite of developer tools at your fingertips'
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
