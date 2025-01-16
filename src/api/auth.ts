import request from '@/utils/request'

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