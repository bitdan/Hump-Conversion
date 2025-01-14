import { ref } from 'vue'
import axios from 'axios'
import { API_CONFIG, type LoginPayload, type RegisterPayload, type CaptchaResponse } from '@/config/api.config'

export function useAuth() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const captchaData = ref<CaptchaResponse['data'] | null>(null)

  async function register(payload: RegisterPayload) {
    try {
      loading.value = true
      error.value = null
      const response = await axios.post(`${API_CONFIG.BASE_URL}${API_CONFIG.AUTH.REGISTER}`, payload)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Registration failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function login(payload: LoginPayload) {
    try {
      loading.value = true
      error.value = null
      const response = await axios.post(`${API_CONFIG.BASE_URL}${API_CONFIG.AUTH.LOGIN}`, payload)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getCaptcha() {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get<CaptchaResponse>(`${API_CONFIG.BASE_URL}${API_CONFIG.AUTH.CAPTCHA}`)
      captchaData.value = response.data.data
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to get captcha'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    captchaData,
    register,
    login,
    getCaptcha
  }
} 