import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

interface UserInfo {
  id: number
  username: string
  email?: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref<UserInfo | null>(null)
  
  const isLoggedIn = computed(() => {
    if (!token.value) return false
    
    try {
      const decoded = jwtDecode(token.value)
      return (decoded.exp as number) * 1000 > Date.now()
    } catch (error) {
      console.error('Token validation error:', error)
      return false
    }
  })
  
  async function setToken(newToken: string) {
    console.log('Setting token:', newToken)
    token.value = newToken
    localStorage.setItem('token', newToken)
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    
    try {
      const response = await axios.get('/api/user/info')
      console.log('User info response:', response.data)
      userInfo.value = response.data
    } catch (error) {
      console.error('Failed to fetch user info:', error)
      clearToken()
      throw error
    }
  }
  
  function clearToken() {
    console.log('Clearing token and user info')
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }

  // 初始化时检查 token 是否过期并获取用户信息
  if (token.value) {
    try {
      const decoded = jwtDecode(token.value)
      if ((decoded.exp as number) * 1000 <= Date.now()) {
        console.log('Token expired, clearing')
        clearToken()
      } else {
        console.log('Token valid, setting up axios')
        axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
        // 获取用户信息
        axios.get('/api/user/info')
          .then(response => {
            console.log('Initial user info loaded:', response.data)
            userInfo.value = response.data
          })
          .catch(error => {
            console.error('Failed to fetch initial user info:', error)
            clearToken()
          })
      }
    } catch (error) {
      console.error('Token validation error:', error)
      clearToken()
    }
  }
  
  return {
    token,
    userInfo,
    isLoggedIn,
    setToken,
    clearToken
  }
}) 