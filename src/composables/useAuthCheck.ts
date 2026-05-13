import { useRouter } from 'vue-router'
import {useUserStore} from '@/stores/user'
import {isTokenExpired} from '@/utils/authToken'

export function useAuthCheck() {
  const router = useRouter()

  function checkAuth(): boolean {
      const userStore = useUserStore()
      if (!userStore.token || isTokenExpired(userStore.token)) {
          if (userStore.token) {
              userStore.clearUserInfo()
          }
          router.push({
              path: '/auth/login',
              query: {redirect: router.currentRoute.value.fullPath}
          })
      return false
    }
    return true
  }

  // 用于包装需要登录的操作
  async function withAuth<T>(action: () => Promise<T>): Promise<T | void> {
    if (checkAuth()) {
      return await action()
    }
  }

  return {
    checkAuth,
    withAuth
  }
} 
