<template>
  <ToolPageLayout>
    <div class="not-found empty-state">
      <v-icon icon="mdi-map-marker-question-outline" size="56" color="primary"/>
      <div>
        <p class="not-found__code">404</p>
        <h2>页面不存在</h2>
        <p>链接可能已失效，或者地址输入有误。</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-home-outline" to="/">
        返回首页
      </v-btn>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import ToolPageLayout from '@/components/ToolPageLayout.vue'
</script>

<style scoped>
.not-found {
  min-height: 360px;
  gap: 20px;
}

.not-found__code {
  margin: 0 0 4px;
  color: var(--color-primary);
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
}

.not-found h2 {
  margin: 0 0 8px;
  color: var(--color-text);
}

.not-found p:not(.not-found__code) {
  margin: 0;
  color: var(--color-text-muted);
}
</style>
