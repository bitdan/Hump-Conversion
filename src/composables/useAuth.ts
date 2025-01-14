import { ref } from 'vue'
import axios from 'axios'
import { 
  API_CONFIG, 
  type LoginPayload, 
  type RegisterPayload, 
  type CaptchaResponse,
  type LoginResponse,
  type RegisterResponse
} from '@/config/api.config'

export function useAuth() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const captchaData = ref<CaptchaResponse['data'] | null>(null)

  async function register(payload: RegisterPayload) {
    try {
      loading.value = true
      error.value = null
      const response = await axios.post<RegisterResponse>(
        `${API_CONFIG.BASE_URL}${API_CONFIG.AUTH.REGISTER}`,
        payload
      )
      if (response.data.code === 200) {
        return response.data.data
      } else {
        throw new Error(response.data.msg)
      }
    } catch (err: any) {
      error.value = err.response?.data?.msg || err.message || '注册失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function login(payload: LoginPayload) {
    try {
      loading.value = true
      error.value = null
      const response = await axios.post<LoginResponse>(
        `${API_CONFIG.BASE_URL}${API_CONFIG.AUTH.LOGIN}`,
        payload
      )
      if (response.data.code === 200) {
        return response.data.data
      } else {
        throw new Error(response.data.msg)
      }
    } catch (err: any) {
      error.value = err.response?.data?.msg || err.message || '登录失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getCaptcha() {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get<CaptchaResponse>(
        `${API_CONFIG.BASE_URL}${API_CONFIG.AUTH.CAPTCHA}`
      )
      if (response.data.code === 200) {
        captchaData.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.msg)
      }
    } catch (err: any) {
      error.value = err.response?.data?.msg || err.message || '获取验证码失败'
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