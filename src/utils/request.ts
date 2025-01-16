import type {AxiosInstance, AxiosResponse, InternalAxiosRequestConfig} from 'axios'
import axios from 'axios'
import {useUserStore} from '@/stores/user'
import {useMessage} from '@/composables/useMessage'

const { showError } = useMessage()

// 创建axios实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api', // API的base_url
  timeout: 10000, // 请求超时时间
  headers: { 'Content-Type': 'application/json;charset=utf-8' }
})

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const userStore = useUserStore()
    // 登录接口不需要token
    if (userStore.token && !config.url?.includes('/login')) {
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
        const userStore = useUserStore()
        userStore.clearUserInfo()
        window.location.href = '/auth/login'
        return Promise.reject(new Error('认证失败，请重新登录'))
      }
      showError(res.msg || '请求失败')
      return Promise.reject(new Error(res.msg || '请求失败'))
    }
    return res
  },
  (error) => {
    console.error('请求错误', error)
    if (error.response?.status === 401) {
      const userStore = useUserStore()
      userStore.clearUserInfo()
      window.location.href = '/auth/login'
      return Promise.reject(new Error('认证失败，请重新登录'))
    }
    showError(error.message || '请求失败')
    return Promise.reject(error)
  }
)

// 导出请求方法
const request = {
  get<T = any>(url: string, config?: InternalAxiosRequestConfig): Promise<T> {
    return service.get(url, config)
  },

  post<T = any>(url: string, data?: any, config?: InternalAxiosRequestConfig): Promise<T> {
    return service.post(url, data, config)
  },

  put<T = any>(url: string, data?: any, config?: InternalAxiosRequestConfig): Promise<T> {
    return service.put(url, data, config)
  },

  delete<T = any>(url: string, config?: InternalAxiosRequestConfig): Promise<T> {
    return service.delete(url, config)
  }
}

export default request
