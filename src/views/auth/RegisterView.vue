<template>
  <div class="auth-page">
    <div class="auth-background">
      <div class="tech-pattern"></div>
      <div class="gradient-overlay"></div>
    </div>

    <v-container fluid class="h-screen pa-0">
      <v-row class="h-full ma-0">
        <!-- Left Panel -->
        <v-col cols="7" class="h-full d-flex align-center justify-center position-relative">
          <div class="position-relative text-center px-16">
            <h1 class="text-h1 font-weight-bold text-white mb-8">Tool Hub</h1>
            <p class="text-h5 text-white font-weight-regular">加入我们，开启您的工具之旅</p>
            <div class="mt-16 tech-circles">
              <div class="circle circle-1"></div>
              <div class="circle circle-2"></div>
              <div class="circle circle-3"></div>
            </div>
          </div>
        </v-col>

        <!-- Right Panel -->
        <v-col cols="5" class="h-full d-flex align-center justify-center">
          <v-card class="auth-card elevation-24">
            <div class="text-center mb-12">
              <h2 class="text-h3 font-weight-bold mb-4" style="background: linear-gradient(135deg, #0062ff, #00b7ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">创建账号</h2>
              <p class="text-subtitle-1 text-medium-emphasis">填写信息以完成注册</p>
            </div>

            <v-form v-model="formValid" @submit.prevent="handleRegister">
              <v-text-field
                v-model="formData.username"
                label="用户名"
                :rules="rules.username"
                variant="outlined"
                class="mb-4 input-field"
                prepend-inner-icon="mdi-account"
                bg-color="grey-lighten-4"
                hide-details="auto"
              />

              <v-text-field
                v-model="formData.password"
                label="密码"
                :type="showPassword ? 'text' : 'password'"
                :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append="showPassword = !showPassword"
                :rules="rules.password"
                variant="outlined"
                class="mb-4 input-field"
                prepend-inner-icon="mdi-lock"
                bg-color="grey-lighten-4"
                hide-details="auto"
              />

              <v-text-field
                v-model="formData.confirmPassword"
                label="确认密码"
                :type="showConfirmPassword ? 'text' : 'password'"
                :append-icon="showConfirmPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append="showConfirmPassword = !showConfirmPassword"
                :rules="rules.confirmPassword"
                variant="outlined"
                class="mb-4 input-field"
                prepend-inner-icon="mdi-lock-check"
                bg-color="grey-lighten-4"
                hide-details="auto"
              />

              <div class="d-flex gap-4 mb-8">
                <v-text-field
                  v-model="formData.code"
                  label="验证码"
                  :rules="rules.code"
                  variant="outlined"
                  class="flex-1 input-field"
                  prepend-inner-icon="mdi-shield-check"
                  bg-color="grey-lighten-4"
                  hide-details="auto"
                />
                <v-hover v-slot="{ isHovering, props }">
                  <div
                    v-bind="props"
                    @click="refreshCaptcha"
                    class="d-flex align-center justify-center rounded-lg overflow-hidden captcha-container"
                    :class="{ 'elevation-3': isHovering }"
                  >
                    <img
                      v-if="captchaData?.img"
                      :src="`data:image/png;base64,${captchaData.img}`"
                      alt="验证码"
                      class="w-100 h-100 cursor-pointer"
                    />
                  </div>
                </v-hover>
              </div>

              <v-btn
                type="submit"
                color="primary"
                block
                :loading="loading"
                :disabled="!formValid"
                class="mb-8 text-body-1 register-btn"
                height="52"
                elevation="2"
              >
                注册
              </v-btn>

              <div class="text-center">
                <router-link
                  to="/auth/login"
                  class="text-decoration-none"
                >
                  <span class="text-primary font-weight-medium">已有账号？立即登录</span>
                </router-link>
              </div>
            </v-form>

            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mt-6"
              closable
            >
              {{ error }}
            </v-alert>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from 'vue'
import {useAuth} from '@/composables/useAuth'
import {useRouter} from 'vue-router'

const router = useRouter()
const { register, getCaptcha, loading, error, captchaData } = useAuth()

const formData = ref({
  username: '',
  password: '',
  confirmPassword: '',
  code: '',
  userType: 'sys_user',
  uuid: ''
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const formValid = ref(false)

const rules = {
  username: [
    (v: string) => !!v || '用户名不能为空',
    (v: string) => v.length >= 4 || '用户名至少4个字符'
  ],
  password: [
    (v: string) => !!v || '密码不能为空',
    (v: string) => v.length >= 6 || '密码至少6个字符'
  ],
  confirmPassword: [
    (v: string) => !!v || '确认密码不能为空',
    (v: string) => v === formData.value.password || '两次输入的密码不一致'
  ],
  code: [(v: string) => !!v || '验证码不能为空']
}

async function refreshCaptcha() {
  await getCaptcha()
  if (captchaData.value) {
    formData.value.uuid = captchaData.value.uuid
  }
}

async function handleRegister() {
  try {
    await register(formData.value)
  } catch (err) {
    await refreshCaptcha()
  }
}

onMounted(() => {
  refreshCaptcha()
})
</script>

<style scoped>
.auth-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
}

.auth-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  z-index: 0;
}

.gradient-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 30% 50%, rgba(0, 98, 255, 0.1), transparent 50%),
              radial-gradient(circle at 70% 50%, rgba(0, 183, 255, 0.1), transparent 50%);
  backdrop-filter: blur(100px);
}

.tech-pattern {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 30px 30px;
  background-position: 0 0, 15px 15px;
  opacity: 0.5;
  animation: patternMove 20s linear infinite;
}

.auth-card {
  width: 100%;
  max-width: 460px;
  padding: 48px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.input-field :deep(.v-field__outline__start) {
  border-radius: 12px 0 0 12px;
  border-color: rgba(0, 98, 255, 0.1);
}

.input-field :deep(.v-field__outline__end) {
  border-radius: 0 12px 12px 0;
  border-color: rgba(0, 98, 255, 0.1);
}

.input-field:hover :deep(.v-field__outline__start),
.input-field:hover :deep(.v-field__outline__end) {
  border-color: #0062ff;
}

.captcha-container {
  min-width: 120px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 98, 255, 0.1);
}

.register-btn {
  background: linear-gradient(135deg, #0062ff 0%, #00b7ff 100%) !important;
  transition: all 0.3s ease;
  border-radius: 12px;
}

.register-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 98, 255, 0.3) !important;
}

.tech-circles {
  position: relative;
  height: 200px;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(0, 98, 255, 0.2), rgba(0, 183, 255, 0.2));
  backdrop-filter: blur(5px);
}

.circle-1 {
  width: 100px;
  height: 100px;
  left: 20%;
  animation: float 6s ease-in-out infinite;
}

.circle-2 {
  width: 150px;
  height: 150px;
  left: 50%;
  top: 20%;
  animation: float 8s ease-in-out infinite;
}

.circle-3 {
  width: 80px;
  height: 80px;
  left: 75%;
  top: 10%;
  animation: float 7s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@keyframes patternMove {
  0% { background-position: 0 0, 15px 15px; }
  100% { background-position: 30px 30px, 45px 45px; }
}
</style>
