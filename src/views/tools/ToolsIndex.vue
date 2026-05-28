<template>
  <ToolPageLayout max-width="max-w-6xl">
    <div class="tools-grid">
      <v-card
          v-for="tool in visibleTools"
          :key="tool.path"
          class="tool-card"
          elevation="0"
          hover
          @click="router.push(tool.path)"
      >
        <div class="tool-card__icon">
          <v-icon :icon="tool.icon" size="28"/>
        </div>
        <div>
          <h2>{{ tool.title }}</h2>
          <p>{{ tool.description }}</p>
        </div>
      </v-card>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {useRouter} from 'vue-router'
import ToolPageLayout from '@/components/ToolPageLayout.vue'
import {routes} from '@/router'

const router = useRouter()

const visibleTools = computed(() => {
  const toolRoot = routes.find(route => route.path === '/tools')
  return (toolRoot?.children || [])
      .filter(route => route.component && !route.redirect && !route.meta?.hiddenInNav)
      .map(route => ({
        path: route.path,
        title: String(route.meta?.title || route.name || '工具'),
        description: String(route.meta?.description || ''),
        icon: String(route.meta?.icon || 'mdi-tools')
      }))
})
</script>

<style scoped>
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.tool-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 14px;
  min-height: 132px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  cursor: pointer;
}

.tool-card__icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
}

.tool-card h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.05rem;
  font-weight: 750;
}

.tool-card p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 0.9rem;
  line-height: 1.55;
}
</style>
