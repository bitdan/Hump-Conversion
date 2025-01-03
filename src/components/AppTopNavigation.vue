<template>
  <div class="top-nav-wrapper">
    <v-app-bar
      class="px-2 bg-white/80 backdrop-blur-sm border-b"
      elevation="0"
      height="64"
      fixed
    >
      <v-app-bar-title class="font-semibold text-gray-800">
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
          <!-- 没有子菜单的项目 -->
          <v-tab
            v-if="!item.children"
            :value="item.name"
            :to="item.path"
            class="px-4"
          >
            <v-icon
              :icon="item.meta?.icon"
              size="small"
              class="mr-2"
            ></v-icon>
            {{ item.meta?.title }}
          </v-tab>

          <!-- 有子菜单的项目 -->
          <v-tab
            v-else
            :value="item.name"
            class="px-4"
          >
            <v-icon
              :icon="item.meta?.icon"
              size="small"
              class="mr-2"
            ></v-icon>
            {{ item.meta?.title }}
            <v-icon
              icon="mdi-chevron-down"
              size="small"
              class="ml-1"
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
        <v-list class="bg-white rounded-lg py-2" density="compact">
          <v-list-item
            v-for="child in currentSubmenuItems"
            :key="child.name"
            :to="child.path"
            :prepend-icon="child.meta?.icon"
            :title="child.meta?.title"
            class="px-4"
            @click="handleSubMenuClick"
          ></v-list-item>
        </v-list>
      </v-menu>

      <v-spacer></v-spacer>

      <!-- 导航模式切换 -->
      <v-btn
        variant="text"
        :prepend-icon="'mdi-view-grid'"
        @click="toggleNavMode"
      >
        切换为侧边导航
      </v-btn>

      <!-- 移动端菜单按钮 -->
      <v-app-bar-nav-icon
        class="md:hidden"
        @click="drawer = !drawer"
      ></v-app-bar-nav-icon>
    </v-app-bar>

    <!-- 移动端抽屉菜单 -->
    <v-navigation-drawer
      v-model="drawer"
      location="left"
      temporary
      class="md:hidden bg-gray-50"
    >
      <v-list>
        <template v-for="item in mainRoutes" :key="item.name">
          <v-list-item
            v-if="!item.children"
            :to="item.path"
            :prepend-icon="item.meta?.icon"
            :title="item.meta?.title"
          ></v-list-item>

          <v-list-group
            v-else
            :value="isGroupActive(item)"
          >
            <template v-slot:activator="{ props }">
              <v-list-item
                v-bind="props"
                :prepend-icon="item.meta?.icon"
                :title="item.meta?.title"
              ></v-list-item>
            </template>

            <v-list-item
              v-for="child in item.children"
              :key="child.name"
              :to="child.path"
              :prepend-icon="child.meta?.icon"
              :title="child.meta?.title"
              class="pl-4"
            ></v-list-item>
          </v-list-group>
        </template>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNavStore } from '@/stores/nav'

const router = useRouter()
const route = useRoute()
const navStore = useNavStore()

const drawer = ref(false)
const activeTab = ref(null)
const showSubmenu = ref(false)
const submenuActivator = ref(null)
const currentSubmenuItems = ref([])

// 计算主路由（一级菜单）
const mainRoutes = computed(() => 
  router.options.routes.filter(route => route.name && route.path !== '/')
)

// 路由判断方法
const isCurrentRoute = (path) => {
  return route.path === path
}

const isGroupActive = (item) => {
  return item.children?.some(child => isCurrentRoute(child.path))
}

// 处理标签页变化
const handleTabChange = (newValue) => {
  const selectedItem = mainRoutes.value.find(item => item.name === newValue)
  if (selectedItem?.children) {
    currentSubmenuItems.value = selectedItem.children
    showSubmenu.value = true
    // 获取当前点击的标签页元素作为子菜单的锚点
    nextTick(() => {
      submenuActivator.value = document.querySelector(`[value="${newValue}"]`)
    })
  } else {
    showSubmenu.value = false
  }
}

// 处理子菜单点击
const handleSubMenuClick = () => {
  showSubmenu.value = false
}

// 设置初始激活的标签
onMounted(() => {
  // 根据当前路由设置激活的标签
  const currentMainRoute = mainRoutes.value.find(item => 
    item.path === route.path || item.children?.some(child => child.path === route.path)
  )
  if (currentMainRoute) {
    activeTab.value = currentMainRoute.name
  }
})

// 监听路由变化
watch(
  () => route.path,
  (newPath) => {
    const currentMainRoute = mainRoutes.value.find(item => 
      item.path === newPath || item.children?.some(child => child.path === newPath)
    )
    if (currentMainRoute) {
      activeTab.value = currentMainRoute.name
    }
  }
)

const toggleDrawer = () => {
  drawer.value = !drawer.value
}

const toggleNavMode = () => {
  navStore.toggleMode()
}
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

:deep(.v-tab) {
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0;
  min-width: unset;
  border-radius: 8px;
  margin: 0 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.v-tab:hover) {
  background: rgba(79, 70, 229, 0.05);
  transform: translateY(-1px);
}

:deep(.v-tab--selected) {
  color: #4f46e5;
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.1);
}

:deep(.v-tab__slider) {
  background: linear-gradient(90deg, #4f46e5, #7c3aed);
  height: 3px;
  border-radius: 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* App bar title */
.v-app-bar-title {
  font-weight: 600;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}

/* Menu styles */
:deep(.v-menu > .v-overlay__content) {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(79, 70, 229, 0.1);
  padding: 8px;
  min-width: 220px;
}

:deep(.v-list-item) {
  border-radius: 8px;
  margin: 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.v-list-item:hover) {
  background: rgba(79, 70, 229, 0.05);
  transform: translateX(4px);
}

:deep(.v-list-item--active) {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%);
  color: #4f46e5;
  font-weight: 500;
}

/* Navigation mode toggle button */
.v-btn {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-btn:hover {
  background: rgba(79, 70, 229, 0.05);
  transform: translateY(-1px);
}

/* Mobile menu button */
.v-app-bar-nav-icon {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.v-app-bar-nav-icon:hover {
  background: rgba(79, 70, 229, 0.05);
  transform: scale(1.1);
}

/* Mobile drawer */
:deep(.v-navigation-drawer) {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

/* Custom scrollbar */
:deep(::-webkit-scrollbar) {
  width: 6px;
}

:deep(::-webkit-scrollbar-track) {
  background: rgba(0, 0, 0, 0.02);
}

:deep(::-webkit-scrollbar-thumb) {
  background: rgba(79, 70, 229, 0.2);
  border-radius: 3px;
}

:deep(::-webkit-scrollbar-thumb:hover) {
  background: rgba(79, 70, 229, 0.3);
}

/* Animations */
.scale-transition-enter-active,
.scale-transition-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.scale-transition-enter-from,
.scale-transition-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

/* Icon animations */
:deep(.v-icon) {
  transition: transform 0.3s ease;
}

:deep(.v-list-item:hover .v-icon) {
  transform: scale(1.1);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .v-btn {
    min-width: unset;
    padding: 0 12px;
  }
  
  :deep(.v-tab) {
    padding: 0 12px;
  }
}
</style> 