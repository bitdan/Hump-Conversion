import {ref} from 'vue'
import {
    type CaptchaData,
    getCaptcha as authGetCaptcha,
    login as authLogin,
    type LoginPayload,
    logout as authLogout,
    register as authRegister,
    type RegisterPayload
} from '@/api/auth'
import {useRouter} from 'vue-router'
import {useUserStore} from '@/stores/user'

export function useAuth() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const captchaData = ref<CaptchaData | null>(null)
  const router = useRouter()
  const userStore = useUserStore()

  async function register(payload: RegisterPayload) {
    try {
      loading.value = true
      error.value = null
      const { data } = await authRegister(payload)
      return data
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
      const { data } = await authLogin(payload)
      userStore.setToken(data.token)
      return data
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
      const { data } = await authGetCaptcha()
      captchaData.value = data
      return data
    } catch (err: any) {
      error.value = err.response?.data?.msg || err.message || '获取验证码失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      loading.value = true
      error.value = null
      await authLogout()
      router.push('/auth/login')
    } catch (err: any) {
      error.value = err.response?.data?.msg || err.message || '登出失败'
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
    logout,
    getCaptcha
  }
}
