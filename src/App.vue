<template>
  <v-app>
    <!-- 只在非auth布局时显示导航 -->
    <template v-if="!isAuthLayout">
      <component :is="currentNav" />
      <v-main :class="{ 'bg-gray-100': true, 'pt-16': navMode === 'top' }">
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
    </template>

    <!-- auth布局直接显示路由视图 -->
    <template v-else>
      <router-view />
    </template>
  </v-app>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNavigation from '@/components/AppNavigation.vue'
import AppTopNavigation from '@/components/AppTopNavigation.vue'
import { useNavStore } from '@/stores/nav'

const route = useRoute()
const navStore = useNavStore()
const navMode = computed(() => navStore.mode)

// 判断是否是auth布局
const isAuthLayout = computed(() => route.meta.layout === 'auth')

// 根据导航模式计算当前应该显示的导航组件
const currentNav = computed(() => 
  navMode.value === 'side' ? AppNavigation : AppTopNavigation
)
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

/* 顶部导航模式下的内容区域调整 */
.v-main.pt-16 {
  padding-top: 5rem !important;
}
</style>
