import {defineStore} from 'pinia'
import {ref} from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const userId = ref<string | null>(localStorage.getItem('userId'))
  const username = ref<string | null>(localStorage.getItem('username'))
    const email = ref<string | null>(localStorage.getItem('email'))
  const avatar = ref<string | null>(localStorage.getItem('avatar'))
  const roles = ref<string[]>([])
  const permissions = ref<string[]>([])

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const setUserInfo = (userInfo: {
    user: {
      userId: string
      username: string
        email?: string
      avatar?: string
    }
    roles: string[]
    permissions: string[]
  }) => {
    userId.value = userInfo.user.userId
    username.value = userInfo.user.username
      email.value = userInfo.user.email || null
    avatar.value = userInfo.user.avatar || null
    roles.value = userInfo.roles
    permissions.value = userInfo.permissions
    
    localStorage.setItem('userId', userInfo.user.userId)
    localStorage.setItem('username', userInfo.user.username)
      if (userInfo.user.email) {
          localStorage.setItem('email', userInfo.user.email)
      } else {
          localStorage.removeItem('email')
      }
    if (userInfo.user.avatar) {
      localStorage.setItem('avatar', userInfo.user.avatar)
    } else {
        localStorage.removeItem('avatar')
    }
  }

  const clearUserInfo = () => {
    token.value = null
    userId.value = null
    username.value = null
      email.value = null
    avatar.value = null
    roles.value = []
    permissions.value = []
    
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
      localStorage.removeItem('email')
    localStorage.removeItem('avatar')
  }

  return {
    token,
    userId,
    username,
      email,
    avatar,
    roles,
    permissions,
    setToken,
    setUserInfo,
    clearUserInfo
  }
})
