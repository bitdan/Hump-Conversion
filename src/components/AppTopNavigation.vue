<template>
  <div class="top-nav-wrapper">
    <v-app-bar
      class="px-2 bg-white/80 backdrop-blur-sm border-b transition-all duration-300"
      elevation="0"
      height="64"
      fixed
    >
      <v-app-bar-title class="font-semibold text-gray-800 select-none">
        开发者工具
      </v-app-bar-title>

      <!-- 主导航菜单 -->
      <v-tabs
        v-model="activeTab"
        class="ml-4 hidden md:flex"
        density="comfortable"
        color="primary"
        @update:modelValue="handleTabChange"
      >
        <template v-for="item in mainRoutes" :key="item.name">
          <v-tab
            :value="item.name"
            :to="item.children ? undefined : item.path"
            class="px-4 transition-colors duration-200"
            v-ripple
          >
            <v-icon
              :icon="item.meta?.icon"
              size="small"
              class="mr-2"
            ></v-icon>
            {{ item.meta?.title }}
            <v-icon
              v-if="item.children"
              icon="mdi-chevron-down"
              size="small"
              class="ml-1 transition-transform"
              :class="{ 'rotate-180': showSubmenu && activeTab === item.name }"
            ></v-icon>
          </v-tab>
        </template>
      </v-tabs>

      <v-menu
        v-model="showSubmenu"
        :activator="submenuActivator"
        location="bottom"
        :close-on-content-click="true"
        transition="scale-transition"
        offset="5"
      >
        <v-list class="bg-white rounded-lg py-2 shadow-lg" density="compact">
          <v-list-item
            v-for="child in currentSubmenuItems"
            :key="child.name"
            :to="child.path"
            :prepend-icon="child.meta?.icon"
            :title="child.meta?.title"
            class="px-4 hover:bg-gray-50 transition-colors duration-200"
            @click="handleSubMenuClick"
          ></v-list-item>
        </v-list>
      </v-menu>

      <v-spacer></v-spacer>

      <!-- 导航模式切换 -->
      <v-btn
        variant="text"
        :prepend-icon="'mdi-view-grid'"
        class="hidden md:flex"
        @click="toggleNavMode"
      >
        切换为{{ navMode === 'side' ? '顶部' : '侧边' }}导航
      </v-btn>

      <!-- 用户菜单 -->
      <v-menu location="bottom end" transition="scale-transition">
        <template v-slot:activator="{ props }">
          <v-btn
            v-bind="props"
            variant="text"
            :prepend-icon="'mdi-account-circle'"
            class="ml-2"
          >
            {{ userStore.username }}
          </v-btn>
        </template>
        <v-list class="bg-white rounded-lg py-2 shadow-lg" density="compact">
          <v-list-item
            prepend-icon="mdi-logout"
            title="退出登录"
            @click="handleLogout"
            class="px-4 hover:bg-gray-50 transition-colors duration-200"
          ></v-list-item>
        </v-list>
      </v-menu>

      <!-- 移动端菜单按钮 -->
      <v-app-bar-nav-icon
        class="md:hidden"
        @click="toggleDrawer"
      ></v-app-bar-nav-icon>
    </v-app-bar>

    <!-- 移动端抽屉菜单 -->
    <v-navigation-drawer
      v-model="drawer"
      location="left"
      temporary
      class="md:hidden"
    >
      <v-list class="py-2">
        <template v-for="item in mainRoutes" :key="item.name">
          <v-list-item
            v-if="!item.children"
            :to="item.path"
            :prepend-icon="item.meta?.icon"
            :title="item.meta?.title"
            class="mb-1 transition-colors duration-200"
            v-ripple
          ></v-list-item>

          <v-list-group
            v-else
            :value="isGroupActive(item)"
            class="mb-1"
          >
            <template v-slot:activator="{ props }">
              <v-list-item
                v-bind="props"
                :prepend-icon="item.meta?.icon"
                :title="item.meta?.title"
                class="transition-colors duration-200"
                v-ripple
              ></v-list-item>
            </template>

            <v-list-item
              v-for="child in item.children"
              :key="child.name"
              :to="child.path"
              :prepend-icon="child.meta?.icon"
              :title="child.meta?.title"
              class="pl-4 transition-colors duration-200"
              v-ripple
            ></v-list-item>
          </v-list-group>
        </template>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<script setup lang="ts">
import type {ComponentPublicInstance} from 'vue'
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useStorage} from '@vueuse/core'
import {useNavStore} from '@/stores/nav'
import {useUserStore} from '@/stores/user'
import {useAuth} from '@/composables/useAuth'

interface RouteItem {
  name: string;
  path: string;
  meta?: {
    title: string;
    icon: string;
  };
  children?: RouteItem[];
  component?: any;
}

type VuetifyActivator = Element | ComponentPublicInstance | string | "parent";

// 组合式函数：路由相关逻辑
function useNavigation() {
  const router = useRouter()
  const route = useRoute()

  const mainRoutes = computed<RouteItem[]>(() =>
    router.options.routes.filter(route => route.name && route.path !== '/') as RouteItem[]
  )

  const isCurrentRoute = (path: string): boolean => route.path === path

  const isGroupActive = (item: RouteItem): boolean =>
    item.children?.some(child => isCurrentRoute(child.path)) || false

  return {
    mainRoutes,
    isCurrentRoute,
    isGroupActive
  }
}

// 组件状态
const drawer = ref(false)
const activeTab = ref<string | null>(null)
const showSubmenu = ref(false)
const submenuActivator = ref<VuetifyActivator>("parent")
const currentSubmenuItems = ref<RouteItem[]>([])
const navMode = useStorage('nav-mode', 'top')

// 获取路由相关方法
const { mainRoutes, isCurrentRoute, isGroupActive } = useNavigation()
const route = useRoute()
const navStore = useNavStore()
const userStore = useUserStore()
const { logout } = useAuth()

// 处理标签页变化
const handleTabChange = (newValue: unknown) => {
  if (typeof newValue !== 'string') return

  const selectedItem = mainRoutes.value.find(item => item.name === newValue)
  if (selectedItem?.children) {
    currentSubmenuItems.value = selectedItem.children
    showSubmenu.value = true
    nextTick(() => {
      const element = document.querySelector(`[value="${newValue}"]`)
      if (element) {
        submenuActivator.value = element
      }
    })
  } else {
    showSubmenu.value = false
  }
}

const handleSubMenuClick = () => {
  showSubmenu.value = false
  drawer.value = false
}

const toggleDrawer = () => {
  drawer.value = !drawer.value
}

const toggleNavMode = () => {
  navStore.toggleMode()
  navMode.value = navMode.value === 'top' ? 'side' : 'top'
}

const handleLogout = async () => {
  try {
    await logout()
  } catch (error) {
    console.error('登出失败:', error)
  }
}

// 生命周期钩子
onMounted(() => {
  const currentMainRoute = mainRoutes.value.find(item =>
    item.path === route.path || item.children?.some(child => child.path === route.path)
  )
  if (currentMainRoute?.name) {
    activeTab.value = currentMainRoute.name
  }
})

// 路由监听
watch(
  () => route.path,
  (newPath) => {
    const currentMainRoute = mainRoutes.value.find(item =>
      item.path === newPath || item.children?.some(child => child.path === newPath)
    )
    if (currentMainRoute?.name) {
      activeTab.value = currentMainRoute.name
    }
  }
)
</script>

<style scoped>
.top-nav-wrapper {
  position: relative;
  z-index: 100;
}

.v-app-bar {
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(79, 70, 229, 0.1);
}

/* 添加过渡动画 */
.scale-transition-enter-active,
.scale-transition-leave-active {
  transition: all 0.3s ease;
}

.scale-transition-enter-from,
.scale-transition-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
