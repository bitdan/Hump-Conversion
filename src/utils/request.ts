import type {AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig} from 'axios'
import axios from 'axios'
import {useUserStore} from '@/stores/user'
import {useMessage} from '@/composables/useMessage'
import router from '@/router'
import {isTokenExpired} from '@/utils/authToken'

const { showError } = useMessage()

// 创建axios实例
const service: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api/v1', // API的base_url
  timeout: 1000*60, // 请求超时时间
    withCredentials: true,
  headers: { 'Content-Type': 'application/json;charset=utf-8' }
})

const publicApiPaths = new Set(['/login', '/register', '/captchaImage'])

function normalizeApiPath(url?: string) {
    if (!url) return ''
    const path = url.split('?')[0]
    return path.startsWith('/api/v1') ? path.slice('/api/v1'.length) || '/' : path
}

function redirectToLogin() {
    const userStore = useUserStore()
    const redirect = router.currentRoute.value.fullPath

    userStore.clearUserInfo()
    if (router.currentRoute.value.path !== '/auth/login') {
        router.replace({
            path: '/auth/login',
            query: redirect && redirect !== '/' ? {redirect} : undefined
        }).catch(() => undefined)
    }
}

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const userStore = useUserStore()
      const apiPath = normalizeApiPath(config.url)
      // 登录、注册、验证码接口不需要 token，其它接口正常携带认证头
      if (userStore.token && !publicApiPaths.has(apiPath)) {
          if (isTokenExpired(userStore.token)) {
              redirectToLogin()
              return Promise.reject(new axios.CanceledError('认证已过期，请重新登录'))
          }
      config.headers = config.headers || {}
      config.headers['Authorization'] = 'Bearer ' + userStore.token
    }
    return config
  },
  (error) => {
    console.error(error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data
    if (res.code && res.code !== 200) {
      if (res.code === 401) {
          redirectToLogin()
        return Promise.reject(new Error('认证失败，请重新登录'))
      }
      showError(res.msg || '请求失败')
      return Promise.reject(new Error(res.msg || '请求失败'))
    }
    return res
  },
  (error) => {
    console.error('请求错误', error)
      const apiPath = normalizeApiPath(error.config?.url)
    if (error.response?.status === 401) {
        if (publicApiPaths.has(apiPath)) {
            return Promise.reject(error)
        }
        redirectToLogin()
      return Promise.reject(new Error('认证失败，请重新登录'))
    }
      if (axios.isCancel(error)) {
          return Promise.reject(error)
      }
    showError(error.message || '请求失败')
    return Promise.reject(error)
  }
)

// 导出请求方法
const request = {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.get(url, config)
  },

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return service.post(url, data, config)
  },

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return service.put(url, data, config)
  },

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return service.delete(url, config)
  }
}

export default request
