export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  AUTH: {
    REGISTER: '/register',
    LOGIN: '/login',
    CAPTCHA: '/captchaImage'
  }
}

export type RegisterPayload = {
  username: string
  password: string
  confirmPassword: string
  code: string
  userType: string
}

export type LoginPayload = {
  username: string
  password: string
  code: string
  uuid: string
}

export type CaptchaResponse = {
  code: number
  msg: string
  data: {
    captchaEnabled: boolean
    uuid: string
    img: string
  }
} 