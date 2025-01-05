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
import { useUserStore } from '../../stores/user'

const router = useRouter()
const loading = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)
const userStore = useUserStore()

const form = ref({
  username: '',
  password: ''
})

const handleLogin = async () => {
  try {
    loading.value = true
    console.log('Attempting login with:', {
      username: form.value.username,
      password: form.value.password
    })

    const response = await axios.post('/api/auth/login', {
      username: form.value.username,
      password: form.value.password
    })
    
    console.log('Login response:', response.data)
    
    if (response.data.token) {
      console.log('Login successful, token:', response.data.token)
      await userStore.setToken(response.data.token)
      router.push('/home')
    } else {
      throw new Error('Login response missing token')
    }
  } catch (error) {
    console.error('Login failed:', error)
    errorMessage.value = error.response?.data?.error || '登录失败'
    showError.value = true
  } finally {
    loading.value = false
  }
}
</script> 