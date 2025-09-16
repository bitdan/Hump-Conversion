<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center py-8 px-4">
    <div class="w-full max-w-6xl bg-white rounded-2xl shadow-xl p-6 md:p-8">
      <div class="text-center mb-6 md:mb-8">
        <h1 class="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Docker Compose 生成器
        </h1>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div class="xl:col-span-2 space-y-6">
          <div class="bg-gray-50 rounded-xl p-5 space-y-4">
            <div class="text-lg font-semibold text-gray-800">项目元信息</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <v-text-field v-model="meta.name" label="项目名称"></v-text-field>
              <v-select :items="['3.8','3']" v-model="meta.version" label="Compose 版本"></v-select>
              <div class="flex gap-2 items-center">
                <v-select class="flex-1" :items="templateOptions" v-model="selectedTemplateId" label="添加服务模板"></v-select>
                <v-btn :disabled="!selectedTemplateId" icon="mdi-plus" color="primary" variant="elevated" @click="handleAddService" :title="'添加'" />
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="flex flex-wrap gap-2 items-center">
              <span class="text-sm text-gray-500">快速筛选：</span>
              <v-chip
                v-for="c in categories" :key="c.value"
                :color="activeCategory === c.value ? 'primary' : undefined"
                variant="outlined"
                @click="activeCategory = activeCategory === c.value ? null : c.value"
              >{{ c.label }}</v-chip>
            </div>

            <v-card class="p-4" v-for="svc in filteredServices" :key="svc.key">
              <div class="flex items-center justify-between">
                <div class="font-semibold flex items-center gap-2">
                  <v-icon :icon="templateMap[svc.templateId]?.icon || 'mdi-cube-outline'" />
                  {{ templateMap[svc.templateId]?.name }}
                  <span class="text-xs text-gray-500">（{{ categoryLabel(templateMap[svc.templateId]?.category as string) }}）</span>
                </div>
                <div class="flex items-center gap-2">
                  <v-text-field hide-details density="compact" class="w-56" v-model="svc.name" label="服务名称"></v-text-field>
                  <v-btn icon="mdi-delete" variant="text" color="error" @click="removeService(svc.key)"></v-btn>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <template v-for="field in templateMap[svc.templateId]?.fields" :key="field.key">
                  <v-text-field
                    v-if="field.type === 'text' || field.type === 'number'"
                    v-model="svc.params[field.key]"
                    :type="field.type === 'number' ? 'number' : 'text'"
                    :label="field.label"
                    :placeholder="field.placeholder"
                  />
                  <v-select
                    v-else-if="field.type === 'select'"
                    :items="field.options?.map(o => ({ title: o.label, value: o.value })) || []"
                    v-model="svc.params[field.key]"
                    :label="field.label"
                  />
                  <v-switch
                    v-else-if="field.type === 'boolean'"
                    v-model="svc.params[field.key]"
                    :label="field.label"
                  />
                </template>
              </div>
            </v-card>
          </div>
        </div>

        <div class="xl:col-span-1 space-y-6">
          <div class="bg-gray-50 rounded-xl p-5">
            <div class="flex items-center justify-between">
              <div class="font-semibold">YAML 预览</div>
              <div class="flex items-center gap-1">
                <v-btn icon="mdi-content-copy" variant="text" @click="copyYaml" :title="'复制'" />
                <v-btn icon="mdi-download" variant="text" @click="downloadYaml()" :title="'下载 DOCKER-COMPOSE.YML'" />
              </div>
            </div>
            <pre class="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-auto max-h-[70vh]">{{ yamlString }}</pre>
          </div>

          <div class="bg-gray-50 rounded-xl p-5">
            <div class="font-semibold mb-2">模板分类</div>
            <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div v-for="c in categories" :key="c.value" class="bg-white rounded-lg p-3 border hover:border-blue-300 transition">
                <div class="font-medium">{{ c.label }}</div>
                <div class="text-gray-500">{{ c.desc }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>

<script setup lang="ts">
import { dockerServiceTemplates } from '@/utils/dockerTemplates'
import { useComposeGenerator } from '@/composables/useComposeGenerator'
import { computed, ref } from 'vue'
import { useClipboard } from '@vueuse/core'

const { meta, services, templateMap, addService, removeService, updateService, generateYaml, downloadYaml } = useComposeGenerator(dockerServiceTemplates)

const selectedTemplateId = ref<string | null>(null)

const categories = [
  { value: 'stateful', label: '有状态', desc: '数据库/缓存/队列等需要持久化的数据服务' },
  { value: 'stateless', label: '无状态', desc: '应用容器，例如 Java/Node 等' },
  { value: 'edge', label: '边缘/网关', desc: 'Nginx/Traefik 等入口网关' },
  { value: 'messaging', label: '消息与流', desc: 'RabbitMQ/Kafka 等消息组件' },
  { value: 'observability', label: '可观测性', desc: 'Prometheus/Grafana/ELK 等' },
] as const

type CategoryKey = typeof categories[number]['value'] | null
const activeCategory = ref<CategoryKey>(null)

function categoryLabel(c: string) {
  const hit = categories.find(x => x.value === c)
  return hit ? hit.label : c
}

const templateOptions = computed(() => dockerServiceTemplates.map(t => ({ title: `${t.name}（${categoryLabel(t.category)}）`, value: t.id })))

function handleAddService() {
  if (!selectedTemplateId.value) return
  addService(selectedTemplateId.value)
}

const filteredServices = computed(() => {
  if (!activeCategory.value) return services.value
  return services.value.filter(s => templateMap.value[s.templateId]?.category === activeCategory.value)
})

const yamlString = computed(() => generateYaml())

const { copy } = useClipboard()
function copyYaml() {
  copy(yamlString.value)
}

</script>

<style scoped>
pre { white-space: pre; }
</style>


