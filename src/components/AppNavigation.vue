<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    @click="rail = false"
    class="bg-gray-50"
    width="260"
    :rail-width="56"
  >
    <v-list-item
      prepend-avatar="https://s2.loli.net/2025/01/03/FcBEJdh1YvOSWpK.jpg"
      :title="rail ? '' : '开发者工具'"
      nav
    >
      <template v-slot:append>
        <div class="d-flex align-center">
          <v-btn
            v-if="!rail"
            variant="text"
            size="small"
            :prepend-icon="'mdi-view-grid'"
            class="mr-2"
            @click="toggleNavMode"
          >
            {{ isTopNav ? '侧边导航' : '顶部导航' }}
          </v-btn>
          <v-btn
            variant="text"
            :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
            @click.stop="rail = !rail"
          ></v-btn>
        </div>
      </template>
    </v-list-item>

    <v-divider></v-divider>

    <v-list density="compact" nav>
      <template v-for="item in unifiedRoutes" :key="item.name">
        <!-- 没有子路由的菜单项 -->
        <v-list-item
          v-if="!item.children"
          :to="item.path"
          :prepend-icon="item.meta?.icon"
          :title="rail ? '' : item.meta?.title"
          :value="item.name"
          class="mb-1"
          :class="{ 'active-route': isCurrentRoute(item.path) }"
        ></v-list-item>

        <!-- 有子路由的菜单组 -->
        <div
          v-else
          class="menu-group"
          @mouseenter="handleGroupHover(item.name)"
          @mouseleave="handleGroupLeave"
        >
          <v-list-item
            v-if="rail"
            :prepend-icon="item.meta?.icon"
            class="parent-icon"
            :class="{ 'active-route': isGroupActive(item) }"
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
                :value="item.name"
                :class="{ 'active-route': isGroupActive(item) }"
              ></v-list-item>
            </template>

            <v-list-item
              v-for="child in item.children"
              :key="child.name"
              :to="child.path"
              :prepend-icon="child.meta?.icon"
              :title="child.meta?.title"
              :value="child.name"
              class="pl-4"
              :class="{ 'active-route': isCurrentRoute(child.path) }"
            ></v-list-item>
          </v-list-group>

          <div 
            v-if="rail" 
            class="submenu-container"
            :class="{ 'show-submenu': hoveredGroup === item.name }"
          >
            <v-list density="compact">
              <v-list-item
                v-for="child in item.children"
                :key="child.name"
                :to="child.path"
                :prepend-icon="child.meta?.icon"
                :title="child.meta?.title"
                :value="child.name"
                :class="{ 'active-route': isCurrentRoute(child.path) }"
              ></v-list-item>
            </v-list>
          </div>
        </div>
      </template>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNavStore } from '@/stores/nav'

const router = useRouter()
const route = useRoute()
const drawer = ref(true)
const rail = ref(false)
const navStore = useNavStore()

// 添加导航模式计算属性和切换方法
const isTopNav = computed(() => navStore.mode === 'top')

// Unified routes for both top and side navigation
const unifiedRoutes = computed(() => 
  router.options.routes.filter(route => route.name && route.path !== '/')
)

const toggleNavMode = () => {
  navStore.toggleMode()
}

const isCurrentRoute = (path) => {
  return route.path === path
}

const isGroupActive = (item) => {
  return item.children?.some(child => isCurrentRoute(child.path))
}

const handleGroupHover = (name) => {
  hoveredGroup.value = name
}

const handleGroupLeave = () => {
  hoveredGroup.value = null
}
</script>

<style scoped>
.v-list-item--active {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important;
  color: white !important;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
  transform: translateX(4px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.active-route {
  background: rgba(79, 70, 229, 0.08);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.v-list-item {
  margin: 4px 8px;
  padding: 0 16px;
  min-height: 44px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-list-item:hover:not(.v-list-item--active) {
  background: rgba(79, 70, 229, 0.05);
  transform: translateX(2px);
}

.v-navigation-drawer {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-right: 1px solid rgba(0, 0, 0, 0.05);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.submenu-container {
  position: absolute;
  left: 100%;
  top: 0;
  min-width: 220px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  opacity: 0;
  visibility: hidden;
  transform: translateX(-10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  padding: 8px;
}

.show-submenu {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
}

.v-list-group__items .v-list-item {
  margin-left: 16px;
  padding-left: 20px;
  border-left: 2px solid rgba(79, 70, 229, 0.1);
}

.v-list-group__items .v-list-item:hover {
  border-left: 2px solid rgba(79, 70, 229, 0.5);
}

.v-list-item__prepend {
  margin-right: 12px;
}

.v-list-group {
  margin: 4px 0;
}

/* Avatar and title section */
.v-list-item:first-child {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%);
  margin-bottom: 8px;
  border: 1px solid rgba(79, 70, 229, 0.1);
}

/* Divider styling */
.v-divider {
  border-color: rgba(79, 70, 229, 0.1);
  margin: 8px 0;
}

/* Icon animations */
.v-list-item__prepend .v-icon {
  transition: transform 0.3s ease;
}

.v-list-item:hover .v-list-item__prepend .v-icon {
  transform: scale(1.1);
}

/* Rail mode specific styles */
.v-navigation-drawer--rail .v-list-item {
  justify-content: center;
  padding: 12px !important;
  margin: 4px;
}

.v-navigation-drawer--rail .v-list-item__prepend {
  margin-inline-end: 0;
}

/* Toggle button animation */
.v-btn--icon {
  transition: transform 0.3s ease;
}

.v-btn--icon:hover {
  transform: scale(1.1);
}

/* Custom scrollbar */
.v-navigation-drawer ::-webkit-scrollbar {
  width: 6px;
}

.v-navigation-drawer ::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.02);
}

.v-navigation-drawer ::-webkit-scrollbar-thumb {
  background: rgba(79, 70, 229, 0.2);
  border-radius: 3px;
}

.v-navigation-drawer ::-webkit-scrollbar-thumb:hover {
  background: rgba(79, 70, 229, 0.3);
}
</style> 