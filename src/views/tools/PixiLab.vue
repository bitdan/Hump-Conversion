<template>
  <ToolPageLayout
    theme="none"
    density="workspace"
    :card="false"
    max-width="max-w-7xl"
  >
    <div class="pixi-lab">
      <section class="lab-switch solid-card" aria-label="PixiJS 实验类型">
        <v-btn-toggle
          v-model="activeLab"
          mandatory
          color="primary"
          density="comfortable"
          rounded="lg"
        >
          <v-btn value="particles" prepend-icon="mdi-creation-outline">粒子</v-btn>
          <v-btn value="shader" prepend-icon="mdi-blur-radial">Shader</v-btn>
        </v-btn-toggle>
      </section>

      <ParticleLabPanel v-if="activeLab === 'particles'" />
      <ShaderLabPanel v-else />
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {useRoute} from 'vue-router'
import ToolPageLayout from '@/components/ToolPageLayout.vue'
import ParticleLabPanel from '@/views/tools/components/ParticleLabPanel.vue'
import ShaderLabPanel from '@/views/tools/components/ShaderLabPanel.vue'

type LabView = 'particles' | 'shader'

const route = useRoute()
const activeLab = ref<LabView>(route.path.includes('gpu-shader') ? 'shader' : 'particles')
</script>

<style scoped>
.pixi-lab {
  display: grid;
  gap: 14px;
}

.lab-switch {
  display: flex;
  justify-content: flex-end;
  padding: 10px 12px;
  border-radius: var(--radius-element);
}

.lab-switch :deep(.v-btn) {
  min-width: 120px;
  text-transform: none;
}

@media (max-width: 600px) {
  .lab-switch :deep(.v-btn-toggle),
  .lab-switch :deep(.v-btn) {
    width: 100%;
  }
}
</style>
