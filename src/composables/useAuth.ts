import {ref} from 'vue'
import {
    bindWechatUser as authBindWechatUser,
    type CaptchaData,
    checkQRCodeStatus as authCheckQRCodeStatus,
    createQRCodeLogin as authCreateQRCodeLogin,
    getCaptcha as authGetCaptcha,
    getUserInfo as authGetUserInfo,
    getWechatLoginUrl as authGetWechatLoginUrl,
    login as authLogin,
    type LoginPayload,
    logout as authLogout,
    qrCodeLogin as authQrCodeLogin,
    type QRCodeLoginRequest,
    register as authRegister,
    type RegisterPayload,
    type WechatBindRequest,
    wechatLogin as authWechatLogin,
    type WechatLoginRequest,
    type WechatUserInfo
} from '@/api/auth'
import {useRouter} from 'vue-router'
import {useUserStore} from '@/stores/user'
import {useMessage} from '@/composables/useMessage'

export function useAuth() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const captchaData = ref<CaptchaData | null>(null)
  const router = useRouter()
  const userStore = useUserStore()
  const { showSuccess } = useMessage()

  async function register(payload: RegisterPayload) {
    try {
      loading.value = true
      error.value = null
        const {data} = await authRegister(payload)
        // 注册成功后自动登录
        if (data?.token) {
            userStore.setToken(data.token)
            await getUserInfo()
            showSuccess('注册成功')
            router.push('/case-converter')
        } else {
            showSuccess('注册成功，请登录')
            router.push('/auth/login')
        }
      return true
    } catch (err: any) {
        error.value = err.response?.data?.detail || err.response?.data?.msg || err.message || '注册失败'
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
        if (data?.token) {
            userStore.setToken(data.token)
            await getUserInfo()
            return data
        } else {
            throw new Error('登录响应数据格式错误')
        }
    } catch (err: any) {
        error.value = err.response?.data?.detail || err.response?.data?.msg || err.message || '登录失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getUserInfo() {
    try {
      loading.value = true
      error.value = null
      const { data } = await authGetUserInfo()
      userStore.setUserInfo(data)
      return data
    } catch (err: any) {
      error.value = err.response?.data?.msg || err.message || '获取用户信息失败'
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
        error.value = err.response?.data?.detail || err.response?.data?.msg || err.message || '获取验证码失败'
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
        error.value = err.response?.data?.detail || err.response?.data?.msg || err.message || '登出失败'
      throw err
    } finally {
      loading.value = false
    }
  }

    // 微信登录相关方法
    async function getWechatLoginUrl() {
        try {
            loading.value = true
            error.value = null
            const {data} = await authGetWechatLoginUrl()
            return data
        } catch (err: any) {
            error.value = err.response?.data?.detail || err.response?.data?.msg || err.message || '获取微信登录URL失败'
            throw err
        } finally {
            loading.value = false
        }
    }

    async function wechatLogin(payload: WechatLoginRequest) {
        try {
            loading.value = true
            error.value = null
            const {data} = await authWechatLogin(payload)

            if (data.success && data.token) {
                userStore.setToken(data.token)
                if (data.userInfo) {
                    userStore.setUserInfo(data.userInfo)
                }
                showSuccess('微信登录成功')
                return data
            } else if (data.needBind) {
                // 需要绑定账号，返回绑定信息
                return data
            } else {
                throw new Error(data.message || '微信登录失败')
            }
        } catch (err: any) {
            error.value = err.response?.data?.detail || err.response?.data?.msg || err.message || '微信登录失败'
            throw err
        } finally {
            loading.value = false
        }
    }

    async function bindWechatUser(payload: WechatBindRequest) {
        try {
            loading.value = true
            error.value = null
            const {data} = await authBindWechatUser(payload)

            if (data.success && data.token) {
                userStore.setToken(data.token)
                if (data.userInfo) {
                    userStore.setUserInfo(data.userInfo)
                }
                showSuccess('微信账号绑定成功')
                return data
            } else {
                throw new Error(data.message || '绑定失败')
            }
        } catch (err: any) {
            error.value = err.response?.data?.detail || err.response?.data?.msg || err.message || '绑定失败'
            throw err
        } finally {
            loading.value = false
        }
    }

    async function createQRCodeLogin(payload: QRCodeLoginRequest) {
        try {
            loading.value = true
            error.value = null
            const {data} = await authCreateQRCodeLogin(payload)
            return data
        } catch (err: any) {
            error.value = err.response?.data?.detail || err.response?.data?.msg || err.message || '创建二维码登录失败'
            throw err
        } finally {
            loading.value = false
        }
    }

    async function checkQRCodeStatus(sceneStr: string) {
        try {
            loading.value = true
            error.value = null
            const {data} = await authCheckQRCodeStatus(sceneStr)
            return data
        } catch (err: any) {
            error.value = err.response?.data?.detail || err.response?.data?.msg || err.message || '检查二维码状态失败'
            throw err
        } finally {
            loading.value = false
        }
    }

    async function qrCodeLogin(sceneStr: string, wechatInfo: WechatUserInfo) {
        try {
            loading.value = true
            error.value = null
            const {data} = await authQrCodeLogin(sceneStr, wechatInfo)

            if (data.success && data.token) {
                userStore.setToken(data.token)
                if (data.userInfo) {
                    userStore.setUserInfo(data.userInfo)
                }
                showSuccess('扫码登录成功')
                return data
            } else if (data.needBind) {
                // 需要绑定账号
                return data
            } else {
                throw new Error(data.message || '扫码登录失败')
            }
        } catch (err: any) {
            error.value = err.response?.data?.detail || err.response?.data?.msg || err.message || '扫码登录失败'
            throw err
        } finally {
            loading.value = false
        }
    }

    // 跳转到微信登录
    async function redirectToWechatLogin() {
        try {
            const data = await getWechatLoginUrl()
            if (data?.loginUrl) {
                window.location.href = data.loginUrl
            } else {
                throw new Error('获取微信登录URL失败')
            }
        } catch (err) {
            error.value = '跳转微信登录失败'
            throw err
        }
    }

  return {
    loading,
    error,
    captchaData,
    register,
    login,
    logout,
      getCaptcha,
      // 微信登录相关方法
      getWechatLoginUrl,
      wechatLogin,
      bindWechatUser,
      createQRCodeLogin,
      checkQRCodeStatus,
      qrCodeLogin,
      redirectToWechatLogin
  }
}
