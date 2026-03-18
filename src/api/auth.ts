import request from '@/utils/request'
import {useUserStore} from '@/stores/user'

interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

interface RawCaptchaData {
    captchaEnabled?: boolean
    captcha_enabled?: boolean
    uuid: string
    img: string
}

interface RawUserInfo {
    user: {
        userId?: string
        user_id?: string
        username: string
        email?: string
        avatar?: string
    }
    roles: string[]
    permissions: string[]
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

function normalizeCaptchaData(data: RawCaptchaData): CaptchaData {
    return {
        captchaEnabled: data.captchaEnabled ?? data.captcha_enabled ?? true,
        uuid: data.uuid,
        img: data.img
    }
}

function normalizeUserInfo(data: RawUserInfo): UserInfo {
    return {
        user: {
            userId: data.user.userId ?? data.user.user_id ?? '',
            username: data.user.username,
            email: data.user.email,
            avatar: data.user.avatar
        },
        roles: data.roles ?? [],
        permissions: data.permissions ?? []
    }
}

// 用户注册
export function register(data: RegisterPayload) {
    return request.post<ApiResponse<RegisterData>>('/api/v1/register', data)
}

// 用户登录
export function login(data: LoginPayload) {
    return request.post<ApiResponse<LoginData>>('/api/v1/login', data)
}

// 获取验证码
export function getCaptcha() {
    return request.get<ApiResponse<RawCaptchaData>>('/api/v1/captchaImage').then((response) => ({
        ...response,
        data: normalizeCaptchaData(response.data)
    }))
}

// 获取用户信息
export function getUserInfo() {
    return request.get<ApiResponse<RawUserInfo>>('/api/v1/getInfo').then((response) => ({
        ...response,
        data: normalizeUserInfo(response.data)
    }))
}

// 用户登出
export function logout() {
    return request.post<ApiResponse<void>>('/api/v1/logout').finally(() => {
    const userStore = useUserStore()
    userStore.clearUserInfo()
  })
}
