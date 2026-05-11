<template>
  <v-app>
    <component :is="NavigationComponent"/>

    <v-main :class="mainClasses">
      <v-container fluid :class="contentClasses">
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
import {computed} from 'vue'
import {useRoute} from 'vue-router'
import AppNavigation from '@/components/AppNavigation.vue'
import GlobalChatWidget from '@/components/global/GlobalChatWidget.vue'

const NavigationComponent = AppNavigation
const route = useRoute()

const routeArea = computed(() => {
  if (route.path === '/') return 'home'
  if (route.path.startsWith('/auth')) return 'auth'
  if (route.path.startsWith('/games')) return 'games'
  if (route.path.startsWith('/community')) return 'community'
  return 'workspace'
})

const mainClasses = computed(() => [
  'app-main',
  `app-main--${routeArea.value}`
])

const contentClasses = computed(() => [
  'app-content',
  `app-content--${routeArea.value}`
])
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
  min-height: 100vh;
  background: #f8fafc;
}

.app-main--home {
  background: #030712;
}

.app-main--auth {
  background: #eef2ff;
}

.app-main--games {
  background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 34%),
  #f8fafc;
}

.app-main--community {
  background: #f8fafc;
}

.app-content {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 16px;
}

.app-content--home,
.app-content--auth {
  max-width: none;
  padding: 0;
}

.app-content--workspace {
  padding: 20px;
}

.app-content--games {
  max-width: 1280px;
  padding: 20px;
}

.app-content--community {
  max-width: 1180px;
  padding: 20px;
}

@media (max-width: 960px) {
  .app-content {
    padding: 12px;
  }

  .app-content--home,
  .app-content--auth {
    padding: 0;
  }
}

</style>
