<template>
    <div class="particle-lab">
      <section class="lab-controls solid-card" aria-label="粒子实验控制台">
        <div class="control-block mode-control">
          <span class="control-label">场景</span>
          <v-btn-toggle
            v-model="activeMode"
            mandatory
            color="primary"
            density="comfortable"
            rounded="lg"
          >
            <v-btn
              v-for="mode in modes"
              :key="mode.value"
              :value="mode.value"
              :prepend-icon="mode.icon"
            >
              {{ mode.label }}
            </v-btn>
          </v-btn-toggle>
        </div>

        <div class="control-block count-control">
          <v-select
            v-model="particleCount"
            :items="particleCountOptions"
            label="粒子数量"
            density="compact"
            variant="outlined"
            hide-details
            :disabled="isBuilding"
          />
        </div>

        <div class="control-block speed-control">
          <div class="control-label-row">
            <span class="control-label">模拟速度</span>
            <span class="control-value">{{ speed.toFixed(1) }}×</span>
          </div>
          <v-slider
            v-model="speed"
            :min="0.2"
            :max="2"
            :step="0.1"
            color="primary"
            density="compact"
            hide-details
          />
        </div>

        <div class="control-actions">
          <v-btn
            :prepend-icon="isPaused ? 'mdi-play' : 'mdi-pause'"
            :color="isPaused ? 'success' : 'primary'"
            variant="tonal"
            :disabled="isBuilding || !!initError"
            @click="togglePause"
          >
            {{ isPaused ? '继续' : '暂停' }}
          </v-btn>
          <v-btn
            prepend-icon="mdi-refresh"
            variant="outlined"
            :disabled="isBuilding || !!initError"
            @click="resetSimulation"
          >
            重置
          </v-btn>
        </div>
      </section>

      <section
        ref="stageRef"
        class="lab-stage"
        data-testid="particle-stage"
        :aria-busy="isBuilding"
        @pointermove="handlePointerMove"
        @pointerdown="handlePointerDown"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerUp"
        @pointerleave="handlePointerLeave"
      >
        <div class="stats-panel" aria-label="实时性能统计">
          <div class="stat-item">
            <span>FPS</span>
            <strong :class="fpsToneClass">{{ displayedFps }}</strong>
          </div>
          <div class="stat-item">
            <span>帧耗时</span>
            <strong>{{ frameTime.toFixed(1) }} ms</strong>
          </div>
          <div class="stat-item">
            <span>粒子</span>
            <strong>{{ formattedParticleCount }}</strong>
          </div>
          <div class="stat-item">
            <span>渲染器</span>
            <strong>{{ rendererName }}</strong>
          </div>
        </div>

        <div
          v-if="activeMode === 'gravity'"
          class="gravity-core"
          :class="{ 'gravity-core--repulse': pointer.isDown }"
          :style="gravityCoreStyle"
          aria-hidden="true"
        />

        <div v-if="isBuilding" class="stage-message" role="status">
          <v-progress-circular
            :model-value="buildProgress"
            :size="72"
            :width="7"
            color="info"
          >
            {{ Math.round(buildProgress) }}%
          </v-progress-circular>
          <strong>正在装载 {{ formatParticleCount(particleCount) }} 个粒子</strong>
        </div>

        <div v-else-if="initError" class="stage-message stage-message--error" role="alert">
          <v-icon icon="mdi-alert-circle-outline" size="48" color="error" />
          <strong>GPU 渲染器初始化失败</strong>
          <span>{{ initError }}</span>
          <v-btn color="primary" variant="tonal" @click="initializePixi">重试</v-btn>
        </div>

        <div v-else-if="isPaused" class="stage-message stage-message--compact" role="status">
          <v-icon icon="mdi-pause-circle-outline" size="52" />
          <strong>模拟已暂停</strong>
        </div>

      </section>
    </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue'
import {
  Application,
  Color,
  Particle,
  ParticleContainer,
  Rectangle,
  RendererType,
  Texture,
  type Ticker
} from 'pixi.js'

type LabMode = 'starfield' | 'fireworks' | 'gravity'

interface ModeDefinition {
  value: LabMode
  label: string
  icon: string
}

interface SimulationBuffers {
  particles: Particle[]
  velocityX: Float32Array
  velocityY: Float32Array
  auxA: Float32Array
  auxB: Float32Array
}

const modes: ModeDefinition[] = [
  {
    value: 'starfield',
    label: '深空穿越',
    icon: 'mdi-creation-outline'
  },
  {
    value: 'fireworks',
    label: '烟花矩阵',
    icon: 'mdi-firework'
  },
  {
    value: 'gravity',
    label: '引力漩涡',
    icon: 'mdi-orbit'
  }
]

const particleCountOptions = [
  {title: '10K', value: 10_000},
  {title: '25K', value: 25_000},
  {title: '50K', value: 50_000},
  {title: '100K', value: 100_000}
]

const FIREWORK_GROUP_SIZE = 220
const PARTICLE_TEXTURE_SIZE = 32

const stageRef = ref<HTMLElement | null>(null)
const activeMode = ref<LabMode>('starfield')
const particleCount = ref(10_000)
const speed = ref(1)
const isPaused = ref(false)
const isBuilding = ref(false)
const buildProgress = ref(0)
const initError = ref('')
const displayedFps = ref(0)
const frameTime = ref(0)
const rendererName = ref('初始化中')

const pointer = reactive({
  x: 0,
  y: 0,
  isActive: false,
  isDown: false
})

const emptyBuffers = (): SimulationBuffers => ({
  particles: [],
  velocityX: new Float32Array(0),
  velocityY: new Float32Array(0),
  auxA: new Float32Array(0),
  auxB: new Float32Array(0)
})

let pixiApp: Application | null = null
let particleLayer: ParticleContainer<Particle> | null = null
let particleTexture: Texture | null = null
let buffers = emptyBuffers()
let buildGeneration = 0
let isUnmounted = false
let lastStatsUpdate = 0
let pointerIdleSeconds = 0
let burstCursor = 0
let palette: number[] = []

const formattedParticleCount = computed(() => {
  const currentCount = formatParticleCount(buffers.particles.length || particleCount.value)
  return isBuilding.value ? `${currentCount} → ${formatParticleCount(particleCount.value)}` : currentCount
})
const fpsToneClass = computed(() => ({
  'stat-value--good': displayedFps.value >= 55,
  'stat-value--fair': displayedFps.value >= 40 && displayedFps.value < 55,
  'stat-value--hot': displayedFps.value > 0 && displayedFps.value < 40
}))
const gravityCoreStyle = computed(() => {
  const width = pixiApp?.screen.width || 1
  const height = pixiApp?.screen.height || 1
  return {
    left: `${Math.min(100, Math.max(0, pointer.x / width * 100))}%`,
    top: `${Math.min(100, Math.max(0, pointer.y / height * 100))}%`
  }
})

function formatParticleCount(value: number) {
  if (value >= 1000) {
    const amount = value / 1000
    return `${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1)}K`
  }
  return String(value)
}

function readPalette() {
  const styles = getComputedStyle(document.documentElement)
  const variables = [
    '--color-primary',
    '--color-info',
    '--color-success',
    '--color-warning',
    '--color-error',
    '--color-primary-light',
    '--color-surface'
  ]
  palette = variables.map(variable => {
    const value = styles.getPropertyValue(variable).trim()
    return new Color(value).toNumber()
  })
}

function createParticleTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = PARTICLE_TEXTURE_SIZE
  canvas.height = PARTICLE_TEXTURE_SIZE
  const context = canvas.getContext('2d')
  if (!context) return Texture.WHITE

  const center = PARTICLE_TEXTURE_SIZE / 2
  const gradient = context.createRadialGradient(center, center, 0, center, center, center)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.95)')
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.46)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, PARTICLE_TEXTURE_SIZE, PARTICLE_TEXTURE_SIZE)
  return Texture.from(canvas)
}

function rendererLabel(type: RendererType) {
  if (type === RendererType.WEBGPU) return 'WebGPU'
  if (type === RendererType.WEBGL) return 'WebGL 2'
  if (type === RendererType.CANVAS) return 'Canvas'
  return 'GPU'
}

function createBuffers(count: number): SimulationBuffers {
  return {
    particles: new Array<Particle>(count),
    velocityX: new Float32Array(count),
    velocityY: new Float32Array(count),
    auxA: new Float32Array(count),
    auxB: new Float32Array(count)
  }
}

function viewportSize() {
  return {
    width: Math.max(1, pixiApp?.screen.width || stageRef.value?.clientWidth || 1),
    height: Math.max(1, pixiApp?.screen.height || stageRef.value?.clientHeight || 1)
  }
}

function randomPaletteColor(index: number) {
  return palette[index % palette.length]
}

function initializeParticle(target: SimulationBuffers, index: number, mode: LabMode, origin?: {x: number, y: number}) {
  const particle = target.particles[index]
  const {width, height} = viewportSize()

  particle.alpha = 0.7 + Math.random() * 0.3
  particle.tint = randomPaletteColor(index + Math.floor(Math.random() * palette.length))

  if (mode === 'starfield') {
    target.velocityX[index] = (Math.random() - 0.5) * 1.8
    target.velocityY[index] = (Math.random() - 0.5) * 1.8
    target.auxA[index] = 0.04 + Math.random() * 0.96
    target.auxB[index] = 0.055 + Math.random() * 0.11
    particle.scaleX = target.auxB[index]
    particle.scaleY = target.auxB[index]
    projectStar(target, index, width, height)
    return
  }

  if (mode === 'fireworks') {
    particle.x = origin?.x ?? width / 2
    particle.y = origin?.y ?? height / 2
    particle.alpha = 0
    particle.scaleX = 0.075
    particle.scaleY = 0.075
    target.velocityX[index] = 0
    target.velocityY[index] = 0
    target.auxA[index] = 0
    target.auxB[index] = 1
    return
  }

  const centerX = origin?.x ?? width / 2
  const centerY = origin?.y ?? height / 2
  const angle = Math.random() * Math.PI * 2
  const radius = Math.sqrt(Math.random()) * Math.min(width, height) * 0.48 + 24
  const orbitalSpeed = 18 + Math.random() * 55
  particle.x = centerX + Math.cos(angle) * radius
  particle.y = centerY + Math.sin(angle) * radius
  particle.scaleX = 0.065 + Math.random() * 0.1
  particle.scaleY = particle.scaleX
  target.velocityX[index] = -Math.sin(angle) * orbitalSpeed
  target.velocityY[index] = Math.cos(angle) * orbitalSpeed
  target.auxA[index] = 0
  target.auxB[index] = 0
}

function projectStar(target: SimulationBuffers, index: number, width: number, height: number) {
  const particle = target.particles[index]
  const depth = Math.max(0.025, target.auxA[index])
  const perspective = Math.min(width, height) * 0.42 / depth
  const parallaxX = pointer.isActive ? (pointer.x - width / 2) * (1 - depth) * 0.18 : 0
  const parallaxY = pointer.isActive ? (pointer.y - height / 2) * (1 - depth) * 0.18 : 0
  particle.x = width / 2 + target.velocityX[index] * perspective - parallaxX
  particle.y = height / 2 + target.velocityY[index] * perspective - parallaxY
}

function resetStar(target: SimulationBuffers, index: number) {
  target.velocityX[index] = (Math.random() - 0.5) * 1.7
  target.velocityY[index] = (Math.random() - 0.5) * 1.7
  target.auxA[index] = 0.92 + Math.random() * 0.08
}

function resetFireworkGroup(
  target: SimulationBuffers,
  startIndex: number,
  origin?: {x: number, y: number},
  delay = 0
) {
  const {width, height} = viewportSize()
  const centerX = origin?.x ?? width * (0.16 + Math.random() * 0.68)
  const centerY = origin?.y ?? height * (0.15 + Math.random() * 0.55)
  const groupEnd = Math.min(target.particles.length, startIndex + FIREWORK_GROUP_SIZE)
  const groupSize = groupEnd - startIndex
  const lifetime = 1.35 + Math.random() * 1.05
  const colorOffset = Math.floor(Math.random() * palette.length)
  const petalCount = 4 + Math.floor(Math.random() * 5)

  for (let index = startIndex; index < groupEnd; index += 1) {
    const offset = index - startIndex
    const baseAngle = offset / Math.max(1, groupSize) * Math.PI * 2
    const angle = baseAngle + (Math.random() - 0.5) * 0.07
    const petalWave = 0.68 + Math.abs(Math.sin(baseAngle * petalCount)) * 0.42
    const velocity = (95 + Math.pow(Math.random(), 0.34) * 220) * petalWave
    const particle = target.particles[index]

    particle.x = centerX
    particle.y = centerY
    particle.alpha = delay > 0 ? 0 : 1
    particle.tint = randomPaletteColor(colorOffset + Math.floor(offset / 44))
    particle.scaleX = 0.07 + Math.random() * 0.12
    particle.scaleY = particle.scaleX
    target.velocityX[index] = Math.cos(angle) * velocity
    target.velocityY[index] = Math.sin(angle) * velocity
    target.auxA[index] = -delay
    target.auxB[index] = lifetime
  }
}

function resetFireworkSystem(target: SimulationBuffers) {
  const groupCount = Math.ceil(target.particles.length / FIREWORK_GROUP_SIZE)
  const cycleWindow = Math.min(6, Math.max(3.2, groupCount * 0.08))
  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    resetFireworkGroup(
      target,
      groupIndex * FIREWORK_GROUP_SIZE,
      undefined,
      groupIndex / Math.max(1, groupCount) * cycleWindow
    )
  }
}

function resetAllParticles(mode = activeMode.value) {
  if (mode === 'fireworks') {
    resetFireworkSystem(buffers)
    particleLayer?.update()
    return
  }

  for (let index = 0; index < buffers.particles.length; index += 1) {
    initializeParticle(buffers, index, mode)
  }
  particleLayer?.update()
}

async function rebuildParticles() {
  if (!pixiApp || !palette.length || !particleTexture) return

  const generation = ++buildGeneration
  const count = particleCount.value
  const nextBuffers = createBuffers(count)
  const nextLayer = new ParticleContainer<Particle>({
    texture: particleTexture,
    boundsArea: new Rectangle(0, 0, pixiApp.screen.width, pixiApp.screen.height),
    dynamicProperties: {
      position: true,
      color: true,
      rotation: false,
      vertex: false,
      uvs: false
    }
  })

  nextLayer.blendMode = 'add'
  isBuilding.value = true
  buildProgress.value = 0
  pixiApp.stop()

  const chunkSize = 5000
  for (let chunkStart = 0; chunkStart < count; chunkStart += chunkSize) {
    const chunkEnd = Math.min(count, chunkStart + chunkSize)
    for (let index = chunkStart; index < chunkEnd; index += 1) {
      const particle = new Particle({
        texture: particleTexture,
        anchorX: 0.5,
        anchorY: 0.5
      })
      nextBuffers.particles[index] = particle
      initializeParticle(nextBuffers, index, activeMode.value)
      nextLayer.particleChildren.push(particle)
    }

    buildProgress.value = chunkEnd / count * 100
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

    if (generation !== buildGeneration || isUnmounted) {
      nextLayer.destroy()
      return
    }
  }

  if (activeMode.value === 'fireworks') {
    resetFireworkSystem(nextBuffers)
  }
  nextLayer.update()
  if (particleLayer) {
    pixiApp.stage.removeChild(particleLayer)
    particleLayer.destroy()
  }
  particleLayer = nextLayer
  buffers = nextBuffers
  pixiApp.stage.addChild(nextLayer)
  isBuilding.value = false
  buildProgress.value = 100

  if (!isPaused.value && !document.hidden) {
    pixiApp.start()
  }
}

function updateStarfield(deltaSeconds: number) {
  const {width, height} = viewportSize()
  const margin = 48

  for (let index = 0; index < buffers.particles.length; index += 1) {
    buffers.auxA[index] -= deltaSeconds * 0.22 * speed.value
    if (buffers.auxA[index] <= 0.025) {
      resetStar(buffers, index)
    }
    projectStar(buffers, index, width, height)
    const particle = buffers.particles[index]
    if (particle.x < -margin || particle.x > width + margin || particle.y < -margin || particle.y > height + margin) {
      resetStar(buffers, index)
    }
  }
}

function updateFireworks(deltaSeconds: number) {
  const {width, height} = viewportSize()
  const gravity = 86
  const scaledDelta = deltaSeconds * speed.value

  for (let index = 0; index < buffers.particles.length; index += 1) {
    const particle = buffers.particles[index]
    if (index % FIREWORK_GROUP_SIZE === 0 && buffers.auxA[index] >= buffers.auxB[index]) {
      resetFireworkGroup(buffers, index, undefined, 0.15 + Math.random() * 2.2)
    }

    buffers.auxA[index] += scaledDelta
    if (buffers.auxA[index] < 0) {
      particle.alpha = 0
      continue
    }

    buffers.velocityY[index] += gravity * scaledDelta
    buffers.velocityX[index] *= 0.997
    particle.x += buffers.velocityX[index] * scaledDelta
    particle.y += buffers.velocityY[index] * scaledDelta
    const progress = Math.min(1, buffers.auxA[index] / buffers.auxB[index])
    const envelope = Math.sin(progress * Math.PI)
    particle.alpha = Math.max(0, Math.pow(envelope, 0.55))

    if (particle.y > height + 60 || particle.x < -60 || particle.x > width + 60) {
      particle.alpha = 0
    }
  }
}

function updateGravity(deltaSeconds: number) {
  const {width, height} = viewportSize()
  const scaledDelta = deltaSeconds * speed.value
  const time = performance.now() * 0.00022
  const attractorX = pointer.isActive ? pointer.x : width / 2 + Math.cos(time) * width * 0.13
  const attractorY = pointer.isActive ? pointer.y : height / 2 + Math.sin(time * 1.4) * height * 0.13
  const direction = pointer.isDown ? -1 : 1

  if (!pointer.isActive) {
    pointer.x = attractorX
    pointer.y = attractorY
  }

  for (let index = 0; index < buffers.particles.length; index += 1) {
    const particle = buffers.particles[index]
    const dx = attractorX - particle.x
    const dy = attractorY - particle.y
    const distanceSquared = dx * dx + dy * dy + 180
    const inverseDistance = 1 / Math.sqrt(distanceSquared)
    const acceleration = direction * 24_000 / distanceSquared
    const tangent = 7_500 / distanceSquared

    buffers.velocityX[index] += (dx * inverseDistance * acceleration - dy * inverseDistance * tangent) * scaledDelta
    buffers.velocityY[index] += (dy * inverseDistance * acceleration + dx * inverseDistance * tangent) * scaledDelta
    buffers.velocityX[index] *= 0.9992
    buffers.velocityY[index] *= 0.9992

    const velocitySquared = buffers.velocityX[index] ** 2 + buffers.velocityY[index] ** 2
    if (velocitySquared > 160_000) {
      const limiter = 400 / Math.sqrt(velocitySquared)
      buffers.velocityX[index] *= limiter
      buffers.velocityY[index] *= limiter
    }

    particle.x += buffers.velocityX[index] * scaledDelta
    particle.y += buffers.velocityY[index] * scaledDelta

    if (particle.x < -24) particle.x = width + 24
    else if (particle.x > width + 24) particle.x = -24
    if (particle.y < -24) particle.y = height + 24
    else if (particle.y > height + 24) particle.y = -24
  }
}

function updateSimulation(ticker: Ticker) {
  if (isBuilding.value || !buffers.particles.length) return

  const deltaSeconds = Math.min(0.034, ticker.deltaMS / 1000)
  if (activeMode.value === 'starfield') updateStarfield(deltaSeconds)
  else if (activeMode.value === 'fireworks') updateFireworks(deltaSeconds)
  else updateGravity(deltaSeconds)

  pointerIdleSeconds += deltaSeconds
  if (pointerIdleSeconds > 2.5 && activeMode.value !== 'gravity') {
    pointer.isActive = false
  }

  const now = performance.now()
  if (now - lastStatsUpdate >= 250) {
    displayedFps.value = Math.round(ticker.FPS)
    frameTime.value = ticker.FPS > 0 ? 1000 / ticker.FPS : ticker.deltaMS
    lastStatsUpdate = now
  }
}

function eventPosition(event: PointerEvent) {
  const canvas = pixiApp?.canvas
  if (!canvas || !pixiApp) return null
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  return {
    x: (event.clientX - rect.left) / rect.width * pixiApp.screen.width,
    y: (event.clientY - rect.top) / rect.height * pixiApp.screen.height
  }
}

function updatePointer(event: PointerEvent) {
  const position = eventPosition(event)
  if (!position) return null
  pointer.x = position.x
  pointer.y = position.y
  pointer.isActive = true
  pointerIdleSeconds = 0
  return position
}

function handlePointerMove(event: PointerEvent) {
  updatePointer(event)
}

function handlePointerDown(event: PointerEvent) {
  const position = updatePointer(event)
  if (!position) return
  pointer.isDown = true
  stageRef.value?.setPointerCapture?.(event.pointerId)

  if (activeMode.value === 'fireworks' && buffers.particles.length) {
    const groupCount = Math.min(6, Math.max(2, Math.floor(buffers.particles.length / 10_000) + 2))
    for (let groupOffset = 0; groupOffset < groupCount; groupOffset += 1) {
      const startIndex = (burstCursor + groupOffset * FIREWORK_GROUP_SIZE) % buffers.particles.length
      resetFireworkGroup(buffers, startIndex, position, groupOffset * 0.045)
    }
    burstCursor = (burstCursor + groupCount * FIREWORK_GROUP_SIZE) % buffers.particles.length
  }
}

function handlePointerUp(event: PointerEvent) {
  pointer.isDown = false
  if (stageRef.value?.hasPointerCapture?.(event.pointerId)) {
    stageRef.value.releasePointerCapture(event.pointerId)
  }
}

function handlePointerLeave() {
  pointer.isDown = false
  if (activeMode.value !== 'gravity') pointer.isActive = false
}

function togglePause() {
  if (!pixiApp) return
  isPaused.value = !isPaused.value
  if (isPaused.value) pixiApp.stop()
  else if (!isBuilding.value) pixiApp.start()
}

function resetSimulation() {
  if (!particleLayer || isBuilding.value) return
  resetAllParticles()
}

function handleVisibilityChange() {
  if (!pixiApp || isBuilding.value) return
  if (document.hidden) pixiApp.stop()
  else if (!isPaused.value) pixiApp.start()
}

async function initializePixi() {
  if (!stageRef.value || pixiApp) return
  initError.value = ''
  await nextTick()

  const app = new Application()
  try {
    await app.init({
      resizeTo: stageRef.value,
      preference: 'webgl',
      preferWebGLVersion: 2,
      powerPreference: 'high-performance',
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 1.5),
      backgroundAlpha: 0,
      sharedTicker: false
    })

    if (isUnmounted) {
      app.destroy({removeView: true})
      return
    }

    pixiApp = app
    particleTexture = createParticleTexture()
    app.canvas.className = 'particle-canvas'
    app.canvas.setAttribute('role', 'img')
    app.canvas.setAttribute('aria-label', 'PixiJS GPU 粒子模拟画布')
    stageRef.value.appendChild(app.canvas)
    rendererName.value = rendererLabel(app.renderer.type)
    pointer.x = app.screen.width / 2
    pointer.y = app.screen.height / 2
    app.ticker.maxFPS = 60
    app.ticker.add(updateSimulation)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    await rebuildParticles()
  } catch (error) {
    app.destroy({removeView: true})
    pixiApp = null
    isBuilding.value = false
    initError.value = error instanceof Error ? error.message : '当前浏览器无法创建 WebGL 渲染上下文。'
  }
}

watch(particleCount, () => {
  if (pixiApp) void rebuildParticles()
})

watch(activeMode, () => {
  pointer.isDown = false
  pointer.isActive = false
  if (isBuilding.value) {
    void rebuildParticles()
  } else {
    resetAllParticles()
  }
})

onMounted(() => {
  readPalette()
  void initializePixi()
})

onBeforeUnmount(() => {
  isUnmounted = true
  buildGeneration += 1
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (pixiApp) {
    pixiApp.ticker.remove(updateSimulation)
    pixiApp.destroy({removeView: true}, {children: true})
  }
  particleTexture?.destroy(true)
  pixiApp = null
  particleLayer = null
  particleTexture = null
  buffers = emptyBuffers()
})
</script>

<style scoped>
.particle-lab {
  display: grid;
  gap: 14px;
}

.lab-controls {
  display: grid;
  grid-template-columns: minmax(330px, auto) minmax(150px, 190px) minmax(180px, 1fr) auto;
  align-items: end;
  gap: 18px;
  padding: 16px;
  border-radius: var(--radius-element);
}

.control-block {
  min-width: 0;
}

.control-label,
.control-value {
  display: block;
  margin-bottom: 7px;
  color: var(--color-text-muted);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.control-label-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.control-value {
  color: var(--color-primary);
}

.mode-control :deep(.v-btn) {
  text-transform: none;
}

.speed-control :deep(.v-slider) {
  margin-inline: 0;
}

.control-actions {
  display: flex;
  gap: 8px;
}

.lab-stage {
  position: relative;
  isolation: isolate;
  height: clamp(480px, 66vh, 720px);
  min-height: 480px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-primary) 26%, var(--color-border));
  border-radius: var(--radius-card);
  background:
    radial-gradient(circle at 50% 46%, color-mix(in srgb, var(--color-primary) 24%, transparent), transparent 42%),
    radial-gradient(circle at 16% 18%, color-mix(in srgb, var(--color-info) 18%, transparent), transparent 30%),
    linear-gradient(145deg, color-mix(in srgb, var(--color-text) 96%, var(--color-primary)), var(--color-text));
  box-shadow: var(--shadow-card);
  cursor: crosshair;
  touch-action: none;
  user-select: none;
}

.lab-stage :deep(.particle-canvas) {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.stats-panel {
  position: absolute;
  z-index: 3;
  top: 14px;
  left: 14px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  max-width: calc(100% - 28px);
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--color-surface) 18%, transparent);
  border-radius: var(--radius-element);
  background: color-mix(in srgb, var(--color-text) 74%, transparent);
  color: var(--color-surface);
  backdrop-filter: blur(12px);
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 2px 7px;
  white-space: nowrap;
}

.stat-item span {
  color: color-mix(in srgb, var(--color-surface) 68%, transparent);
  font-size: 0.7rem;
  text-transform: uppercase;
}

.stat-item strong {
  color: var(--color-surface);
  font-size: 0.86rem;
  font-variant-numeric: tabular-nums;
}

.stat-item .stat-value--good {
  color: color-mix(in srgb, var(--color-success) 48%, var(--color-surface));
}

.stat-item .stat-value--fair {
  color: color-mix(in srgb, var(--color-warning) 52%, var(--color-surface));
}

.stat-item .stat-value--hot {
  color: color-mix(in srgb, var(--color-error) 48%, var(--color-surface));
}

.stage-message {
  position: absolute;
  z-index: 4;
  top: 50%;
  left: 50%;
  display: flex;
  width: min(360px, calc(100% - 40px));
  padding: 26px;
  align-items: center;
  flex-direction: column;
  gap: 12px;
  transform: translate(-50%, -50%);
  border: 1px solid color-mix(in srgb, var(--color-surface) 20%, transparent);
  border-radius: var(--radius-card);
  background: color-mix(in srgb, var(--color-text) 82%, transparent);
  color: var(--color-surface);
  text-align: center;
  backdrop-filter: blur(16px);
}

.stage-message span {
  color: color-mix(in srgb, var(--color-surface) 70%, transparent);
  font-size: 0.86rem;
}

.stage-message--error strong {
  color: color-mix(in srgb, var(--color-error) 52%, var(--color-surface));
}

.stage-message--compact {
  width: auto;
  padding: 20px 26px;
}

.gravity-core {
  position: absolute;
  z-index: 2;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
  border: 2px solid color-mix(in srgb, var(--color-info) 66%, var(--color-surface));
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-primary) 60%, transparent);
  box-shadow:
    0 0 22px color-mix(in srgb, var(--color-info) 82%, transparent),
    0 0 54px color-mix(in srgb, var(--color-primary) 54%, transparent);
  pointer-events: none;
  transition: border-color 0.16s ease, background 0.16s ease;
}

.gravity-core--repulse {
  border-color: color-mix(in srgb, var(--color-error) 70%, var(--color-surface));
  background: color-mix(in srgb, var(--color-error) 60%, transparent);
  box-shadow:
    0 0 24px color-mix(in srgb, var(--color-error) 78%, transparent),
    0 0 58px color-mix(in srgb, var(--color-warning) 48%, transparent);
}

@media (max-width: 1100px) {
  .lab-controls {
    grid-template-columns: 1fr 180px;
  }

  .speed-control {
    grid-column: 1;
  }

  .control-actions {
    justify-content: flex-end;
  }
}

@media (max-width: 700px) {
  .lab-controls {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .mode-control :deep(.v-btn-toggle) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    width: 100%;
  }

  .mode-control :deep(.v-btn) {
    min-width: 0;
    padding-inline: 8px;
    font-size: 0.74rem;
  }

  .count-control,
  .speed-control,
  .control-actions {
    grid-column: 1;
  }

  .control-actions > * {
    flex: 1;
  }

  .lab-stage {
    height: 58vh;
    min-height: 460px;
  }

  .stats-panel {
    right: 10px;
    left: 10px;
    justify-content: center;
  }

  .stat-item {
    padding-inline: 4px;
  }

}

@media (prefers-reduced-motion: reduce) {
  .gravity-core {
    transition: none;
  }
}
</style>
