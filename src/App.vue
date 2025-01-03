<template>
  <v-app>
    <app-navigation />
    <v-main class="bg-gray-100">
      <v-container>
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm p-6 border border-gray-200">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import AppNavigation from '@/components/AppNavigation.vue'
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.v-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
}

.v-main {
  padding-top: 1rem !important;
}
</style>
