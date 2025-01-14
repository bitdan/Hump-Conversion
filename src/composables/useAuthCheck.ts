import { useRouter } from 'vue-router'

export function useAuthCheck() {
  const router = useRouter()

  function checkAuth(): boolean {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
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