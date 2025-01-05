<template>
  <v-app>
    <v-main class="auth-layout">
      <v-container fluid class="fill-height pa-0">
        <v-row class="fill-height ma-0" no-gutters>
          <!-- 左侧装饰区域 -->
          <v-col cols="12" md="7" class="d-none d-md-flex">
            <div class="decorative-area fill-height d-flex flex-column justify-center align-center">
              <h1 class="text-h2 font-weight-bold text-white mb-4">
                开发者工具
              </h1>
              <p class="text-h6 text-white/80 text-center max-w-lg">
                您的一站式开发工具平台，提供各种实用的开发辅助功能
              </p>
            </div>
          </v-col>

          <!-- 右侧登录表单区域 -->
          <v-col cols="12" md="5" class="d-flex align-center justify-center">
            <div class="auth-form-wrapper">
              <router-view />
            </div>
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
  min-height: 100vh;
  background: #f8fafc;
}

.decorative-area {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

.decorative-area::before {
  content: '';
  position: absolute;
  width: 200%;
  height: 200%;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.1;
  animation: slide 20s linear infinite;
}

@keyframes slide {
  from {
    transform: translateX(-50%) translateY(-50%) rotate(0deg);
  }
  to {
    transform: translateX(-50%) translateY(-50%) rotate(360deg);
  }
}

.auth-form-wrapper {
  width: 100%;
  max-width: 420px;
  padding: 2rem;
}

/* 移动端适配 */
@media (max-width: 959px) {
  .auth-form-wrapper {
    padding: 1.5rem;
  }
}

.max-w-lg {
  max-width: 32rem;
}
</style> 