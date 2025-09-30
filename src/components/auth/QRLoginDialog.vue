<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="500px"
            persistent>
    <v-card class="qr-login-card">
      <v-card-title class="text-center mb-6">
        <h3 class="text-h4 font-weight-bold"
            style="background: linear-gradient(135deg, #0062ff, #00b7ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          扫码登录
        </h3>
        <p class="text-subtitle-1 text-medium-emphasis">使用微信扫描二维码登录</p>
      </v-card-title>

      <div class="text-center">
        <!-- 二维码显示区域 -->
        <div class="qr-container mb-6">
          <div v-if="qrLoading" class="d-flex align-center justify-center" style="height: 300px;">
            <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          </div>
          <div v-else-if="qrData" class="qr-image-container">
            <img :src="qrData.qrCodeUrl" alt="登录二维码" class="qr-image"/>
            <div class="qr-overlay" v-if="status !== 'waiting'">
              <v-icon
                  :color="status === 'confirmed' ? 'success' : status === 'scanned' ? 'warning' : 'error'"
                  size="48"
              >
                {{
                  status === 'confirmed' ? 'mdi-check-circle' : status === 'scanned' ? 'mdi-account-check' : 'mdi-close-circle'
                }}
              </v-icon>
              <p class="text-body-1 mt-2">{{ statusMessage }}</p>
            </div>
          </div>
          <div v-else class="d-flex align-center justify-center" style="height: 300px;">
            <v-icon color="error" size="64">mdi-alert-circle</v-icon>
          </div>
        </div>

        <!-- 状态信息 -->
        <div class="status-info mb-6">
          <v-alert
              v-if="status === 'waiting'"
              type="info"
              variant="tonal"
              class="mb-4"
          >
            请使用微信扫描上方二维码
          </v-alert>

          <v-alert
              v-else-if="status === 'scanned'"
              type="warning"
              variant="tonal"
              class="mb-4"
          >
            二维码已扫描，请在手机上确认登录
          </v-alert>

          <v-alert
              v-else-if="status === 'confirmed'"
              type="success"
              variant="tonal"
              class="mb-4"
          >
            登录成功！
          </v-alert>

          <v-alert
              v-else-if="status === 'expired'"
              type="error"
              variant="tonal"
              class="mb-4"
          >
            二维码已过期，请重新生成
          </v-alert>
        </div>

        <!-- 操作按钮 -->
        <div class="d-flex gap-4">
          <v-btn
              @click="refreshQRCode"
              :loading="qrLoading"
              variant="outlined"
              class="flex-1"
              height="48"
          >
            <v-icon class="mr-2">mdi-refresh</v-icon>
            刷新
          </v-btn>
          <v-btn
              @click="$emit('update:modelValue', false)"
              variant="outlined"
              class="flex-1"
              height="48"
          >
            取消
          </v-btn>
        </div>

        <!-- 绑定对话框 -->
        <v-dialog v-model="showBindDialog" max-width="500px" persistent>
          <v-card class="auth-card">
            <v-card-title class="text-center mb-6">
              <h3 class="text-h4 font-weight-bold"
                  style="background: linear-gradient(135deg, #0062ff, #00b7ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                绑定微信账号
              </h3>
              <p class="text-subtitle-1 text-medium-emphasis">请输入您的账号信息以绑定微信</p>
            </v-card-title>

            <v-form @submit.prevent="handleBindWechat">
              <v-text-field
                  v-model="bindFormData.username"
                  label="用户名"
                  :rules="[v => !!v || '用户名不能为空']"
                  variant="outlined"
                  class="mb-4 input-field"
                  prepend-inner-icon="mdi-account"
                  bg-color="grey-lighten-4"
                  hide-details="auto"
              />

              <v-text-field
                  v-model="bindFormData.password"
                  label="密码"
                  type="password"
                  :rules="[v => !!v || '密码不能为空']"
                  variant="outlined"
                  class="mb-6 input-field"
                  prepend-inner-icon="mdi-lock"
                  bg-color="grey-lighten-4"
                  hide-details="auto"
              />

              <div class="d-flex gap-4">
                <v-btn
                    @click="showBindDialog = false"
                    variant="outlined"
                    class="flex-1"
                    height="48"
                >
                  取消
                </v-btn>
                <v-btn
                    type="submit"
                    color="primary"
                    class="flex-1"
                    height="48"
                    :loading="loading"
                >
                  绑定
                </v-btn>
              </div>
            </v-form>
          </v-card>
        </v-dialog>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import {onUnmounted, ref, watch} from 'vue'
import {useAuth} from '@/composables/useAuth'
import {useRouter} from 'vue-router'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const router = useRouter()
const {
  createQRCodeLogin,
  checkQRCodeStatus,
  qrCodeLogin,
  bindWechatUser,
  loading
} = useAuth()

// 响应式数据
const qrLoading = ref(false)
const qrData = ref<{ ticket: string; qrCodeUrl: string; sceneStr: string } | null>(null)
const status = ref<'waiting' | 'scanned' | 'confirmed' | 'expired' | 'error'>('waiting')
const statusMessage = ref('')
const showBindDialog = ref(false)
const bindFormData = ref({
  username: '',
  password: '',
  openid: ''
})

let statusCheckInterval: NodeJS.Timeout | null = null

// 创建二维码登录
async function createQR() {
  try {
    qrLoading.value = true
    const sceneStr = `qr_login_${Date.now()}`
    const result = await createQRCodeLogin({sceneStr})
    qrData.value = result
    status.value = 'waiting'
    statusMessage.value = '请使用微信扫描二维码'

    // 开始轮询状态
    startStatusCheck(sceneStr)
  } catch (err) {
    console.error('创建二维码失败:', err)
    status.value = 'error'
    statusMessage.value = '创建二维码失败'
  } finally {
    qrLoading.value = false
  }
}

// 开始状态检查
function startStatusCheck(sceneStr: string) {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval)
  }

  statusCheckInterval = setInterval(async () => {
    try {
      const result = await checkQRCodeStatus(sceneStr)
      status.value = result.status as any
      statusMessage.value = result.message || ''

      if (result.status === 'confirmed' && result.userInfo) {
        // 登录成功
        await handleQRLoginSuccess(sceneStr, result.userInfo)
      } else if (result.status === 'expired') {
        // 二维码过期
        clearInterval(statusCheckInterval!)
        statusCheckInterval = null
      }
    } catch (err) {
      console.error('检查状态失败:', err)
    }
  }, 2000) // 每2秒检查一次
}

// 处理二维码登录成功
async function handleQRLoginSuccess(sceneStr: string, wechatInfo: any) {
  try {
    const result = await qrCodeLogin(sceneStr, wechatInfo)
    if (result.success) {
      clearInterval(statusCheckInterval!)
      statusCheckInterval = null
      emit('update:modelValue', false)
      router.push('/case-converter')
    } else if (result.needBind && result.wechatInfo) {
      // 需要绑定账号
      bindFormData.value.openid = result.wechatInfo.openid
      showBindDialog.value = true
    }
  } catch (err) {
    console.error('二维码登录失败:', err)
  }
}

// 刷新二维码
async function refreshQRCode() {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval)
    statusCheckInterval = null
  }
  await createQR()
}

// 绑定微信账号
async function handleBindWechat() {
  try {
    const result = await bindWechatUser(bindFormData.value)
    if (result.success) {
      showBindDialog.value = false
      emit('update:modelValue', false)
      router.push('/case-converter')
    }
  } catch (err) {
    console.error('绑定失败:', err)
  }
}

// 监听对话框显示状态
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    createQR()
  } else {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval)
      statusCheckInterval = null
    }
  }
})

onUnmounted(() => {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval)
  }
})
</script>

<style scoped>
.qr-login-card {
  border-radius: 24px;
  padding: 32px;
}

.qr-container {
  position: relative;
  display: inline-block;
}

.qr-image-container {
  position: relative;
  display: inline-block;
}

.qr-image {
  width: 300px;
  height: 300px;
  border-radius: 12px;
  border: 2px solid rgba(0, 98, 255, 0.1);
}

.qr-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  backdrop-filter: blur(5px);
}

.input-field :deep(.v-field__outline__start) {
  border-radius: 12px 0 0 12px;
  border-color: rgba(0, 98, 255, 0.1);
}

.input-field :deep(.v-field__outline__end) {
  border-radius: 0 12px 12px 0;
  border-color: rgba(0, 98, 255, 0.1);
}

.input-field:hover :deep(.v-field__outline__start),
.input-field:hover :deep(.v-field__outline__end) {
  border-color: #0062ff;
}
</style>
