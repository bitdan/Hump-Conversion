<template>
  <v-app>
    <v-main>
      <v-container>
        <!-- 导航菜单 -->
        <v-toolbar flat class="mb-4">
          <v-toolbar-items>
            <v-btn
              v-for="route in routes"
              :key="route.name"
              :to="route.path"
              variant="text"
              :color="$route.path === route.path ? 'primary' : undefined"
            >
              {{ route.meta?.title || route.name }}
            </v-btn>
          </v-toolbar-items>
        </v-toolbar>

        <!-- 路由视图 -->
        <router-view></router-view>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const routes = router.options.routes.filter(route => route.name && route.path !== '*')
</script>
