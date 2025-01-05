<template>
  <v-card class="pa-6 rounded-xl">
    <v-card-title class="text-h4 font-weight-bold text-center mb-6">
      登录
    </v-card-title>

    <v-form @submit.prevent="handleLogin">
      <v-text-field
        v-model="form.username"
        label="用户名"
        prepend-inner-icon="mdi-account"
        variant="outlined"
        density="comfortable"
        class="mb-4"
        required
      />

      <v-text-field
        v-model="form.password"
        label="密码"
        prepend-inner-icon="mdi-lock"
        :type="showPassword ? 'text' : 'password'"
        :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
        @click:append-inner="showPassword = !showPassword"
        variant="outlined"
        density="comfortable"
        class="mb-6"
        required
      />

      <v-alert
        v-if="showError"
        type="error"
        variant="tonal"
        class="mb-4"
        closable
        @click:close="showError = false"
      >
        {{ errorMessage }}
      </v-alert>

      <v-btn
        block
        color="primary"
        size="large"
        type="submit"
        :loading="loading"
        class="mb-4"
      >
        登录
      </v-btn>

      <div class="text-center">
        <router-link
          to="/auth/register"
          class="text-decoration-none text-primary"
        >
          还没有账号？立即注册
        </router-link>
      </div>
    </v-form>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const loading = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)

const form = ref({
  username: '',
  password: ''
})

const handleLogin = async () => {
  try {
    loading.value = true
    const response = await axios.post('/api/auth/login', form.value)
    
    if (response.data.token) {
      // 保存token和用户信息
      localStorage.setItem('token', response.data.token)
      // 确保正确保存用户信息
      const userData = {
        id: response.data.user.id,
        username: response.data.user.username,
        email: response.data.user.email
      }
      localStorage.setItem('user', JSON.stringify(userData))
      
      // 设置axios默认header
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`
      
      // 获取重定向地址
      const redirect = router.currentRoute.value.query.redirect || '/home'
      router.push(redirect)
    } else {
      throw new Error('登录失败：未获取到token')
    }
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = error.response?.data?.error || '登录失败'
    showError.value = true
  } finally {
    loading.value = false
  }
}
</script> 