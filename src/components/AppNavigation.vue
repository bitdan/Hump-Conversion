<template>
  <v-app-bar v-if="isMobile" elevation="0" color="white" border>
    <v-app-bar-nav-icon @click="drawer = !drawer"/>
  </v-app-bar>

  <v-navigation-drawer
      v-model="drawer"
      :temporary="isMobile"
      :permanent="!isMobile"
      :rail="!isMobile && rail"
      :rail-width="72"
      location="left"
      width="280"
      class="side-nav"
  >
    <div class="nav-header" v-if="!isMobile">
      <div v-if="!rail" class="brand-mark">
        <v-icon icon="mdi-tools"/>
        <span>Tool Hub</span>
      </div>
      <v-tooltip location="right" :text="rail ? '展开导航' : '收起导航'">
        <template #activator="{ props }">
          <v-btn
              v-bind="props"
              variant="text"
              :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
              @click="rail = !rail"
          />
        </template>
      </v-tooltip>
    </div>

    <div class="px-3 pb-2" v-if="!rail || isMobile">
      <v-text-field
          v-model="keyword"
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
          placeholder="搜索菜单..."
      />
    </div>

    <v-divider class="my-2"/>

    <v-list density="compact" nav class="nav-list">
      <v-list-group
          v-for="section in filteredSections"
          :key="section.key"
          v-model="openGroups[section.key]"
      >
        <template #activator="{ props }">
          <v-tooltip location="right" :text="section.title" :disabled="!rail || isMobile">
            <template #activator="{ props: tooltipProps }">
              <v-list-item
                  v-bind="{ ...props, ...tooltipProps }"
                  :prepend-icon="section.icon"
                  :title="!isMobile && rail ? '' : section.title"
                  rounded="lg"
              />
            </template>
          </v-tooltip>
        </template>

        <v-tooltip
            v-for="item in section.items"
            :key="item.path"
            location="right"
            :text="item.title"
            :disabled="!rail || isMobile"
        >
          <template #activator="{ props }">
            <v-list-item
                v-bind="props"
                :to="item.path"
                :title="!isMobile && rail ? '' : item.title"
                :prepend-icon="item.icon"
                rounded="lg"
                class="menu-item"
                :class="{ 'menu-item-active': isMenuItemActive(item) }"
                @click="handleMenuClick"
            />
          </template>
        </v-tooltip>
      </v-list-group>

      <v-empty-state
          v-if="!rail && filteredSections.length === 0"
          class="nav-empty"
          icon="mdi-magnify-close"
          title="没有匹配的菜单"
          text="换个关键词试试"
      />
    </v-list>

    <template #append>
      <v-divider/>
      <div class="user-footer">
        <v-menu location="top start">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" block class="justify-start">
              <v-icon class="mr-2">{{ userStore.token ? 'mdi-account-circle' : 'mdi-login' }}</v-icon>
              <span v-if="!rail || isMobile">{{ userStore.token ? (userStore.username || '用户') : '登录' }}</span>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item
                v-if="userStore.token"
                prepend-icon="mdi-account-cog-outline"
                title="个人中心"
                @click="navigateTo('/tools/profile-center')"
            />
            <v-list-item
                v-if="isAdmin"
                prepend-icon="mdi-account-group-outline"
                title="用户管理"
                @click="navigateTo('/tools/admin-users')"
            />
            <v-list-item
                v-if="!userStore.token"
                prepend-icon="mdi-login"
                title="登录"
                @click="navigateTo('/auth/login')"
            />
            <v-list-item
                v-if="userStore.token"
                prepend-icon="mdi-logout"
                title="退出登录"
                @click="handleLogout"
            />
          </v-list>
        </v-menu>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import {computed, reactive, ref, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useDisplay} from 'vuetify'
import {useUserStore} from '@/stores/user'
import {useAuth} from '@/composables/useAuth'

interface MenuItem {
  path: string
  title: string
  icon: string
  keywords: string[]
}

interface MenuSection {
  key: string
  title: string
  icon: string
  items: MenuItem[]
}

const router = useRouter()
const route = useRoute()
const {logout} = useAuth()
const userStore = useUserStore()
const {mdAndDown} = useDisplay()

const isMobile = computed(() => mdAndDown.value)
const drawer = ref(true)
const rail = ref(false)
const keyword = ref('')
const isAdmin = computed(() => userStore.roles.includes('admin') || userStore.permissions.includes('*'))

const openGroups = reactive<Record<string, boolean>>({
  tools: true,
  market: false,
  community: false,
  games: false
})

const sections = computed<MenuSection[]>(() => {
  const groupRoutes = router.options.routes.filter(item => item.path === '/tools' || item.path === '/market' || item.path === '/community' || item.path === '/games')
  return groupRoutes
      .sort((left, right) => Number(left.meta?.groupOrder || 99) - Number(right.meta?.groupOrder || 99))
      .map(routeRecord => {
    const key = routeRecord.path.replace('/', '')
    const children = routeRecord.children || []
    return {
      key,
      title: String(routeRecord.meta?.title || key),
      icon: String(routeRecord.meta?.icon || 'mdi-view-grid'),
      items: children
          .filter(child => !!child.path && !!child.meta?.title && !child.meta?.hiddenInNav)
          .map(child => ({
            path: child.path,
            title: String(child.meta?.title || child.name || child.path),
            icon: String(child.meta?.icon || 'mdi-chevron-right'),
            keywords: Array.isArray(child.meta?.keywords) ? child.meta.keywords.map(String) : []
          }))
    }
  })
})

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

function isSubsequenceMatch(query: string, target: string) {
  if (!query) return true

  let queryIndex = 0
  for (const char of target) {
    if (char === query[queryIndex]) {
      queryIndex += 1
      if (queryIndex === query.length) {
        return true
      }
    }
  }

  return false
}

function matchesMenuItem(query: string, item: MenuItem) {
  const normalizedText = normalizeSearchText([item.title, ...item.keywords].join(' '))
  return normalizedText.includes(query) || isSubsequenceMatch(query, normalizedText)
}

const filteredSections = computed<MenuSection[]>(() => {
  const q = normalizeSearchText(keyword.value)
  if (!q) return sections.value
  return sections.value
      .map(section => ({
        ...section,
        items: section.items.filter(item => matchesMenuItem(q, item))
      }))
      .filter(section => section.items.length > 0)
})

function isMenuItemActive(item: MenuItem) {
  return route.path === item.path || route.path.startsWith(`${item.path}/`)
}

watch(
    () => route.path,
    (path) => {
      if (path.startsWith('/tools')) openGroups.tools = true
      if (path.startsWith('/market')) openGroups.market = true
      if (path.startsWith('/community')) openGroups.community = true
      if (path.startsWith('/games')) openGroups.games = true
      if (isMobile.value) drawer.value = false
    },
    {immediate: true}
)

watch(isMobile, (mobile) => {
  drawer.value = !mobile
})

function handleMenuClick() {
  if (isMobile.value) drawer.value = false
}

function navigateTo(path: string) {
  router.push(path)
  if (isMobile.value) drawer.value = false
}

async function handleLogout() {
  try {
    await logout()
    if (isMobile.value) drawer.value = false
  } catch (error) {
    console.error('登出失败:', error)
  }
}
</script>

<style scoped>
.side-nav {
  border-right: 1px solid var(--color-border);
  background: linear-gradient(180deg, var(--color-surface) 0%, var(--color-bg) 100%);
}

.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 8px 8px 4px 14px;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #0f172a;
  font-weight: 800;
}

.side-nav :deep(.v-navigation-drawer__content) {
  overflow-y: auto;
  overscroll-behavior: contain;
}

.nav-list {
  padding-bottom: 8px;
}

.menu-item {
  margin: 2px 0;
}

.menu-item-active {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  font-weight: 600;
}

.nav-empty {
  margin: 14px 8px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}

.user-footer {
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
  background: rgba(248, 250, 252, 0.96);
}
</style>
