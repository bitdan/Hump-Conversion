<template>
  <main
      ref="stageRef"
      class="home-stage"
      @pointermove="handlePointerMove"
      @pointerleave="handlePointerLeave"
  >
    <canvas ref="canvasRef" class="particle-canvas" aria-hidden="true"></canvas>

    <div class="scanline"></div>
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>

    <section class="core-wrap" aria-label="Tool Hub">
      <div class="orbit orbit-one"></div>
      <div class="orbit orbit-two"></div>
      <div class="orbit orbit-three"></div>
      <div class="core">
        <div class="core-pulse"></div>
        <div class="core-title">
          <span class="core-kicker">TOOL HUB</span>
          <strong>NEON CORE</strong>
        </div>
      </div>
    </section>

    <div class="hud hud-left">
      <span>PHASE</span>
      <strong>{{ phaseText }}</strong>
      <div class="meter">
        <i :style="{ width: `${phaseLevel}%` }"></i>
      </div>
    </div>

    <div class="hud hud-right">
      <span>SIGNAL</span>
      <strong>{{ signalText }}</strong>
      <div class="ticker">
        <b v-for="item in tickerItems" :key="item">{{ item }}</b>
      </div>
    </div>

    <div class="glyph-ring" aria-hidden="true">
      <i v-for="glyph in glyphs" :key="glyph" :data-glyph="glyph"></i>
    </div>
  </main>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  hue: number
  orbit: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const phase = ref(0)
const pointer = {
  active: false,
  x: 0,
  y: 0
}

const glyphs = ['01', '10', 'A7', 'F3', '9C', 'E0', '4D', 'B8', '72', 'DA', '3F', 'C1']
const tickerItems = ['SYNC', 'VECTOR', 'FLUX', 'TRACE']
const phaseText = computed(() => `${String(Math.round(phase.value)).padStart(2, '0')}%`)
const phaseLevel = computed(() => Math.max(14, phase.value))
const signalText = computed(() => pointer.active ? 'LOCKED' : 'IDLE')

let ctx: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let animationId = 0
let width = 0
let height = 0
let pixelRatio = 1
let startTime = 0

function createParticle(index: number): Particle {
  const angle = Math.random() * Math.PI * 2
  const speed = 0.16 + Math.random() * 0.42
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 0.8 + Math.random() * 2.4,
    hue: index % 2 === 0 ? 186 + Math.random() * 34 : 274 + Math.random() * 46,
    orbit: 34 + Math.random() * 220
  }
}

function resizeCanvas() {
  const canvas = canvasRef.value
  const stage = stageRef.value
  if (!canvas || !stage) return

  const rect = stage.getBoundingClientRect()
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  width = Math.max(1, rect.width)
  height = Math.max(1, rect.height)
  canvas.width = Math.floor(width * pixelRatio)
  canvas.height = Math.floor(height * pixelRatio)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  ctx = canvas.getContext('2d')
  ctx?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

  const targetCount = Math.max(76, Math.min(170, Math.floor((width * height) / 8400)))
  particles = Array.from({length: targetCount}, (_, index) => createParticle(index))
}

function drawBackground(context: CanvasRenderingContext2D, time: number) {
  const gradient = context.createRadialGradient(width * 0.5, height * 0.46, 0, width * 0.5, height * 0.46, Math.max(width, height) * 0.74)
  gradient.addColorStop(0, '#102a43')
  gradient.addColorStop(0.38, '#071523')
  gradient.addColorStop(1, '#030712')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  context.save()
  context.globalAlpha = 0.17
  context.strokeStyle = '#60f6ff'
  context.lineWidth = 1
  const grid = width < 680 ? 34 : 44
  const offset = (time * 0.018) % grid
  for (let x = -grid + offset; x < width + grid; x += grid) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x + height * 0.12, height)
    context.stroke()
  }
  for (let y = -grid + offset; y < height + grid; y += grid) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y + width * 0.04)
    context.stroke()
  }
  context.restore()
}

function drawCoreRays(context: CanvasRenderingContext2D, time: number) {
  const cx = width / 2
  const cy = height / 2
  const rayCount = 36

  context.save()
  context.translate(cx, cy)
  context.rotate(time * 0.00018)
  for (let i = 0; i < rayCount; i += 1) {
    const angle = (Math.PI * 2 * i) / rayCount
    const inner = 126 + Math.sin(time * 0.001 + i) * 18
    const outer = Math.min(width, height) * 0.42 + Math.cos(time * 0.0015 + i) * 24
    context.strokeStyle = i % 3 === 0 ? 'rgba(52, 211, 153, 0.32)' : 'rgba(34, 211, 238, 0.18)'
    context.lineWidth = i % 3 === 0 ? 1.4 : 0.7
    context.beginPath()
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
    context.stroke()
  }
  context.restore()
}

function updateParticles(time: number) {
  const centerX = width / 2
  const centerY = height / 2

  particles.forEach((particle, index) => {
    const angle = time * 0.00008 + index * 0.19
    particle.vx += Math.cos(angle) * 0.012
    particle.vy += Math.sin(angle) * 0.012

    if (pointer.active) {
      const dx = pointer.x - particle.x
      const dy = pointer.y - particle.y
      const distance = Math.hypot(dx, dy) || 1
      const force = Math.min(0.52, 70 / (distance * distance))
      particle.vx += dx * force * 0.014
      particle.vy += dy * force * 0.014
    } else {
      const dx = centerX - particle.x
      const dy = centerY - particle.y
      const distance = Math.hypot(dx, dy) || 1
      particle.vx += (dx / distance) * 0.006
      particle.vy += (dy / distance) * 0.006
    }

    particle.vx *= 0.985
    particle.vy *= 0.985
    particle.x += particle.vx
    particle.y += particle.vy

    if (particle.x < -20) particle.x = width + 20
    if (particle.x > width + 20) particle.x = -20
    if (particle.y < -20) particle.y = height + 20
    if (particle.y > height + 20) particle.y = -20
  })
}

function drawParticles(context: CanvasRenderingContext2D) {
  for (let i = 0; i < particles.length; i += 1) {
    const first = particles[i]

    for (let j = i + 1; j < particles.length; j += 1) {
      const second = particles[j]
      const dx = first.x - second.x
      const dy = first.y - second.y
      const distance = Math.hypot(dx, dy)
      if (distance > 118) continue

      context.strokeStyle = `hsla(${(first.hue + second.hue) / 2}, 96%, 68%, ${0.16 * (1 - distance / 118)})`
      context.lineWidth = 0.8
      context.beginPath()
      context.moveTo(first.x, first.y)
      context.lineTo(second.x, second.y)
      context.stroke()
    }
  }

  particles.forEach((particle) => {
    const glow = context.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius * 7)
    glow.addColorStop(0, `hsla(${particle.hue}, 96%, 70%, 0.9)`)
    glow.addColorStop(1, `hsla(${particle.hue}, 96%, 70%, 0)`)
    context.fillStyle = glow
    context.beginPath()
    context.arc(particle.x, particle.y, particle.radius * 7, 0, Math.PI * 2)
    context.fill()

    context.fillStyle = `hsl(${particle.hue}, 96%, 76%)`
    context.beginPath()
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
    context.fill()
  })
}

function render(time: number) {
  if (!ctx) return

  if (!startTime) startTime = time
  const elapsed = time - startTime
  phase.value = (Math.sin(elapsed * 0.0012) + 1) * 42 + 8

  drawBackground(ctx, elapsed)
  drawCoreRays(ctx, elapsed)
  updateParticles(elapsed)
  drawParticles(ctx)

  animationId = window.requestAnimationFrame(render)
}

function handlePointerMove(event: PointerEvent) {
  const stage = stageRef.value
  if (!stage) return

  const rect = stage.getBoundingClientRect()
  pointer.active = true
  pointer.x = event.clientX - rect.left
  pointer.y = event.clientY - rect.top
}

function handlePointerLeave() {
  pointer.active = false
}

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  animationId = window.requestAnimationFrame(render)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.cancelAnimationFrame(animationId)
})
</script>

<style scoped>
.home-stage {
  position: relative;
  min-height: calc(100vh - 96px);
  overflow: hidden;
  border-radius: 14px;
  background: #030712;
  color: #ecfeff;
  isolation: isolate;
}

.particle-canvas,
.scanline {
  position: absolute;
  inset: 0;
}

.particle-canvas {
  z-index: 0;
}

.scanline {
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(180deg, transparent 0, rgba(255, 255, 255, 0.04) 50%, transparent 100%),
  repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.035) 0 1px, transparent 1px 5px);
  mix-blend-mode: screen;
  opacity: 0.42;
  animation: scan 6s linear infinite;
}

.core-wrap {
  position: absolute;
  z-index: 3;
  left: 50%;
  top: 50%;
  width: min(58vw, 520px);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
}

.core {
  position: relative;
  width: 42%;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 1px solid rgba(103, 232, 249, 0.46);
  border-radius: 50%;
  background: radial-gradient(circle at 50% 38%, rgba(236, 253, 245, 0.24), transparent 24%),
  radial-gradient(circle, rgba(6, 182, 212, 0.42), rgba(14, 165, 233, 0.08) 56%, transparent 68%);
  box-shadow: 0 0 34px rgba(34, 211, 238, 0.44),
  inset 0 0 38px rgba(103, 232, 249, 0.28);
}

.core-pulse {
  position: absolute;
  inset: 16%;
  border-radius: 50%;
  border: 1px solid rgba(167, 243, 208, 0.7);
  animation: pulse 2.4s ease-in-out infinite;
}

.core-title {
  position: relative;
  display: grid;
  gap: 8px;
  text-align: center;
  text-shadow: 0 0 22px rgba(103, 232, 249, 0.96);
}

.core-kicker {
  font-size: clamp(0.58rem, 1.2vw, 0.8rem);
  color: rgba(165, 243, 252, 0.78);
  letter-spacing: 0;
}

.core-title strong {
  font-size: clamp(1.55rem, 4vw, 3.25rem);
  line-height: 0.9;
  color: #f8fafc;
}

.orbit {
  position: absolute;
  border-radius: 50%;
  border: 1px solid transparent;
  background: linear-gradient(#030712, #030712) padding-box,
  conic-gradient(from 0deg, transparent 0 18%, #22d3ee 22%, transparent 32% 58%, #34d399 62%, transparent 72%) border-box;
  filter: drop-shadow(0 0 14px rgba(34, 211, 238, 0.5));
}

.orbit-one {
  inset: 2%;
  animation: rotate 18s linear infinite;
}

.orbit-two {
  inset: 13%;
  animation: rotate-reverse 12s linear infinite;
}

.orbit-three {
  inset: 25%;
  animation: rotate 8s linear infinite;
}

.hud {
  position: absolute;
  z-index: 4;
  min-width: 188px;
  padding: 14px;
  border: 1px solid rgba(125, 211, 252, 0.28);
  background: linear-gradient(135deg, rgba(2, 6, 23, 0.64), rgba(8, 47, 73, 0.26));
  box-shadow: 0 0 34px rgba(14, 165, 233, 0.16);
  backdrop-filter: blur(16px);
}

.hud span {
  display: block;
  margin-bottom: 8px;
  color: rgba(165, 243, 252, 0.72);
  font-size: 0.72rem;
}

.hud strong {
  display: block;
  color: white;
  font-size: 1.7rem;
  line-height: 1;
}

.hud-left {
  left: clamp(18px, 4vw, 54px);
  bottom: clamp(18px, 4vw, 54px);
}

.hud-right {
  right: clamp(18px, 4vw, 54px);
  top: clamp(18px, 4vw, 54px);
}

.meter {
  height: 6px;
  margin-top: 16px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.86);
}

.meter i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #22d3ee, #34d399);
  box-shadow: 0 0 16px rgba(45, 212, 191, 0.85);
  transition: width 0.18s ease;
}

.ticker {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  overflow: hidden;
}

.ticker b {
  flex: 1;
  min-width: 0;
  padding: 6px 7px;
  border: 1px solid rgba(103, 232, 249, 0.2);
  color: rgba(236, 253, 245, 0.84);
  font-size: 0.65rem;
  text-align: center;
  font-weight: 600;
}

.glyph-ring {
  position: absolute;
  z-index: 3;
  inset: 7%;
  pointer-events: none;
  animation: drift 9s ease-in-out infinite alternate;
}

.glyph-ring i {
  position: absolute;
  width: 42px;
  height: 24px;
  color: rgba(186, 230, 253, 0.64);
  font-size: 0.72rem;
  font-style: normal;
  text-align: center;
  text-shadow: 0 0 12px rgba(34, 211, 238, 0.8);
}

.glyph-ring i::before {
  content: attr(data-glyph);
}

.glyph-ring i:nth-child(1) {
  left: 10%;
  top: 15%;
}

.glyph-ring i:nth-child(2) {
  left: 27%;
  top: 7%;
}

.glyph-ring i:nth-child(3) {
  right: 26%;
  top: 10%;
}

.glyph-ring i:nth-child(4) {
  right: 8%;
  top: 22%;
}

.glyph-ring i:nth-child(5) {
  right: 11%;
  top: 50%;
}

.glyph-ring i:nth-child(6) {
  right: 24%;
  bottom: 13%;
}

.glyph-ring i:nth-child(7) {
  right: 44%;
  bottom: 7%;
}

.glyph-ring i:nth-child(8) {
  left: 22%;
  bottom: 12%;
}

.glyph-ring i:nth-child(9) {
  left: 8%;
  bottom: 31%;
}

.glyph-ring i:nth-child(10) {
  left: 16%;
  top: 45%;
}

.glyph-ring i:nth-child(11) {
  left: 41%;
  top: 20%;
}

.glyph-ring i:nth-child(12) {
  right: 40%;
  bottom: 25%;
}

.corner {
  position: absolute;
  z-index: 4;
  width: 72px;
  height: 72px;
  border-color: rgba(125, 211, 252, 0.48);
  pointer-events: none;
}

.corner-tl {
  left: 18px;
  top: 18px;
  border-top: 1px solid;
  border-left: 1px solid;
}

.corner-tr {
  right: 18px;
  top: 18px;
  border-top: 1px solid;
  border-right: 1px solid;
}

.corner-bl {
  left: 18px;
  bottom: 18px;
  border-bottom: 1px solid;
  border-left: 1px solid;
}

.corner-br {
  right: 18px;
  bottom: 18px;
  border-bottom: 1px solid;
  border-right: 1px solid;
}

@keyframes rotate {
  to {
    transform: rotate(360deg);
  }
}

@keyframes rotate-reverse {
  to {
    transform: rotate(-360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(0.76);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.22);
    opacity: 0.18;
  }
}

@keyframes scan {
  0% {
    transform: translateY(-8%);
  }
  100% {
    transform: translateY(8%);
  }
}

@keyframes drift {
  from {
    transform: translate3d(-8px, 4px, 0);
  }
  to {
    transform: translate3d(8px, -10px, 0);
  }
}

@media (max-width: 760px) {
  .home-stage {
    min-height: calc(100vh - 88px);
    border-radius: 10px;
  }

  .core-wrap {
    width: min(92vw, 430px);
  }

  .hud {
    min-width: 134px;
    padding: 11px;
  }

  .hud strong {
    font-size: 1.22rem;
  }

  .hud-left {
    left: 12px;
    bottom: 12px;
  }

  .hud-right {
    right: 12px;
    top: 12px;
  }

  .ticker {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }

  .glyph-ring {
    inset: 2%;
  }
}
</style>
