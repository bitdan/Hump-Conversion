<template>
  <v-app>
    <component :is="NavigationComponent"/>

    <v-main class="app-main">
      <v-container fluid class="app-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component"/>
          </transition>
        </router-view>
      </v-container>
    </v-main>

    <GlobalChatWidget/>
  </v-app>
</template>

<script setup lang="ts">
import AppNavigation from '@/components/AppNavigation.vue'
import GlobalChatWidget from '@/components/global/GlobalChatWidget.vue'

const NavigationComponent = AppNavigation
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

.app-main {
  background: #f8fafc;
}

.app-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
}

@media (max-width: 960px) {
  .app-content {
    padding: 0.75rem;
  }
}

</style>
