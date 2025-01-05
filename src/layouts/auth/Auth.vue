<template>
  <v-app>
    <v-main class="auth-layout">
      <v-container fluid class="fill-height">
        <v-row align="center" justify="center" no-gutters>
          <v-col cols="12" sm="8" md="6" lg="4">
            <router-view />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
// 认证页面的布局比较简单，不需要额外的逻辑
</script>

<style scoped>
.auth-layout {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.v-container {
  height: 100vh;
}
</style> 