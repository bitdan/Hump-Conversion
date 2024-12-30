<template>
  <div class="container mx-auto p-4">
    <!-- 动态生成导航菜单 -->
    <nav class="mb-4">
      <router-link
          v-for="route in routes"
          :key="route.name"
          :to="route.path"
          class="mr-4"
          active-class="router-link-active"
      >
        {{ route.meta?.title || route.name }}  <!-- 使用 meta.title 作为显示名称 -->
      </router-link>
    </nav>

    <!-- 路由视图 -->
    <router-view></router-view>
  </div>
</template>

<script setup>
import {useRouter} from 'vue-router'

// 获取路由对象
const router = useRouter()

// 获取所有路由信息，过滤掉没有 name 的路由
const routes = router.options.routes.filter(route => route.name && route.path !== '*')
</script>

<style>
/* 自定义的激活链接样式 */
.router-link-active {
  color: #4F46E5;
  font-weight: bold;
}
</style>
