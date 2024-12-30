<template>
  <div class="container mx-auto p-4">
    <!-- 导航菜单 -->
    <nav class="mb-4">
      <router-link to="/" class="mr-4">首页</router-link>
      <router-link to="/case-converter">大小写转换</router-link>
    </nav>

    <!-- 路由视图 -->
    <router-view></router-view>
  </div>
</template>

<script setup>
// 不需要额外的导入，因为路由已经在main.js中全局注册
</script>

<style>
.router-link-active {
  color: #4F46E5;
  font-weight: bold;
}
</style>
