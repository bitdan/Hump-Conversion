import request from '@/utils/request'
import {useUserStore} from '@/stores/user'

interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

export interface RegisterPayload {
  username: string
  password: string
  confirmPassword: string
  code: string
  userType: string
  uuid: string
}

export interface LoginPayload {
  username: string
  password: string
  code: string
  uuid: string
}

export interface LoginData {
  token: string
}

export interface RegisterData {
  token: string
}

export interface CaptchaData {
  captchaEnabled: boolean
  uuid: string
  img: string
}

export interface UserInfo {
  user: {
    userId: string
    username: string
    email?: string
    avatar?: string
  }
  roles: string[]
  permissions: string[]
}

// 用户注册
export function register(data: RegisterPayload) {
  return request.post<ApiResponse<RegisterData>>('/register', data)
}

// 用户登录
export function login(data: LoginPayload) {
  return request.post<ApiResponse<LoginData>>('/login', data)
}

// 获取验证码
export function getCaptcha() {
  return request.get<ApiResponse<CaptchaData>>('/captchaImage')
}

// 获取用户信息
export function getUserInfo() {
  return request.get<ApiResponse<UserInfo>>('/getInfo')
}

// 用户登出
export function logout() {
  return request.post<ApiResponse<void>>('/logout').finally(() => {
    const userStore = useUserStore()
    userStore.clearUserInfo()
  })
}
