import axios from 'axios'

// 设置axios默认配置
axios.defaults.baseURL = 'http://localhost:8080'
axios.defaults.headers.common['Content-Type'] = 'application/json'

// 如果已经有token，设置默认header
const token = localStorage.getItem('token')
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

// 添加请求拦截器
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 添加响应拦截器
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // token过期或无效，清除本地存储并跳转到登录页
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    return JSON.parse(userStr)
  } catch (error) {
    console.error('Error parsing user data:', error)
    return null
  }
}

export const isAuthenticated = () => {
  const token = localStorage.getItem('token')
  const user = getCurrentUser()
  return !!token && !!user
}

export const logout = async () => {
  try {
    // 调用后端登出接口
    await axios.post('/api/auth/logout')
  } finally {
    // 无论后端是否成功，都清除本地存储
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // 清除 axios 默认 header
    delete axios.defaults.headers.common['Authorization']
    window.location.href = '/auth/login'
  }
} 