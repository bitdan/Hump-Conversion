<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'

const router = useRouter()
const { login, getCaptcha, loading, error, captchaData } = useAuth()

const formData = ref({
  username: '',
  password: '',
  code: '',
  uuid: ''
})

const showPassword = ref(false)
const formValid = ref(false)

const rules = {
  username: [(v: string) => !!v || '用户名不能为空'],
  password: [(v: string) => !!v || '密码不能为空'],
  code: [(v: string) => !!v || '验证码不能为空']
}

async function refreshCaptcha() {
  await getCaptcha()
  if (captchaData.value) {
    formData.value.uuid = captchaData.value.uuid
  }
}

async function handleLogin() {
  try {
    const response = await login(formData.value)
    if (response.token) {
      localStorage.setItem('token', response.token)
      router.push('/case-converter')
    }
  } catch (err) {
    await refreshCaptcha()
  }
}

onMounted(() => {
  refreshCaptcha()
})
</script>

<template>
  <v-container class="h-screen flex items-center justify-center">
    <v-card class="w-full max-w-md p-6">
      <v-card-title class="text-center text-2xl font-bold mb-6">
        登录
      </v-card-title>

      <v-form v-model="formValid" @submit.prevent="handleLogin">
        <v-text-field
          v-model="formData.username"
          label="用户名"
          :rules="rules.username"
          variant="outlined"
          class="mb-4"
        />

        <v-text-field
          v-model="formData.password"
          label="密码"
          :type="showPassword ? 'text' : 'password'"
          :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append="showPassword = !showPassword"
          :rules="rules.password"
          variant="outlined"
          class="mb-4"
        />

        <div class="flex gap-4 mb-4">
          <v-text-field
            v-model="formData.code"
            label="验证码"
            :rules="rules.code"
            variant="outlined"
            class="flex-1"
          />
          <div class="w-32 h-12 flex items-center" @click="refreshCaptcha">
            <img
              v-if="captchaData?.img"
              :src="`data:image/png;base64,${captchaData.img}`"
              alt="验证码"
              class="w-full h-full object-contain cursor-pointer"
            />
          </div>
        </div>

        <v-btn
          type="submit"
          color="primary"
          block
          :loading="loading"
          :disabled="!formValid"
          class="mb-4"
        >
          登录
        </v-btn>

        <div class="text-center">
          <router-link to="/auth/register" class="text-primary">
            还没有账号？立即注册
          </router-link>
        </div>
      </v-form>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mt-4"
      >
        {{ error }}
      </v-alert>
    </v-card>
  </v-container>
</template> 