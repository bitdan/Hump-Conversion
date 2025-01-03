<template>
  <nav class="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm mb-6 border border-gray-200 p-3">
    <div class="flex flex-wrap gap-3">
      <v-btn
        v-for="route in routes"
        :key="route.name"
        :to="route.path"
        variant="text"
        rounded="lg"
        :class="[
          'min-w-[120px] font-medium transition-all duration-300 px-4 py-2',
          $route.path === route.path 
            ? 'bg-blue-100 text-blue-700 shadow-sm hover:bg-blue-200'
            : 'hover:bg-gray-100 hover:text-blue-600 hover:-translate-y-0.5'
        ]"
      >
        <v-icon
          :icon="route.meta?.icon || 'mdi-chevron-right'"
          :class="[
            'mr-2',
            $route.path === route.path ? 'text-blue-700' : 'text-gray-500'
          ]"
          size="small"
        ></v-icon>
        <span :class="$route.path === route.path ? 'font-semibold' : ''">
          {{ route.meta?.title || route.name }}
        </span>
      </v-btn>
    </div>
  </nav>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const routes = router.options.routes.filter(route => route.name && route.path !== '*')
</script> 