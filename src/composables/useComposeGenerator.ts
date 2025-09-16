import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import yaml from 'js-yaml'
import type { ComposeProject, DockerServiceTemplate } from '@/utils/dockerTemplates'

export interface SelectedService {
    key: string
    templateId: string
    name: string
    params: Record<string, unknown>
}

export function useComposeGenerator(templates: DockerServiceTemplate[]) {
    const meta = useStorage('compose:meta', { name: 'my-stack', version: '3.8' as const })
    const services = useStorage<SelectedService[]>('compose:services', [])

    const templateMap = computed<Record<string, DockerServiceTemplate>>(() => {
        return templates.reduce((acc, t) => {
            acc[t.id] = t
            return acc
        }, {} as Record<string, DockerServiceTemplate>)
    })

    const composeSpec = computed<ComposeProject>(() => {
        const specServices: Record<string, Record<string, unknown>> = {}
        for (const svc of services.value) {
            const tpl = templateMap.value[svc.templateId]
            if (!tpl) continue
            const serviceName = svc.name || tpl.name
            specServices[serviceName] = tpl.toCompose(svc.params)
        }
        return {
            meta: meta.value,
            spec: {
                services: specServices
            }
        }
    })

    function addService(templateId: string) {
        const tpl = templateMap.value[templateId]
        if (!tpl) return
        const key = `${templateId}-${Date.now()}`
        services.value.push({
            key,
            templateId,
            name: tpl.name.toLowerCase().replace(/\s+/g, '-'),
            params: {}
        })
    }

    function removeService(key: string) {
        services.value = services.value.filter(s => s.key !== key)
    }

    function updateService(key: string, updates: Partial<SelectedService>) {
        const idx = services.value.findIndex(s => s.key === key)
        if (idx === -1) return
        services.value[idx] = { ...services.value[idx], ...updates }
    }

    function generateYaml(): string {
        const doc = {
            name: composeSpec.value.meta.name,
            version: composeSpec.value.meta.version,
            services: composeSpec.value.spec.services
        }
        return yaml.dump(doc, { noRefs: true, lineWidth: 120 })
    }

    function downloadYaml(filename?: string) {
        const content = generateYaml()
        const normalized = (typeof filename === 'string' ? filename : undefined)
        const safeName = (composeSpec.value?.meta?.name || 'docker-compose')
            .toString()
            .trim()
            .replace(/[^a-zA-Z0-9-_]+/g, '-')
            .replace(/^-+|-+$/g, '')

        const base = normalized?.trim() || safeName || 'docker-compose'
        const finalName = `${base}.yml`

        const blob = new Blob([content], { type: 'application/x-yaml;charset=utf-8' })
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.setAttribute('download', finalName)
        document.body.appendChild(a)

        a.click()
        setTimeout(() => {
            URL.revokeObjectURL(url)
            document.body.removeChild(a)
        }, 0)
    }
    

    return {
        meta,
        services,
        templateMap,
        composeSpec,
        addService,
        removeService,
        updateService,
        generateYaml,
        downloadYaml
    }
}


