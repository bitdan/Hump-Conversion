<template>
  <v-card class="pa-6 rounded-xl">
    <v-card-title class="text-h4 font-weight-bold text-center mb-6">
      注册
    </v-card-title>

    <v-form @submit.prevent="handleRegister">
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
        v-model="form.email"
        label="邮箱"
        prepend-inner-icon="mdi-email"
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
        注册
      </v-btn>

      <div class="text-center">
        <router-link
          to="/auth/login"
          class="text-decoration-none text-primary"
        >
          已有账号？立即登录
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
  email: '',
  password: ''
})

const handleRegister = async () => {
  try {
    loading.value = true
    await axios.post('/api/auth/register', form.value)
    // 注册成功后跳转到登录页
    router.push('/auth/login')
  } catch (error) {
    errorMessage.value = error.response?.data?.error || '注册失败'
    showError.value = true
  } finally {
    loading.value = false
  }
}
</script> 