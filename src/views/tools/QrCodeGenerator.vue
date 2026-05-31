<template>
  <ToolPageLayout :card="false" max-width="max-w-6xl">
    <section class="qr-workspace">
      <aside class="qr-controls">
        <div class="control-group">
          <label class="field-label" for="qr-text">内容</label>
          <v-textarea
              id="qr-text"
              v-model="text"
              variant="outlined"
              density="comfortable"
              rows="6"
              auto-grow
              max-rows="10"
              hide-details
              placeholder="输入链接、文本或任意需要转换的内容"
          />
        </div>

        <div class="control-grid">
          <div class="control-group">
            <label class="field-label" for="foreground-color">前景色</label>
            <div class="color-row">
              <input id="foreground-color" v-model="foregroundColor" class="color-input" type="color">
              <v-text-field v-model="foregroundColor" density="compact" variant="outlined" hide-details/>
            </div>
          </div>
          <div class="control-group">
            <label class="field-label" for="background-color">背景色</label>
            <div class="color-row">
              <input id="background-color" v-model="backgroundColor" class="color-input" type="color">
              <v-text-field v-model="backgroundColor" density="compact" variant="outlined" hide-details/>
            </div>
          </div>
        </div>

        <div class="control-group">
          <label class="field-label">圆点样式</label>
          <v-btn-toggle v-model="dotStyle" mandatory density="comfortable" variant="outlined" divided>
            <v-btn value="square" prepend-icon="mdi-square">方块</v-btn>
            <v-btn value="rounded" prepend-icon="mdi-rounded-corner">圆角</v-btn>
            <v-btn value="dot" prepend-icon="mdi-circle">圆点</v-btn>
          </v-btn-toggle>
        </div>

        <div class="control-group">
          <label class="field-label">Logo</label>
          <v-file-input
              accept="image/*"
              clearable
              density="comfortable"
              variant="outlined"
              prepend-icon="mdi-image-plus"
              label="上传 Logo 图片"
              hide-details
              @update:model-value="handleLogoFile"
              @click:clear="clearLogo"
          />
        </div>

        <div class="control-grid">
          <div class="control-group">
            <label class="field-label">Logo 大小</label>
            <v-slider
                v-model="logoSizePercent"
                :disabled="!logoImage"
                :min="12"
                :max="28"
                :step="1"
                density="compact"
                thumb-label
                hide-details
            />
          </div>
          <div class="control-group">
            <label class="field-label">导出尺寸</label>
            <v-select
                v-model="exportSize"
                :items="exportSizes"
                density="compact"
                variant="outlined"
                hide-details
            />
          </div>
        </div>

        <div v-if="errorMessage" class="error-text">{{ errorMessage }}</div>

        <div class="action-row">
          <v-btn color="primary" variant="flat" prepend-icon="mdi-qrcode" @click="handleGenerate">
            生成
          </v-btn>
          <v-btn :disabled="!qrValue" color="success" variant="tonal" prepend-icon="mdi-download"
                 @click="downloadQrCode">
            下载 PNG
          </v-btn>
        </div>
      </aside>

      <main class="qr-preview">
        <div class="preview-toolbar">
          <div>
            <h1>二维码美化器</h1>
            <p>支持 Logo、颜色和模块样式，适合分享链接、活动入口和个人名片。</p>
          </div>
          <v-btn icon="mdi-refresh" variant="text" :disabled="!qrValue" @click="renderQrCode"/>
        </div>

        <div class="canvas-shell">
          <canvas ref="canvasRef" class="qr-canvas" :width="exportSize" :height="exportSize"/>
          <div v-if="!qrValue" class="canvas-empty">
            <v-icon icon="mdi-qrcode" size="56"/>
            <span>输入内容后生成二维码</span>
          </div>
        </div>

        <p v-if="qrValue" class="qr-value">{{ qrValue }}</p>
      </main>
    </section>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import {nextTick, onBeforeUnmount, ref, watch} from 'vue'
import ToolPageLayout from '@/components/ToolPageLayout.vue'
// @ts-ignore qrcode is provided by @chenfengyuan/vue-qrcode's peer dependency.
import QRCode from 'qrcode'

type DotStyle = 'square' | 'rounded' | 'dot'

interface QrModules {
  size: number
  data: Uint8Array
}

interface QrData {
  modules: QrModules
}

const text = ref('')
const qrValue = ref('')
const foregroundColor = ref('#111827')
const backgroundColor = ref('#ffffff')
const dotStyle = ref<DotStyle>('rounded')
const logoImage = ref<HTMLImageElement | null>(null)
const logoObjectUrl = ref<string | null>(null)
const logoSizePercent = ref(20)
const exportSize = ref(720)
const errorMessage = ref('')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const exportSizes = [360, 512, 720, 1024]

function handleGenerate() {
  qrValue.value = text.value.trim()
  if (!qrValue.value) {
    errorMessage.value = '请输入二维码内容'
    clearCanvas()
    return
  }
  renderQrCode()
}

function handleLogoFile(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] : value
  if (!file) {
    clearLogo()
    return
  }

  clearLogo(false)
  const image = new Image()
  const objectUrl = URL.createObjectURL(file)
  image.onload = () => {
    logoImage.value = image
    logoObjectUrl.value = objectUrl
    renderQrCode()
  }
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    errorMessage.value = 'Logo 图片读取失败'
  }
  image.src = objectUrl
}

function clearLogo(render = true) {
  logoImage.value = null
  if (logoObjectUrl.value) {
    URL.revokeObjectURL(logoObjectUrl.value)
    logoObjectUrl.value = null
  }
  if (render) renderQrCode()
}

function getModule(modules: QrModules, row: number, col: number) {
  return modules.data[row * modules.size + col] === 1
}

function isFinderModule(size: number, row: number, col: number) {
  const inTop = row < 7
  const inBottom = row >= size - 7
  const inLeft = col < 7
  const inRight = col >= size - 7
  return (inTop && inLeft) || (inTop && inRight) || (inBottom && inLeft)
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + safeRadius, y)
  ctx.lineTo(x + width - safeRadius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  ctx.lineTo(x + width, y + height - safeRadius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  ctx.lineTo(x + safeRadius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  ctx.lineTo(x, y + safeRadius)
  ctx.quadraticCurveTo(x, y, x + safeRadius, y)
  ctx.closePath()
}

function drawModule(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const inset = dotStyle.value === 'square' ? 0 : size * 0.08
  const moduleSize = size - inset * 2
  const moduleX = x + inset
  const moduleY = y + inset

  if (dotStyle.value === 'dot') {
    ctx.beginPath()
    ctx.arc(moduleX + moduleSize / 2, moduleY + moduleSize / 2, moduleSize / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  if (dotStyle.value === 'rounded') {
    roundedRect(ctx, moduleX, moduleY, moduleSize, moduleSize, moduleSize * 0.35)
    ctx.fill()
    return
  }

  ctx.fillRect(moduleX, moduleY, moduleSize, moduleSize)
}

function drawFinder(ctx: CanvasRenderingContext2D, x: number, y: number, moduleSize: number) {
  const outer = moduleSize * 7
  const inner = moduleSize * 3
  const middle = moduleSize * 5

  ctx.fillStyle = foregroundColor.value
  roundedRect(ctx, x, y, outer, outer, moduleSize * 1.4)
  ctx.fill()

  ctx.fillStyle = backgroundColor.value
  roundedRect(ctx, x + moduleSize, y + moduleSize, middle, middle, moduleSize)
  ctx.fill()

  ctx.fillStyle = foregroundColor.value
  roundedRect(ctx, x + moduleSize * 2, y + moduleSize * 2, inner, inner, moduleSize * 0.7)
  ctx.fill()
}

function drawLogo(ctx: CanvasRenderingContext2D, canvasSize: number) {
  if (!logoImage.value) return

  const logoSize = canvasSize * (logoSizePercent.value / 100)
  const x = (canvasSize - logoSize) / 2
  const y = (canvasSize - logoSize) / 2
  const padding = logoSize * 0.14
  const backgroundSize = logoSize + padding * 2
  const backgroundX = x - padding
  const backgroundY = y - padding

  ctx.fillStyle = '#ffffff'
  roundedRect(ctx, backgroundX, backgroundY, backgroundSize, backgroundSize, logoSize * 0.18)
  ctx.fill()

  ctx.save()
  roundedRect(ctx, x, y, logoSize, logoSize, logoSize * 0.14)
  ctx.clip()
  ctx.drawImage(logoImage.value, x, y, logoSize, logoSize)
  ctx.restore()
}

function clearCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

async function renderQrCode() {
  await nextTick()
  const canvas = canvasRef.value
  if (!canvas || !qrValue.value) return

  try {
    errorMessage.value = ''
    const qrData = QRCode.create(qrValue.value, {
      errorCorrectionLevel: logoImage.value ? 'H' : 'Q',
      margin: 0
    }) as QrData
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const canvasSize = exportSize.value
    const margin = 4
    const moduleCount = qrData.modules.size
    const moduleSize = canvasSize / (moduleCount + margin * 2)
    const offset = margin * moduleSize

    ctx.clearRect(0, 0, canvasSize, canvasSize)
    ctx.fillStyle = backgroundColor.value
    ctx.fillRect(0, 0, canvasSize, canvasSize)
    ctx.fillStyle = foregroundColor.value

    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        if (!getModule(qrData.modules, row, col) || isFinderModule(moduleCount, row, col)) continue
        drawModule(ctx, offset + col * moduleSize, offset + row * moduleSize, moduleSize)
      }
    }

    drawFinder(ctx, offset, offset, moduleSize)
    drawFinder(ctx, offset + (moduleCount - 7) * moduleSize, offset, moduleSize)
    drawFinder(ctx, offset, offset + (moduleCount - 7) * moduleSize, moduleSize)
    drawLogo(ctx, canvasSize)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '二维码生成失败'
  }
}

function downloadQrCode() {
  const canvas = canvasRef.value
  if (!canvas || !qrValue.value) return

  const dataUrl = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = 'styled-qrcode.png'
  link.click()
}

watch([foregroundColor, backgroundColor, dotStyle, logoSizePercent, exportSize], () => {
  if (qrValue.value) renderQrCode()
})

onBeforeUnmount(() => clearLogo(false))
</script>

<style scoped>
.qr-page {
  padding: 24px;
  color: var(--color-text);
}

.qr-workspace {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 24px;
  max-width: 1180px;
  margin: 0 auto;
}

.qr-controls,
.qr-preview {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.qr-controls {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
}

.qr-preview {
  min-height: 640px;
  padding: 24px;
}

.preview-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.preview-toolbar h1 {
  margin: 0 0 6px;
  color: var(--color-text);
  font-size: 28px;
  line-height: 1.2;
}

.preview-toolbar p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field-label {
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
}

.color-row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.color-input {
  width: 48px;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 3px;
  background: var(--color-surface);
}

.action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.canvas-shell {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 460px;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  background: linear-gradient(45deg, var(--color-bg) 25%, transparent 25%),
  linear-gradient(-45deg, var(--color-bg) 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, var(--color-bg) 75%),
  linear-gradient(-45deg, transparent 75%, var(--color-bg) 75%);
  background-size: 24px 24px;
  background-position: 0 0, 0 12px, 12px -12px, -12px 0;
}

.qr-canvas {
  width: min(420px, 100%);
  height: auto;
  border-radius: 8px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.14);
}

.canvas-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: var(--color-text-subtle);
  background: rgba(246, 248, 251, 0.82);
  font-size: 15px;
}

.qr-value {
  margin: 18px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.error-text {
  color: var(--color-error);
  font-size: 13px;
}

@media (max-width: 900px) {
  .qr-page {
    padding: 16px;
  }

  .qr-workspace {
    grid-template-columns: 1fr;
  }

  .qr-preview {
    min-height: auto;
  }
}

@media (max-width: 560px) {
  .control-grid,
  .action-row {
    grid-template-columns: 1fr;
  }

  .canvas-shell {
    min-height: 360px;
  }
}
</style>
