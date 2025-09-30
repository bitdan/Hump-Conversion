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

// 微信登录相关接口
export interface WechatLoginRequest {
    code: string
    state?: string
}

export interface WechatBindRequest {
    openid: string
    username: string
    password: string
}

export interface WechatUserInfo {
    openid: string
    nickname?: string
    sex?: number
    province?: string
    city?: string
    country?: string
    headimgurl?: string
    unionid?: string
}

export interface WechatLoginResponse {
    success: boolean
    token?: string
    userInfo?: UserInfo
    wechatInfo?: WechatUserInfo
    message: string
    needBind: boolean
}

export interface QRCodeLoginRequest {
    sceneStr: string
}

export interface QRCodeLoginResponse {
    ticket: string
    qrCodeUrl: string
    sceneStr: string
}

export interface QRCodeStatusResponse {
    status: string
    userInfo?: WechatUserInfo
    message?: string
}

export interface WechatLoginUrlResponse {
    loginUrl: string
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
    return request.get<ApiResponse<CaptchaData>>('/api/v1/captchaImage')
}

// 获取用户信息
export function getUserInfo() {
    return request.get<ApiResponse<UserInfo>>('/api/v1/getInfo')
}

// 用户登出
export function logout() {
    return request.post<ApiResponse<void>>('/api/v1/logout').finally(() => {
    const userStore = useUserStore()
    userStore.clearUserInfo()
  })
}

// 微信登录相关API
// 获取微信登录授权URL
export function getWechatLoginUrl() {
    return request.get<ApiResponse<WechatLoginUrlResponse>>('/api/v1/wechat/login-url')
}

// 微信登录
export function wechatLogin(data: WechatLoginRequest) {
    return request.post<WechatLoginResponse>('/api/v1/wechat/login', data)
}

// 绑定微信账号
export function bindWechatUser(data: WechatBindRequest) {
    return request.post<WechatLoginResponse>('/api/v1/wechat/bind', data)
}

// 创建二维码登录
export function createQRCodeLogin(data: QRCodeLoginRequest) {
    return request.post<QRCodeLoginResponse>('/api/v1/wechat/qr/create', data)
}

// 检查二维码状态
export function checkQRCodeStatus(sceneStr: string) {
    return request.get<QRCodeStatusResponse>(`/api/v1/wechat/qr/status/${sceneStr}`)
}

// 二维码登录确认
export function qrCodeLogin(sceneStr: string, wechatInfo: WechatUserInfo) {
    return request.post<WechatLoginResponse>(`/api/v1/wechat/qr/login`, {
        scene_str: sceneStr,
        ...wechatInfo
    })
}
