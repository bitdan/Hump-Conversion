<template>
  <ToolPageLayout :card="false" max-width="max-w-7xl">
    <div class="twofa-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">Account Bound TOTP Vault</p>
        <h1 class="hero-title">2FA 管理台</h1>
      </div>
      <div class="hero-actions">
        <v-btn color="primary" size="large" prepend-icon="mdi-plus" @click="openCreateDialog()">新增令牌</v-btn>
        <v-btn variant="tonal" size="large" prepend-icon="mdi-qrcode-scan" @click="scanDialog = true">扫码绑定</v-btn>
        <v-btn variant="outlined" size="large" prepend-icon="mdi-database-import" @click="importDialog = true">导入
        </v-btn>
        <v-btn variant="outlined" size="large" prepend-icon="mdi-download-box-outline" @click="openExportDialog()">
          导出
        </v-btn>
      </div>
    </section>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="summary-label">令牌总数</span>
        <strong class="summary-value">{{ accounts.length }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">当前用户</span>
        <strong class="summary-value">{{ userStore.username || '未登录' }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">刷新节奏</span>
        <strong class="summary-value">每秒倒计时 / 到点自动同步</strong>
      </article>
    </section>

    <section class="toolbar-card">
      <v-text-field
          v-model="keyword"
          label="搜索令牌"
          density="comfortable"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
      />
      <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadAccounts(true)">刷新</v-btn>
    </section>

    <section v-if="filteredAccounts.length" class="account-grid">
      <article v-for="account in filteredAccounts" :key="account.id" class="account-card">
        <div class="account-header">
          <div>
            <p class="account-issuer">{{ account.issuer }}</p>
            <h2 class="account-label">{{ account.label }}</h2>
            <p class="account-meta">{{ account.accountName || '未填写账户名' }}</p>
          </div>
          <span class="algorithm-chip">{{ account.algorithm }} / {{ account.digits }}位</span>
        </div>

        <div class="code-panel">
          <div class="code-value">{{ formatCode(account.code) }}</div>
          <div class="code-side">
            <span class="countdown">{{ account.secondsRemaining }}s</span>
            <span class="secret-mask">{{ account.secretMasked }}</span>
          </div>
        </div>

        <div class="progress-track">
          <div class="progress-bar" :style="{ width: progressWidth(account) }"></div>
        </div>

        <div class="account-actions">
          <v-btn size="small" variant="tonal" prepend-icon="mdi-qrcode" @click="showQr(account)">二维码</v-btn>
          <v-btn size="small" variant="tonal" prepend-icon="mdi-pencil" @click="openEditDialog(account)">编辑</v-btn>
          <v-btn size="small" variant="text" prepend-icon="mdi-content-copy" @click="copyText(account.code)">
            复制验证码
          </v-btn>
          <v-btn size="small" variant="text" prepend-icon="mdi-delete-outline" color="error"
                 @click="removeAccount(account.id)">删除
          </v-btn>
        </div>
      </article>
    </section>

    <section v-else class="empty-card">
      <v-icon size="48" color="primary">mdi-shield-key-outline</v-icon>
      <h2>还没有 2FA 令牌</h2>
      <p>可以直接扫码识别 `otpauth://totp/...`，也可以手动录入 Base32 Secret，或从 JSON / otpauth 文本批量导入。</p>
    </section>

    <v-dialog v-model="editorDialog" max-width="760">
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>{{ editingId ? '编辑令牌' : '新增令牌' }}</span>
          <v-chip size="small" color="primary" variant="tonal">TOTP</v-chip>
        </v-card-title>
        <v-card-text>
          <v-tabs v-model="editorTab" color="primary">
            <v-tab value="uri">扫码链接</v-tab>
            <v-tab value="manual">手动填写</v-tab>
          </v-tabs>

          <v-window v-model="editorTab" class="mt-4">
            <v-window-item value="uri">
              <v-textarea
                  v-model="editorForm.otpauthUri"
                  label="otpauth URI"
                  variant="outlined"
                  rows="4"
                  hint="支持 otpauth://totp/... 和 Google 导出的 otpauth-migration://offline?data=..."
                  persistent-hint
              />
            </v-window-item>
            <v-window-item value="manual">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <v-text-field v-model="editorForm.label" label="显示名称" variant="outlined"/>
                <v-text-field v-model="editorForm.issuer" label="Issuer" variant="outlined"/>
                <v-text-field v-model="editorForm.accountName" label="账号名" variant="outlined"/>
                <v-text-field v-model="editorForm.secret" label="Base32 Secret" variant="outlined"/>
                <v-select v-model="editorForm.algorithm" :items="algorithms" label="算法" variant="outlined"/>
                <v-select v-model="editorForm.digits" :items="[6, 8]" label="位数" variant="outlined"/>
                <v-text-field v-model.number="editorForm.period" label="周期(秒)" type="number" variant="outlined"/>
              </div>
            </v-window-item>
          </v-window>
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-spacer/>
          <v-btn variant="text" @click="editorDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="saving" @click="submitEditor">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="scanDialog" max-width="920" @update:model-value="handleScanDialogChange">
      <v-card rounded="xl">
        <v-card-title>扫码绑定</v-card-title>
        <v-card-text>
          <div class="scan-grid">
            <div class="scan-panel">
              <video ref="videoRef" class="scan-video" autoplay playsinline muted></video>
              <p class="scan-tip">{{ scanStatus }}</p>
              <div class="flex gap-3 flex-wrap mt-3">
                <v-btn color="primary" prepend-icon="mdi-camera" @click="startCameraScan">启用摄像头</v-btn>
                <v-btn variant="outlined" prepend-icon="mdi-image-search-outline" @click="pickQrImage">识别图片</v-btn>
                <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleImageScan"/>
              </div>
            </div>
            <div>
              <v-textarea
                  v-model="scanText"
                  label="扫码结果 / 手动粘贴"
                  variant="outlined"
                  rows="10"
                  hint="优先支持 otpauth://totp/...，扫码成功后会自动填充"
                  persistent-hint
              />
              <div class="flex justify-end mt-3">
                <v-btn color="primary" prepend-icon="mdi-arrow-right" @click="useScannedText">导入到新增表单</v-btn>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="importDialog" max-width="820">
      <v-card rounded="xl">
        <v-card-title>批量导入</v-card-title>
        <v-card-text>
          <v-radio-group v-model="importMode" inline>
            <v-radio label="追加" value="append"/>
            <v-radio label="替换当前全部" value="replace"/>
          </v-radio-group>
          <v-textarea
              v-model="importText"
              label="导入内容"
              variant="outlined"
              rows="12"
              hint="支持 JSON 数组，或每行一个 otpauth://totp/... 链接"
              persistent-hint
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-spacer/>
          <v-btn variant="text" @click="importDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="saving" @click="submitImport">开始导入</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="exportDialog" max-width="860">
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>导出令牌</span>
          <v-select
              v-model="exportFormat"
              :items="exportFormatOptions"
              density="compact"
              hide-details
              variant="outlined"
              class="max-w-[180px]"
          />
        </v-card-title>
        <v-card-text>
          <v-textarea v-model="exportText" label="导出结果" variant="outlined" rows="14" readonly/>
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-spacer/>
          <v-btn variant="text" @click="exportDialog = false">关闭</v-btn>
          <v-btn color="primary" prepend-icon="mdi-content-copy" @click="copyText(exportText)">复制</v-btn>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-download" @click="downloadExport">下载</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="qrDialog" max-width="420">
      <v-card rounded="xl">
        <v-card-title>{{ qrAccount?.label || '二维码' }}</v-card-title>
        <v-card-text class="text-center">
          <div class="qr-card" v-if="qrAccount">
            <VueQrcode :value="qrAccount.otpauthUri" :size="220" level="M" class="mx-auto"/>
          </div>
          <p class="text-sm text-medium-emphasis mt-4 break-all">{{ qrAccount?.otpauthUri }}</p>
        </v-card-text>
      </v-card>
    </v-dialog>
    </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'
// @ts-ignore
import VueQrcode from '@chenfengyuan/vue-qrcode'
import jsQR from 'jsqr'
import {
  createTwoFactorAccount,
  deleteTwoFactorAccount,
  exportTwoFactorAccounts,
  getTwoFactorAccount,
  importTwoFactorAccounts,
  listTwoFactorAccounts,
  type TwoFactorAccount,
  type TwoFactorAccountPayload,
  updateTwoFactorAccount
} from '@/api/twoFactor'
import {useMessage} from '@/composables/useMessage'
import {useAuthCheck} from '@/composables/useAuthCheck'
import {useUserStore} from '@/stores/user'

const {showError, showSuccess, showWarning} = useMessage()
const {checkAuth} = useAuthCheck()
const userStore = useUserStore()

const accounts = ref<TwoFactorAccount[]>([])
const keyword = ref('')
const loading = ref(false)
const saving = ref(false)

const editorDialog = ref(false)
const editorTab = ref<'uri' | 'manual'>('uri')
const editingId = ref<string | null>(null)
const editorForm = ref<TwoFactorAccountPayload>({
  label: '',
  issuer: '',
  accountName: '',
  secret: '',
  digits: 6,
  period: 30,
  algorithm: 'SHA1',
  otpauthUri: ''
})

const scanDialog = ref(false)
const scanText = ref('')
const scanStatus = ref('等待启用摄像头或上传二维码图片')
const videoRef = ref<HTMLVideoElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const importDialog = ref(false)
const importMode = ref<'append' | 'replace'>('append')
const importText = ref('')

const exportDialog = ref(false)
const exportFormat = ref<'json' | 'otpauth'>('json')
const exportText = ref('')

const qrDialog = ref(false)
const qrAccount = ref<TwoFactorAccount | null>(null)

const algorithms = ['SHA1', 'SHA256', 'SHA512']
const exportFormatOptions = [
  {title: 'JSON', value: 'json'},
  {title: 'otpauth 文本', value: 'otpauth'}
]

let countdownTimer: number | null = null
let refreshTimer: number | null = null
let scanTimer: number | null = null
let mediaStream: MediaStream | null = null

function hasBarcodeDetector() {
  return 'BarcodeDetector' in window
}

const filteredAccounts = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return accounts.value
  return accounts.value.filter((item) =>
      [item.label, item.issuer, item.accountName].some((value) => value?.toLowerCase().includes(q))
  )
})

function defaultEditorForm(): TwoFactorAccountPayload {
  return {
    label: '',
    issuer: '',
    accountName: '',
    secret: '',
    digits: 6,
    period: 30,
    algorithm: 'SHA1',
    otpauthUri: ''
  }
}

async function loadAccounts(silent = false) {
  if (!checkAuth()) return
  try {
    if (!silent) loading.value = true
    const {data} = await listTwoFactorAccounts()
    accounts.value = data
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '加载 2FA 列表失败')
  } finally {
    loading.value = false
  }
}

function tickCountdown() {
  let shouldRefresh = false
  accounts.value = accounts.value.map((item) => {
    const next = Math.max(item.secondsRemaining - 1, 0)
    if (next === 0) shouldRefresh = true
    return {
      ...item,
      secondsRemaining: next
    }
  })
  if (shouldRefresh) {
    void loadAccounts(true)
  }
}

function startTimers() {
  stopTimers()
  countdownTimer = window.setInterval(tickCountdown, 1000)
  refreshTimer = window.setInterval(() => void loadAccounts(true), 15000)
}

function stopTimers() {
  if (countdownTimer) window.clearInterval(countdownTimer)
  if (refreshTimer) window.clearInterval(refreshTimer)
  countdownTimer = null
  refreshTimer = null
}

function openCreateDialog() {
  editingId.value = null
  editorTab.value = 'uri'
  editorForm.value = defaultEditorForm()
  editorDialog.value = true
}

async function openEditDialog(account: TwoFactorAccount) {
  try {
    saving.value = true
    const {data} = await getTwoFactorAccount(account.id)
    editingId.value = account.id
    editorTab.value = 'manual'
    editorForm.value = {
      label: data.label,
      issuer: data.issuer,
      accountName: data.accountName,
      secret: data.secret,
      digits: data.digits,
      period: data.period,
      algorithm: data.algorithm,
      otpauthUri: data.otpauthUri
    }
    editorDialog.value = true
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '加载详情失败')
  } finally {
    saving.value = false
  }
}

async function submitEditor() {
  const payload = buildEditorPayload()
  if (!payload) return

  try {
    saving.value = true
    if (payload.otpauthUri?.startsWith('otpauth-migration://')) {
      const {data} = await importTwoFactorAccounts({
        text: payload.otpauthUri,
        mergeMode: 'append'
      })
      showSuccess(`已导入 ${data.imported} 条令牌`)
      editorDialog.value = false
      await loadAccounts(true)
      return
    }
    if (editingId.value) {
      await updateTwoFactorAccount(editingId.value, payload)
      showSuccess('令牌已更新')
    } else {
      await createTwoFactorAccount(payload)
      showSuccess('令牌已创建')
    }
    editorDialog.value = false
    await loadAccounts(true)
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function buildEditorPayload(): TwoFactorAccountPayload | null {
  if (editorTab.value === 'uri') {
    if (!editorForm.value.otpauthUri?.trim()) {
      showWarning('请先粘贴 otpauth 链接')
      return null
    }
    return {otpauthUri: editorForm.value.otpauthUri.trim()}
  }

  if (!editorForm.value.secret?.trim()) {
    showWarning('请填写 Base32 Secret')
    return null
  }

  return {
    label: editorForm.value.label?.trim(),
    issuer: editorForm.value.issuer?.trim(),
    accountName: editorForm.value.accountName?.trim(),
    secret: editorForm.value.secret?.trim(),
    digits: editorForm.value.digits,
    period: editorForm.value.period,
    algorithm: editorForm.value.algorithm
  }
}

async function removeAccount(accountId: string) {
  try {
    await deleteTwoFactorAccount(accountId)
    accounts.value = accounts.value.filter((item) => item.id !== accountId)
    showSuccess('令牌已删除')
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '删除失败')
  }
}

async function submitImport() {
  if (!importText.value.trim()) {
    showWarning('请填写导入内容')
    return
  }
  try {
    saving.value = true
    const {data} = await importTwoFactorAccounts({
      text: importText.value,
      mergeMode: importMode.value
    })
    importDialog.value = false
    importText.value = ''
    await loadAccounts(true)
    showSuccess(`已导入 ${data.imported} 条记录`)
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '导入失败')
  } finally {
    saving.value = false
  }
}

async function openExportDialog() {
  exportDialog.value = true
  await refreshExport()
}

async function refreshExport() {
  try {
    const {data} = await exportTwoFactorAccounts(exportFormat.value)
    exportText.value = typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2)
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '导出失败')
  }
}

async function showQr(account: TwoFactorAccount) {
  try {
    const {data} = await getTwoFactorAccount(account.id)
    qrAccount.value = data
    qrDialog.value = true
  } catch (error: any) {
    showError(error.response?.data?.detail || error.message || '加载二维码失败')
  }
}

async function copyText(text: string) {
  if (!text) {
    showWarning('没有可复制的内容')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    showSuccess('已复制到剪贴板')
  } catch {
    showError('复制失败，请检查浏览器权限')
  }
}

function downloadExport() {
  if (!exportText.value) return
  const blob = new Blob([exportText.value], {type: 'text/plain;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `tool-hub-2fa-export.${exportFormat.value === 'json' ? 'json' : 'txt'}`
  link.click()
  URL.revokeObjectURL(url)
}

function formatCode(code: string) {
  if (code.length !== 6) return code
  return `${code.slice(0, 3)} ${code.slice(3)}`
}

function progressWidth(account: TwoFactorAccount) {
  const ratio = ((account.period - account.secondsRemaining) / account.period) * 100
  return `${Math.min(Math.max(ratio, 0), 100)}%`
}

function handleScanDialogChange(open: boolean) {
  if (!open) {
    stopCameraScan()
  }
}

async function startCameraScan() {
  try {
    stopCameraScan()
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {facingMode: {ideal: 'environment'}}
    })
    if (!videoRef.value) return
    videoRef.value.srcObject = mediaStream
    await videoRef.value.play()
    scanStatus.value = '摄像头已启用，正在识别二维码...'

    scanTimer = window.setInterval(async () => {
      if (!videoRef.value) return
      const decoded = await decodeQrFromVideo(videoRef.value)
      if (decoded) {
        scanText.value = decoded
        scanStatus.value = '二维码已识别，准备导入'
        stopCameraScan()
      }
    }, 700)
  } catch (error) {
    scanStatus.value = '无法访问摄像头，请检查权限'
    showError('摄像头启动失败')
  }
}

function stopCameraScan() {
  if (scanTimer) window.clearInterval(scanTimer)
  scanTimer = null
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
    mediaStream = null
  }
  if (videoRef.value) {
    videoRef.value.srcObject = null
  }
}

function pickQrImage() {
  fileInputRef.value?.click()
}

async function handleImageScan(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const image = await createImageBitmap(file)
    const decoded = await decodeQrFromImageBitmap(image)
    if (!decoded) {
      showWarning('未识别到二维码')
      return
    }
    scanText.value = decoded
    scanStatus.value = '图片识别成功'
  } catch {
    showError('图片识别失败')
  } finally {
    input.value = ''
  }
}

async function decodeQrFromVideo(video: HTMLVideoElement): Promise<string | null> {
  if (hasBarcodeDetector()) {
    try {
      const detector = new (window as any).BarcodeDetector({formats: ['qr_code']})
      const results = await detector.detect(video)
      if (results.length > 0 && results[0].rawValue) {
        return results[0].rawValue
      }
    } catch {
      // Fallback to jsQR below.
    }
  }
  return decodeQrWithJsQr(video.videoWidth, video.videoHeight, (ctx) => {
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
  })
}

async function decodeQrFromImageBitmap(image: ImageBitmap): Promise<string | null> {
  if (hasBarcodeDetector()) {
    try {
      const detector = new (window as any).BarcodeDetector({formats: ['qr_code']})
      const results = await detector.detect(image)
      if (results.length > 0 && results[0].rawValue) {
        return results[0].rawValue
      }
    } catch {
      // Fallback to jsQR below.
    }
  }
  return decodeQrWithJsQr(image.width, image.height, (ctx) => {
    ctx.drawImage(image, 0, 0, image.width, image.height)
  })
}

function decodeQrWithJsQr(
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void
): string | null {
  if (!width || !height) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', {willReadFrequently: true})
  if (!context) return null

  draw(context)
  const imageData = context.getImageData(0, 0, width, height)
  const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth'
  })
  return decoded?.data || null
}

function useScannedText() {
  if (!scanText.value.trim()) {
    showWarning('没有识别到可用内容')
    return
  }
  stopCameraScan()
  scanDialog.value = false
  editingId.value = null
  editorTab.value = 'uri'
  editorForm.value = defaultEditorForm()
  editorForm.value.otpauthUri = scanText.value.trim()
  editorDialog.value = true
}

onMounted(async () => {
  if (!checkAuth()) return
  await loadAccounts()
  startTimers()
})

watch(exportFormat, () => {
  if (exportDialog.value) {
    void refreshExport()
  }
})

onBeforeUnmount(() => {
  stopTimers()
  stopCameraScan()
})
</script>

<style scoped>
.twofa-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-card {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
  padding: 28px;
  border-radius: 28px;
  background: radial-gradient(circle at top right, rgba(255, 204, 128, 0.32), transparent 28%),
  linear-gradient(135deg, #10203f 0%, #17306a 46%, #0ea5a4 100%);
  color: #f8fafc;
}

.eyebrow {
  margin-bottom: 8px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.74);
  font-size: 0.78rem;
}

.hero-title {
  font-size: 2.4rem;
  line-height: 1.1;
  margin-bottom: 12px;
  font-weight: 800;
}

.hero-copy {
  max-width: 720px;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.75;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-content: flex-start;
  gap: 12px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card,
.toolbar-card,
.empty-card,
.account-card {
  border-radius: 22px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
}

.summary-card {
  padding: 20px 22px;
}

.summary-label {
  display: block;
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 10px;
}

.summary-value {
  font-size: 1.15rem;
  color: #0f172a;
}

.toolbar-card {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
}

.account-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}

.account-card {
  padding: 20px;
}

.account-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.account-issuer {
  color: #0f766e;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 6px;
}

.account-label {
  color: #0f172a;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
}

.account-meta {
  color: #64748b;
  margin-top: 6px;
}

.algorithm-chip {
  align-self: flex-start;
  padding: 6px 10px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #334155;
  font-size: 0.78rem;
  white-space: nowrap;
}

.code-panel {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 12px;
}

.code-value {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 2.15rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.08em;
}

.code-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.countdown {
  color: #0f766e;
  font-weight: 700;
}

.secret-mask {
  color: #94a3b8;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.82rem;
}

.progress-track {
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #e2e8f0;
}

.progress-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0f766e 0%, #f59e0b 100%);
  transition: width 0.3s ease;
}

.account-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.empty-card {
  padding: 52px 24px;
  text-align: center;
}

.empty-card h2 {
  margin-top: 14px;
  margin-bottom: 10px;
  color: #0f172a;
}

.empty-card p {
  max-width: 720px;
  margin: 0 auto;
  color: #64748b;
  line-height: 1.75;
}

.scan-grid {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 18px;
}

.scan-panel {
  padding: 16px;
  border-radius: 20px;
  background: linear-gradient(180deg, #eff6ff 0%, #ecfeff 100%);
}

.scan-video {
  width: 100%;
  min-height: 320px;
  object-fit: cover;
  border-radius: 16px;
  background: #0f172a;
}

.scan-tip {
  margin-top: 12px;
  color: #334155;
}

.qr-card {
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

@media (max-width: 960px) {
  .hero-card,
  .summary-grid,
  .scan-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .toolbar-card {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
