<template>
  <div :class="pageClasses">
    <transition name="tool-page-fade" appear>
      <div :class="['tool-page-layout__inner', maxWidthClass]">
        <header v-if="!hideHeader" class="tool-page-layout__header">
          <div class="tool-page-layout__icon">
            <v-icon :icon="icon" size="28"/>
          </div>
          <div class="tool-page-layout__title-block">
            <h1>{{ title }}</h1>
            <p v-if="description">{{ description }}</p>
          </div>
        </header>

        <v-card v-if="card" class="tool-page-layout__card" elevation="0">
          <slot/>
        </v-card>
        <div v-else class="tool-page-layout__content">
          <slot/>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import {useRoute} from 'vue-router'

const props = withDefaults(defineProps<{
  theme?: 'default' | 'dark' | 'none'
  maxWidth?: string
  card?: boolean
  hideHeader?: boolean
  density?: 'default' | 'workspace'
}>(), {
  theme: 'default',
  maxWidth: 'max-w-5xl',
  card: true,
  hideHeader: false,
  density: 'default'
})

const route = useRoute()

const title = computed(() => typeof route.meta.title === 'string' ? route.meta.title : '工具')
const icon = computed(() => typeof route.meta.icon === 'string' ? route.meta.icon : 'mdi-tools')
const description = computed(() => typeof route.meta.description === 'string' ? route.meta.description : '')
const maxWidthClass = computed(() => props.maxWidth)

const pageClasses = computed(() => [
  'tool-page-layout',
  `tool-page-layout--${props.theme}`,
  `tool-page-layout--${props.density}`
])
</script>

<style scoped>
.tool-page-layout {
  min-height: calc(100vh - 40px);
  margin: -20px;
  padding: 28px 20px 40px;
}

.tool-page-layout--workspace {
  padding: 16px;
}

.tool-page-layout--default {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.14), transparent 32%),
    linear-gradient(135deg, #eff6ff 0%, #eef2ff 46%, var(--color-bg) 100%);
}

.tool-page-layout--dark {
  background:
    radial-gradient(circle at top right, rgba(34, 211, 238, 0.12), transparent 30%),
    linear-gradient(135deg, #020617 0%, #0f172a 52%, #111827 100%);
}

.tool-page-layout--none {
  background: var(--color-bg);
}

.tool-page-layout__inner {
  width: 100%;
  margin: 0 auto;
}

.tool-page-layout__header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.tool-page-layout__icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: var(--radius-element);
  background: rgba(255, 255, 255, 0.78);
  color: var(--color-primary);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(12px);
}

.tool-page-layout__title-block {
  min-width: 0;
}

.tool-page-layout__title-block h1 {
  margin: 0;
  color: var(--color-text);
  font-size: clamp(1.55rem, 3vw, 2.15rem);
  font-weight: 800;
  line-height: 1.16;
}

.tool-page-layout__title-block p {
  margin: 6px 0 0;
  color: var(--color-text-muted);
  font-size: 0.95rem;
  line-height: 1.55;
}

.tool-page-layout__card {
  padding: 28px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: var(--radius-card);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(14px);
}

.tool-page-layout--dark .tool-page-layout__icon {
  background: rgba(15, 23, 42, 0.86);
  color: #67e8f9;
}

.tool-page-layout--dark .tool-page-layout__title-block h1 {
  color: #f8fafc;
}

.tool-page-layout--dark .tool-page-layout__title-block p {
  color: #cbd5e1;
}

.tool-page-layout--dark .tool-page-layout__card {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.72);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
}

.tool-page-fade-enter-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.tool-page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 960px) {
  .tool-page-layout {
    min-height: calc(100vh - 24px);
    margin: -12px;
    padding: 20px 12px 32px;
  }

  .tool-page-layout--workspace {
    padding: 12px;
  }

  .tool-page-layout__header {
    align-items: flex-start;
  }

  .tool-page-layout__card {
    padding: 18px;
  }
}
</style>
