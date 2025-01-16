import {defineStore} from 'pinia'
import {ref} from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const userId = ref<string | null>(localStorage.getItem('userId'))
  const username = ref<string | null>(localStorage.getItem('username'))

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const setUserInfo = (id: string, name: string) => {
    userId.value = id
    username.value = name
    localStorage.setItem('userId', id)
    localStorage.setItem('username', name)
  }

  const clearUserInfo = () => {
    token.value = null
    userId.value = null
    username.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
  }

  return {
    token,
    userId,
    username,
    setToken,
    setUserInfo,
    clearUserInfo
  }
})
