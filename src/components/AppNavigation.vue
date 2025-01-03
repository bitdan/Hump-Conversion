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
  background: #4f46e5 !important;
  color: white !important;
  border-radius: 8px;
}

.active-route {
  background: rgba(79, 70, 229, 0.1);
  border-radius: 8px;
}

.v-list-group__items .v-list-item {
  transition: all 0.2s ease;
  border-radius: 8px;
  margin: 2px 0;
}

.v-list-group__items .v-list-item:hover {
  background: rgba(79, 70, 229, 0.05);
}

.v-navigation-drawer {
  transition: width 0.2s ease;
  border-right: 1px solid rgba(0, 0, 0, 0.05);
}

.v-list-group {
  margin-bottom: 4px;
}

.v-list-item {
  margin: 2px 8px;
  padding: 0 12px;
  min-height: 40px;
}

.v-list-group__items .v-list-item {
  margin-left: 12px;
  margin-right: 12px;
}

/* 添加子菜单容器样式 */
.submenu-container {
  position: relative;
}

/* 收起状态下的子菜单样式 */
.v-navigation-drawer--rail .submenu-container {
  position: absolute;
  left: 100%;
  top: 0;
  min-width: 200px;
  background: white;
  border-radius: 0 8px 8px 0;
  box-shadow: 4px 0 8px rgba(0, 0, 0, 0.1);
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 100;
  padding: 4px;
}

/* 收起状态下显示子菜单 */
.v-navigation-drawer--rail .show-submenu .submenu-container {
  opacity: 1;
  visibility: visible;
}

/* 确保图标在收起状态下完整显示 */
.v-navigation-drawer--rail .v-list-item {
  padding-left: 12px !important;
  padding-right: 12px !important;
  min-width: 56px;
  justify-content: center;
}

.v-navigation-drawer--rail .v-list-item__prepend {
  margin-inline-end: 0;
}

/* 优化子菜单项样式 */
.submenu-item {
  padding: 8px 16px;
  white-space: nowrap;
  width: 100%;
}

/* 展开状态下的子菜单样式 */
.v-navigation-drawer:not(.v-navigation-drawer--rail) .submenu-container {
  position: static;
  width: auto;
  box-shadow: none;
  opacity: 1;
  visibility: visible;
  padding: 0;
}

/* 确保图标在展开状态下对齐 */
.v-list-item__prepend {
  margin-right: 8px;
}

/* 优化菜单组间距 */
.v-list-group {
  margin: 2px 0;
}

/* 确保子菜单项对齐 */
.v-list-group__items .v-list-item {
  padding-left: 16px;
}

/* 修改菜单组样式 */
.menu-group {
  position: relative;
}

/* 收起状态下的父级图标样式 */
.parent-icon {
  cursor: pointer;
  margin: 4px 8px;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

/* 收起状态下的子菜单容器 */
.submenu-container {
  position: absolute;
  left: 100%;
  top: 0;
  min-width: 200px;
  background: white;
  border-radius: 0 8px 8px 0;
  box-shadow: 4px 0 8px rgba(0, 0, 0, 0.1);
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 100;
  padding: 4px;
}

.show-submenu {
  opacity: 1;
  visibility: visible;
}

/* 收起状态下的图标居中显示 */
.v-navigation-drawer--rail .v-list-item {
  padding: 12px !important;
  min-width: 56px;
  justify-content: center;
}

.v-navigation-drawer--rail .v-list-item__prepend {
  margin-inline-end: 0;
}

/* 展开状态下的样式 */
.v-navigation-drawer:not(.v-navigation-drawer--rail) .v-list-item {
  padding: 0 12px;
}

.v-list-group__items .v-list-item {
  padding-left: 16px !important;
}

/* 激活状态样式 */
.active-route {
  background: #4f46e5 !important;
  color: white !important;
}

.v-list-group__items .active-route {
  background: rgba(79, 70, 229, 0.1) !important;
  color: inherit !important;
}

/* 菜单组样式 */
.menu-group {
  position: relative;
}

/* 过渡动画 */
.v-navigation-drawer {
  transition: width 0.2s ease;
}

/* 添加按钮样式 */
.v-btn--size-small {
  font-size: 0.875rem;
}
</style> 