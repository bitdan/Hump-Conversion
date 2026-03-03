<template>
  <v-app-bar v-if="isMobile" elevation="0" color="white" border>
    <v-app-bar-nav-icon @click="mobileDrawer = !mobileDrawer"/>
  </v-app-bar>

  <v-navigation-drawer
      v-if="!isMobile"
      v-model="desktopDrawer"
      permanent
      :rail="rail"
      :rail-width="72"
      width="280"
      class="side-nav"
  >
    <div class="px-2 pt-2 pb-1 flex justify-end">
      <v-btn
          variant="text"
          :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          @click="rail = !rail"
      />
    </div>

    <div v-if="!rail" class="px-3 pb-2">
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

    <v-list density="compact" nav>
      <v-list-group
          v-for="section in filteredSections"
          :key="section.key"
          v-model="openGroups[section.key]"
          :value="section.key"
      >
        <template #activator="{ props }">
          <v-list-item
              v-bind="props"
              :prepend-icon="section.icon"
              :title="rail ? '' : section.title"
              rounded="lg"
          />
        </template>

        <v-list-item
            v-for="item in section.items"
            :key="item.path"
            :to="item.path"
            :title="item.title"
            :prepend-icon="item.icon"
            rounded="lg"
            class="menu-item"
            :class="{ 'menu-item-active': route.path === item.path }"
        />
      </v-list-group>
    </v-list>

    <template #append>
      <v-divider/>
      <div class="user-footer">
        <v-menu location="top start">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" block class="justify-start">
              <v-icon class="mr-2">mdi-account-circle</v-icon>
              <span v-if="!rail">{{ userStore.token ? (userStore.username || '用户') : '未登录' }}</span>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item
                v-if="!userStore.token"
                prepend-icon="mdi-login"
                title="登录"
                @click="router.push('/auth/login')"
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

  <v-navigation-drawer
      v-else
      v-model="mobileDrawer"
      temporary
      location="left"
      width="280"
      class="side-nav"
  >
    <div class="px-3 pb-2">
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

    <v-list density="compact" nav>
      <v-list-group
          v-for="section in filteredSections"
          :key="section.key"
          v-model="openGroups[section.key]"
      >
        <template #activator="{ props }">
          <v-list-item
              v-bind="props"
              :prepend-icon="section.icon"
              :title="section.title"
              rounded="lg"
          />
        </template>

        <v-list-item
            v-for="item in section.items"
            :key="item.path"
            :to="item.path"
            :title="item.title"
            :prepend-icon="item.icon"
            rounded="lg"
            class="menu-item"
            :class="{ 'menu-item-active': route.path === item.path }"
            @click="mobileDrawer = false"
        />
      </v-list-group>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import {computed, reactive, ref, watch} from 'vue'
import {type RouteRecordRaw, useRoute, useRouter} from 'vue-router'
import {useDisplay} from 'vuetify'
import {useUserStore} from '@/stores/user'
import {useAuth} from '@/composables/useAuth'

interface MenuItem {
  path: string
  title: string
  icon: string
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
const desktopDrawer = ref(true)
const mobileDrawer = ref(false)
const rail = ref(false)
const keyword = ref('')

const openGroups = reactive<Record<string, boolean>>({
  tools: true,
  games: false
})

function extractSection(path: string): string {
  if (path.startsWith('/tools')) return 'tools'
  if (path.startsWith('/games')) return 'games'
  return ''
}

function mapSection(routeRecord: RouteRecordRaw): MenuSection | null {
  if (!routeRecord.children || !routeRecord.meta?.title || !routeRecord.meta?.icon) return null
  const key = routeRecord.path.replace('/', '')
  if (key !== 'tools' && key !== 'games') return null

  const items: MenuItem[] = routeRecord.children
      .filter(child => !!child.path && !!child.meta?.title)
      .map(child => ({
        path: child.path,
        title: child.meta?.title as string,
        icon: (child.meta?.icon as string) || 'mdi-chevron-right'
      }))

  return {
    key,
    title: routeRecord.meta.title as string,
    icon: routeRecord.meta.icon as string,
    items
  }
}

const sections = computed<MenuSection[]>(() =>
    router.options.routes
        .map(mapSection)
        .filter((section): section is MenuSection => !!section)
)

const filteredSections = computed<MenuSection[]>(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return sections.value

  return sections.value
      .map(section => ({
        ...section,
        items: section.items.filter(item => item.title.toLowerCase().includes(q))
      }))
      .filter(section => section.items.length > 0)
})

watch(
    () => route.path,
    (path) => {
      const activeSection = extractSection(path)
      if (activeSection) {
        openGroups[activeSection] = true
      }
    },
    {immediate: true}
)

async function handleLogout() {
  try {
    await logout()
  } catch (error) {
    console.error('登出失败:', error)
  }
}
</script>

<style scoped>
.side-nav {
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.menu-item {
  margin: 2px 0;
}

.menu-item-active {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  font-weight: 600;
}

.user-footer {
  padding: 8px;
}
</style>
