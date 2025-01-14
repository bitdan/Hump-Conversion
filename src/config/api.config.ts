export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  AUTH: {
    REGISTER: '/register',
    LOGIN: '/login',
    CAPTCHA: '/captchaImage'
  }
}

export type ApiResponse<T> = {
  code: number
  msg: string
  data: T
}

export type RegisterPayload = {
  username: string
  password: string
  confirmPassword: string
  code: string
  userType: string
  uuid: string
}

export type LoginPayload = {
  username: string
  password: string
  code: string
  uuid: string
}

export type LoginData = {
  token: string
  // 可能还有其他登录返回的数据
}

export type RegisterData = {
  token: string
  // 可能还有其他注册返回的数据
}

export type CaptchaData = {
  captchaEnabled: boolean
  uuid: string
  img: string
}

export type CaptchaResponse = ApiResponse<CaptchaData>
export type LoginResponse = ApiResponse<LoginData>
export type RegisterResponse = ApiResponse<RegisterData> 