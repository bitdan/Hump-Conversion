<template>
  <div class="bird-game">
    <div class="game-shell">
      <header class="game-header">
        <div>
          <h1>愤怒的小鸟</h1>
          <p>{{ currentLevel.name }} · {{ activeBirdLabel }}</p>
        </div>
        <div class="score-board">
          <span>关卡 <strong>{{ levelIndex + 1 }}/{{ levels.length }}</strong></span>
          <span>分数 <strong>{{ score }}</strong></span>
          <span>目标 <strong>{{ aliveTargets }}</strong></span>
          <v-btn color="primary" variant="flat" prepend-icon="mdi-refresh" @click="resetLevel">重开</v-btn>
        </div>
      </header>

      <div class="bird-tray">
        <div
            v-for="(birdType, index) in birdQueue"
            :key="`${birdType}-${index}`"
            class="bird-token"
            :class="[`bird-token--${birdType}`, { 'bird-token--active': index === 0 && !bird.flying }]"
        >
          {{ birdTypeLabels[birdType] }}
        </div>
        <div class="skill-tip">{{ skillTip }}</div>
      </div>

      <div class="canvas-wrap">
        <canvas
            ref="canvasRef"
            :width="WORLD_WIDTH"
            :height="WORLD_HEIGHT"
            @pointerdown="handlePointerDown"
            @pointermove="handlePointerMove"
            @pointerup="handlePointerUp"
            @pointercancel="handlePointerUp"
            @pointerleave="handlePointerLeave"
        ></canvas>
        <div v-if="message" class="game-message">
          <strong>{{ message }}</strong>
          <p v-if="stars">星级 {{ stars }}</p>
          <div class="message-actions">
            <v-btn color="primary" variant="flat" @click="resetLevel">重试</v-btn>
            <v-btn
                v-if="levelCleared && levelIndex < levels.length - 1"
                color="success"
                variant="flat"
                @click="nextLevel"
            >
              下一关
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'

type BirdType = 'red' | 'yellow' | 'blue'
type Material = 'wood' | 'glass' | 'stone'

interface Vector {
  x: number
  y: number
}

interface Bird extends Vector {
  vx: number
  vy: number
  radius: number
  type: BirdType
  flying: boolean
  abilityUsed: boolean
  settled: boolean
}

interface Block extends Vector {
  width: number
  height: number
  vx: number
  vy: number
  hp: number
  maxHp: number
  material: Material
  tilt: number
  angularVelocity: number
}

interface Target extends Vector {
  radius: number
  alive: boolean
  vx: number
  vy: number
  wobble: number
}

interface Particle extends Vector {
  vx: number
  vy: number
  life: number
  maxLife: number
  radius: number
  color: string
}

interface Level {
  name: string
  birds: BirdType[]
  blocks: Array<Pick<Block, 'x' | 'y' | 'width' | 'height' | 'material' | 'tilt'>>
  targets: Array<Pick<Target, 'x' | 'y' | 'radius'>>
}

const WORLD_WIDTH = 1040
const WORLD_HEIGHT = 584
const GROUND_Y = 506
const SLINGSHOT = {x: 150, y: 386}
const MAX_PULL = 118
const GRAVITY = 0.43
const AIR_FRICTION = 0.996
const GROUND_FRICTION = 0.78
const LAUNCH_POWER = 0.18

const materialStats: Record<Material, { hp: number; density: number; fill: string; stroke: string; score: number }> = {
  wood: {hp: 72, density: 0.82, fill: '#a16207', stroke: '#78350f', score: 55},
  glass: {hp: 42, density: 0.55, fill: '#67e8f9', stroke: '#0891b2', score: 70},
  stone: {hp: 128, density: 1.28, fill: '#94a3b8', stroke: '#475569', score: 90}
}

const birdTypeLabels: Record<BirdType, string> = {
  red: '红',
  yellow: '黄',
  blue: '蓝'
}

const birdSkillNames: Record<BirdType, string> = {
  red: '冲击波',
  yellow: '空中加速',
  blue: '散射爆裂'
}

const levels: Level[] = [
  {
    name: '木塔训练场',
    birds: ['red', 'yellow', 'blue'],
    blocks: [
      {x: 676, y: 433, width: 22, height: 120, material: 'wood', tilt: -0.03},
      {x: 752, y: 433, width: 22, height: 120, material: 'wood', tilt: 0.03},
      {x: 714, y: 368, width: 96, height: 20, material: 'wood', tilt: 0},
      {x: 840, y: 446, width: 22, height: 92, material: 'glass', tilt: 0.03},
      {x: 904, y: 446, width: 22, height: 92, material: 'glass', tilt: -0.03},
      {x: 872, y: 394, width: 84, height: 18, material: 'glass', tilt: 0}
    ],
    targets: [
      {x: 714, y: 339, radius: 18},
      {x: 872, y: 366, radius: 17}
    ]
  },
  {
    name: '玻璃堡垒',
    birds: ['blue', 'yellow', 'red', 'red'],
    blocks: [
      {x: 650, y: 450, width: 24, height: 88, material: 'glass', tilt: 0},
      {x: 710, y: 450, width: 24, height: 88, material: 'glass', tilt: 0},
      {x: 680, y: 398, width: 86, height: 18, material: 'wood', tilt: 0},
      {x: 802, y: 430, width: 26, height: 128, material: 'stone', tilt: -0.02},
      {x: 884, y: 430, width: 26, height: 128, material: 'stone', tilt: 0.02},
      {x: 843, y: 356, width: 106, height: 20, material: 'stone', tilt: 0},
      {x: 843, y: 325, width: 76, height: 16, material: 'glass', tilt: 0}
    ],
    targets: [
      {x: 680, y: 371, radius: 17},
      {x: 843, y: 326, radius: 19},
      {x: 843, y: 476, radius: 16}
    ]
  },
  {
    name: '复合防线',
    birds: ['yellow', 'blue', 'red', 'yellow'],
    blocks: [
      {x: 626, y: 458, width: 22, height: 96, material: 'wood', tilt: -0.04},
      {x: 686, y: 458, width: 22, height: 96, material: 'wood', tilt: 0.04},
      {x: 656, y: 402, width: 82, height: 18, material: 'stone', tilt: 0},
      {x: 760, y: 450, width: 22, height: 112, material: 'glass', tilt: 0},
      {x: 828, y: 450, width: 22, height: 112, material: 'glass', tilt: 0},
      {x: 794, y: 387, width: 96, height: 18, material: 'wood', tilt: 0},
      {x: 910, y: 432, width: 26, height: 148, material: 'stone', tilt: 0},
      {x: 966, y: 432, width: 26, height: 148, material: 'stone', tilt: 0},
      {x: 938, y: 350, width: 82, height: 20, material: 'stone', tilt: 0}
    ],
    targets: [
      {x: 656, y: 374, radius: 17},
      {x: 794, y: 358, radius: 17},
      {x: 938, y: 322, radius: 19}
    ]
  }
]

const canvasRef = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const levelIndex = ref(0)
const message = ref('')
const stars = ref('')
const levelCleared = ref(false)
const birdQueue = ref<BirdType[]>([])

const currentLevel = computed(() => levels[levelIndex.value])
const aliveTargets = computed(() => targets.filter(target => target.alive).length)
const activeBirdLabel = computed(() => {
  const type = bird.type
  return `${birdTypeLabels[type]}鸟 · ${birdSkillNames[type]}`
})
const skillTip = computed(() => {
  if (bird.flying && !bird.abilityUsed) return `飞行中点击画布触发：${birdSkillNames[bird.type]}`
  if (birdQueue.value.length) return `本关队列：${birdQueue.value.map(type => birdTypeLabels[type]).join(' / ')}`
  return '拖住弹弓上的小鸟开始'
})

let ctx: CanvasRenderingContext2D | null = null
let frameId = 0
let dragging = false
let dragPoint: Vector = {...SLINGSHOT}
let bird: Bird = createBird('red')
let blocks: Block[] = []
let targets: Target[] = []
let particles: Particle[] = []
let shake = 0
let settleTimer = 0

function createBird(type: BirdType): Bird {
  const radius = type === 'blue' ? 15 : type === 'yellow' ? 16 : 18
  return {
    x: SLINGSHOT.x,
    y: SLINGSHOT.y,
    vx: 0,
    vy: 0,
    radius,
    type,
    flying: false,
    abilityUsed: false,
    settled: false
  }
}

function createBlock(input: Level['blocks'][number]): Block {
  const stats = materialStats[input.material]
  return {
    ...input,
    vx: 0,
    vy: 0,
    hp: stats.hp,
    maxHp: stats.hp,
    angularVelocity: 0
  }
}

function createTarget(input: Level['targets'][number]): Target {
  return {
    ...input,
    alive: true,
    vx: 0,
    vy: 0,
    wobble: 0
  }
}

function resetLevel() {
  const level = currentLevel.value
  score.value = 0
  message.value = ''
  stars.value = ''
  levelCleared.value = false
  birdQueue.value = [...level.birds]
  particles = []
  blocks = level.blocks.map(createBlock)
  targets = level.targets.map(createTarget)
  dragging = false
  dragPoint = {...SLINGSHOT}
  shake = 0
  window.clearTimeout(settleTimer)
  loadNextBird()
}

function nextLevel() {
  levelIndex.value = Math.min(levelIndex.value + 1, levels.length - 1)
  resetLevel()
}

function loadNextBird() {
  const nextType = birdQueue.value.shift()
  if (!nextType) {
    bird = createBird('red')
    if (!levelCleared.value) finishLevel(false)
    return
  }
  bird = createBird(nextType)
  dragPoint = {...SLINGSHOT}
}

function finishLevel(won: boolean) {
  levelCleared.value = won
  if (won) {
    const bonus = birdQueue.value.length * 500 + (bird.flying ? 0 : 250)
    score.value += bonus
    const starCount = Math.max(1, Math.min(3, 1 + Math.floor((score.value + bonus) / 1300)))
    stars.value = '★'.repeat(starCount) + '☆'.repeat(3 - starCount)
    message.value = levelIndex.value === levels.length - 1 ? '全部通关' : '过关'
  } else {
    stars.value = ''
    message.value = '挑战失败'
  }
}

function getPointer(event: PointerEvent): Vector {
  const canvas = canvasRef.value
  if (!canvas) return {x: 0, y: 0}
  const rect = canvas.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * WORLD_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT
  }
}

function distance(a: Vector, b: Vector) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function clampPull(point: Vector): Vector {
  const dx = point.x - SLINGSHOT.x
  const dy = point.y - SLINGSHOT.y
  const length = Math.hypot(dx, dy)
  if (length <= MAX_PULL) return point
  return {
    x: SLINGSHOT.x + (dx / length) * MAX_PULL,
    y: SLINGSHOT.y + (dy / length) * MAX_PULL
  }
}

function handlePointerDown(event: PointerEvent) {
  if (message.value) return

  if (bird.flying) {
    activateAbility()
    return
  }

  const point = getPointer(event)
  if (distance(point, bird) > 52) return
  canvasRef.value?.setPointerCapture(event.pointerId)
  dragging = true
  dragPoint = clampPull(point)
  bird.x = dragPoint.x
  bird.y = dragPoint.y
}

function handlePointerMove(event: PointerEvent) {
  if (!dragging) return
  dragPoint = clampPull(getPointer(event))
  bird.x = dragPoint.x
  bird.y = dragPoint.y
}

function handlePointerUp(event: PointerEvent) {
  if (!dragging) return
  canvasRef.value?.releasePointerCapture(event.pointerId)
  dragging = false
  const pullX = SLINGSHOT.x - dragPoint.x
  const pullY = SLINGSHOT.y - dragPoint.y
  bird.vx = pullX * LAUNCH_POWER
  bird.vy = pullY * LAUNCH_POWER
  bird.flying = true
  bird.settled = false
}

function handlePointerLeave() {
  if (!dragging) return
  dragPoint = clampPull(dragPoint)
}

function activateAbility() {
  if (!bird.flying || bird.abilityUsed) return
  bird.abilityUsed = true

  if (bird.type === 'yellow') {
    const speed = Math.max(1, Math.hypot(bird.vx, bird.vy))
    bird.vx += (bird.vx / speed) * 9
    bird.vy += (bird.vy / speed) * 4
    addBurst(bird.x, bird.y, '#fde047', 18, 5)
    shake = Math.max(shake, 8)
    return
  }

  if (bird.type === 'blue') {
    addBurst(bird.x, bird.y, '#60a5fa', 30, 7)
    radialImpulse(bird.x, bird.y, 106, 7.8, true)
    bird.radius = 13
    bird.vy -= 2.4
    shake = Math.max(shake, 10)
    return
  }

  addBurst(bird.x, bird.y, '#fb7185', 34, 8)
  radialImpulse(bird.x, bird.y, 132, 9.5, true)
  shake = Math.max(shake, 12)
}

function scheduleNextBird() {
  window.clearTimeout(settleTimer)
  settleTimer = window.setTimeout(() => {
    if (targets.every(target => !target.alive)) {
      finishLevel(true)
      return
    }
    if (!birdQueue.value.length) {
      finishLevel(false)
      return
    }
    loadNextBird()
  }, 620)
}

function updateBird() {
  if (!bird.flying) return
  bird.vy += GRAVITY
  bird.vx *= AIR_FRICTION
  bird.vy *= AIR_FRICTION
  bird.x += bird.vx
  bird.y += bird.vy

  if (bird.y + bird.radius > GROUND_Y) {
    bird.y = GROUND_Y - bird.radius
    bird.vy *= -0.34
    bird.vx *= GROUND_FRICTION
    if (Math.abs(bird.vx) < 0.4 && Math.abs(bird.vy) < 1.0 && !bird.settled) {
      bird.flying = false
      bird.settled = true
      scheduleNextBird()
    }
  }

  if ((bird.x > WORLD_WIDTH + 120 || bird.y > WORLD_HEIGHT + 120) && !bird.settled) {
    bird.flying = false
    bird.settled = true
    scheduleNextBird()
  }
}

function updateBlocks() {
  blocks.forEach((block) => {
    if (block.hp <= 0) return
    const stats = materialStats[block.material]
    block.vy += GRAVITY * (0.5 + stats.density * 0.22)
    block.x += block.vx
    block.y += block.vy
    block.tilt += block.angularVelocity + block.vx * 0.0015
    block.angularVelocity *= 0.94
    block.vx *= 0.965
    block.vy *= 0.986

    if (block.y + block.height / 2 > GROUND_Y) {
      block.y = GROUND_Y - block.height / 2
      block.vy *= -0.16
      block.vx *= 0.7
      if (Math.abs(block.vy) > 1.8) damageBlock(block, Math.abs(block.vy) * 2.8)
    }

    if (block.hp <= 0) destroyBlock(block)
  })
}

function updateTargets() {
  targets.forEach((target) => {
    if (!target.alive) return
    target.vy += GRAVITY * 0.38
    target.x += target.vx
    target.y += target.vy
    target.vx *= 0.94
    target.vy *= 0.97
    target.wobble *= 0.9
    if (target.y + target.radius > GROUND_Y) {
      target.y = GROUND_Y - target.radius
      target.vy *= -0.18
      target.vx *= 0.76
    }
  })
}

function updateParticles() {
  particles = particles.filter((particle) => {
    particle.life -= 1
    particle.vy += GRAVITY * 0.18
    particle.x += particle.vx
    particle.y += particle.vy
    particle.vx *= 0.98
    particle.vy *= 0.98
    return particle.life > 0
  })
}

function damageBlock(block: Block, amount: number) {
  block.hp -= amount
  if (block.hp <= 0) destroyBlock(block)
}

function destroyBlock(block: Block) {
  if (block.hp < -999) return
  block.hp = -1000
  const stats = materialStats[block.material]
  score.value += stats.score
  addBurst(block.x, block.y, stats.fill, block.material === 'glass' ? 22 : 14, block.material === 'stone' ? 3 : 5)
  shake = Math.max(shake, block.material === 'stone' ? 5 : 8)
}

function defeatTarget(target: Target) {
  if (!target.alive) return
  target.alive = false
  score.value += 600
  addBurst(target.x, target.y, '#22c55e', 28, 6)
  shake = Math.max(shake, 10)
  if (targets.every(item => !item.alive)) {
    window.setTimeout(() => finishLevel(true), 360)
  }
}

function addBurst(x: number, y: number, color: string, count: number, speed: number) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
    const velocity = speed * (0.35 + Math.random() * 0.75)
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 34 + Math.random() * 30,
      maxLife: 64,
      radius: 2 + Math.random() * 3,
      color
    })
  }
}

function radialImpulse(x: number, y: number, radius: number, force: number, damage: boolean) {
  blocks.forEach((block) => {
    if (block.hp <= 0) return
    const d = Math.max(1, distance({x, y}, block))
    if (d > radius) return
    const power = (1 - d / radius) * force
    block.vx += ((block.x - x) / d) * power
    block.vy += ((block.y - y) / d) * power
    block.angularVelocity += ((block.x - x) / d) * 0.05
    if (damage) damageBlock(block, power * 8)
  })
  targets.forEach((target) => {
    if (!target.alive) return
    const d = Math.max(1, distance({x, y}, target))
    if (d > radius) return
    const power = (1 - d / radius) * force
    target.vx += ((target.x - x) / d) * power
    target.vy += ((target.y - y) / d) * power
    target.wobble = 1
    if (power > 4.2) defeatTarget(target)
  })
}

function collideBirdWithBlock(block: Block) {
  if (!bird.flying || block.hp <= 0) return
  const nearestX = Math.max(block.x - block.width / 2, Math.min(bird.x, block.x + block.width / 2))
  const nearestY = Math.max(block.y - block.height / 2, Math.min(bird.y, block.y + block.height / 2))
  const dx = bird.x - nearestX
  const dy = bird.y - nearestY
  const hitDistance = Math.hypot(dx, dy)
  if (hitDistance > bird.radius) return

  const impact = Math.hypot(bird.vx, bird.vy)
  const normalX = hitDistance ? dx / hitDistance : -1
  const normalY = hitDistance ? dy / hitDistance : -0.2
  const stats = materialStats[block.material]
  const impulse = Math.max(2.2, impact * (0.44 / stats.density))

  bird.x += normalX * (bird.radius - hitDistance + 1)
  bird.y += normalY * (bird.radius - hitDistance + 1)
  bird.vx = -bird.vx * 0.34 + normalX * impulse
  bird.vy = -bird.vy * 0.34 + normalY * impulse
  block.vx += -normalX * impulse * (1.2 / stats.density)
  block.vy += -normalY * impulse * (1.2 / stats.density)
  block.angularVelocity += -normalX * impact * 0.006
  damageBlock(block, impact * (bird.type === 'blue' && block.material === 'glass' ? 9 : 5.4))
  score.value += Math.round(impact * 4)
  if (impact > 7) addBurst(nearestX, nearestY, stats.fill, 8, 3)
}

function collideBlocks() {
  for (let i = 0; i < blocks.length; i += 1) {
    const a = blocks[i]
    if (a.hp <= 0) continue
    for (let j = i + 1; j < blocks.length; j += 1) {
      const b = blocks[j]
      if (b.hp <= 0) continue
      const overlapX = a.width / 2 + b.width / 2 - Math.abs(a.x - b.x)
      const overlapY = a.height / 2 + b.height / 2 - Math.abs(a.y - b.y)
      if (overlapX <= 0 || overlapY <= 0) continue
      const separateX = a.x < b.x ? -1 : 1
      const separateY = a.y < b.y ? -1 : 1
      if (overlapX < overlapY) {
        a.x += separateX * overlapX * 0.5
        b.x -= separateX * overlapX * 0.5
        const impulse = (a.vx - b.vx) * 0.35
        a.vx -= impulse
        b.vx += impulse
        damageBlock(a, Math.abs(impulse) * 2)
        damageBlock(b, Math.abs(impulse) * 2)
      } else {
        a.y += separateY * overlapY * 0.5
        b.y -= separateY * overlapY * 0.5
        const impulse = (a.vy - b.vy) * 0.25
        a.vy -= impulse
        b.vy += impulse
      }
    }
  }
}

function collideTargets() {
  targets.forEach((target) => {
    if (!target.alive) return
    if (bird.flying && distance(bird, target) < bird.radius + target.radius) {
      const impact = Math.hypot(bird.vx, bird.vy)
      if (impact > 3.2) defeatTarget(target)
      return
    }

    blocks.forEach((block) => {
      if (!target.alive || block.hp <= 0) return
      const nearestX = Math.max(block.x - block.width / 2, Math.min(target.x, block.x + block.width / 2))
      const nearestY = Math.max(block.y - block.height / 2, Math.min(target.y, block.y + block.height / 2))
      const d = Math.hypot(target.x - nearestX, target.y - nearestY)
      if (d > target.radius) return
      target.vx += block.vx * 0.4
      target.vy += block.vy * 0.4
      target.wobble = 1
      if (Math.hypot(block.vx, block.vy) > 1.9 || block.hp < block.maxHp * 0.45) {
        defeatTarget(target)
      }
    })
  })
}

function updateCollisions() {
  blocks.forEach(collideBirdWithBlock)
  collideBlocks()
  collideTargets()
}

function drawBackground(context: CanvasRenderingContext2D) {
  const sky = context.createLinearGradient(0, 0, 0, WORLD_HEIGHT)
  sky.addColorStop(0, '#7dd3fc')
  sky.addColorStop(0.5, '#bae6fd')
  sky.addColorStop(1, '#fef3c7')
  context.fillStyle = sky
  context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  context.fillStyle = 'rgba(255, 255, 255, 0.72)'
  drawCloud(context, 142, 92, 1.1)
  drawCloud(context, 520, 82, 0.86)
  drawCloud(context, 812, 116, 1.02)

  context.fillStyle = '#65a30d'
  context.beginPath()
  context.moveTo(0, GROUND_Y)
  context.bezierCurveTo(180, 450, 334, 526, 520, 486)
  context.bezierCurveTo(710, 442, 840, 522, WORLD_WIDTH, 466)
  context.lineTo(WORLD_WIDTH, WORLD_HEIGHT)
  context.lineTo(0, WORLD_HEIGHT)
  context.closePath()
  context.fill()
  context.fillStyle = '#4d7c0f'
  context.fillRect(0, GROUND_Y, WORLD_WIDTH, WORLD_HEIGHT - GROUND_Y)
}

function drawCloud(context: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  context.beginPath()
  context.arc(x, y, 24 * scale, 0, Math.PI * 2)
  context.arc(x + 28 * scale, y - 12 * scale, 32 * scale, 0, Math.PI * 2)
  context.arc(x + 66 * scale, y, 25 * scale, 0, Math.PI * 2)
  context.arc(x + 34 * scale, y + 10 * scale, 30 * scale, 0, Math.PI * 2)
  context.fill()
}

function drawSlingshot(context: CanvasRenderingContext2D) {
  context.save()
  context.lineCap = 'round'
  context.strokeStyle = '#7c2d12'
  context.lineWidth = 15
  context.beginPath()
  context.moveTo(SLINGSHOT.x - 18, GROUND_Y)
  context.lineTo(SLINGSHOT.x - 10, SLINGSHOT.y + 20)
  context.lineTo(SLINGSHOT.x - 38, SLINGSHOT.y - 45)
  context.stroke()
  context.beginPath()
  context.moveTo(SLINGSHOT.x + 18, GROUND_Y)
  context.lineTo(SLINGSHOT.x + 8, SLINGSHOT.y + 20)
  context.lineTo(SLINGSHOT.x + 34, SLINGSHOT.y - 47)
  context.stroke()
  if (dragging || !bird.flying) {
    context.strokeStyle = '#3f1d0b'
    context.lineWidth = 5
    context.beginPath()
    context.moveTo(SLINGSHOT.x - 34, SLINGSHOT.y - 43)
    context.lineTo(bird.x, bird.y)
    context.lineTo(SLINGSHOT.x + 32, SLINGSHOT.y - 45)
    context.stroke()
  }
  context.restore()
}

function drawTrajectory(context: CanvasRenderingContext2D) {
  if (!dragging) return
  let x = bird.x
  let y = bird.y
  let vx = (SLINGSHOT.x - dragPoint.x) * LAUNCH_POWER
  let vy = (SLINGSHOT.y - dragPoint.y) * LAUNCH_POWER
  context.save()
  context.fillStyle = 'rgba(15, 23, 42, 0.34)'
  for (let i = 0; i < 26; i += 1) {
    vx *= AIR_FRICTION
    vy = (vy + GRAVITY) * AIR_FRICTION
    x += vx * 5
    y += vy * 5
    if (y > GROUND_Y) break
    context.beginPath()
    context.arc(x, y, Math.max(2, 5 - i * 0.12), 0, Math.PI * 2)
    context.fill()
  }
  context.restore()
}

function drawBird(context: CanvasRenderingContext2D) {
  context.save()
  context.translate(bird.x, bird.y)
  context.rotate(Math.atan2(bird.vy, bird.vx || 1) * 0.12)
  const colors = bird.type === 'yellow'
      ? ['#fef08a', '#facc15', '#a16207']
      : bird.type === 'blue'
          ? ['#bfdbfe', '#3b82f6', '#1e3a8a']
          : ['#fecaca', '#ef4444', '#991b1b']
  const gradient = context.createRadialGradient(-8, -8, 4, 0, 0, bird.radius)
  gradient.addColorStop(0, colors[0])
  gradient.addColorStop(0.45, colors[1])
  gradient.addColorStop(1, colors[2])
  context.fillStyle = gradient
  context.beginPath()
  context.arc(0, 0, bird.radius, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#f8fafc'
  context.beginPath()
  context.arc(5, -7, 5, 0, Math.PI * 2)
  context.arc(15, -6, 5, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#111827'
  context.beginPath()
  context.arc(7, -7, 2, 0, Math.PI * 2)
  context.arc(17, -6, 2, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#f97316'
  context.beginPath()
  context.moveTo(bird.radius - 1, 1)
  context.lineTo(bird.radius + 16, 7)
  context.lineTo(bird.radius - 1, 12)
  context.closePath()
  context.fill()
  context.strokeStyle = colors[2]
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(-8, -bird.radius + 1)
  context.lineTo(-15, -bird.radius - 12)
  context.moveTo(0, -bird.radius + 1)
  context.lineTo(-2, -bird.radius - 13)
  context.stroke()
  context.restore()
}

function drawBlock(context: CanvasRenderingContext2D, block: Block) {
  if (block.hp <= 0) return
  const stats = materialStats[block.material]
  context.save()
  context.translate(block.x, block.y)
  context.rotate(block.tilt)
  context.fillStyle = stats.fill
  context.strokeStyle = stats.stroke
  context.lineWidth = 2
  context.globalAlpha = Math.max(0.42, block.hp / block.maxHp)
  context.beginPath()
  context.roundRect(-block.width / 2, -block.height / 2, block.width, block.height, 4)
  context.fill()
  context.stroke()
  context.globalAlpha = 1
  context.strokeStyle = block.material === 'glass' ? 'rgba(240, 249, 255, 0.7)' : 'rgba(254, 243, 199, 0.42)'
  context.lineWidth = 1
  for (let y = -block.height / 2 + 12; y < block.height / 2; y += 18) {
    context.beginPath()
    context.moveTo(-block.width / 2 + 4, y)
    context.lineTo(block.width / 2 - 4, y)
    context.stroke()
  }
  context.restore()
}

function drawTarget(context: CanvasRenderingContext2D, target: Target) {
  if (!target.alive) return
  context.save()
  context.translate(target.x, target.y)
  context.rotate(Math.sin(performance.now() * 0.008 + target.x) * 0.05 + target.wobble * 0.16)
  context.fillStyle = '#22c55e'
  context.beginPath()
  context.arc(0, 0, target.radius, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#dcfce7'
  context.beginPath()
  context.arc(-6, -5, 4, 0, Math.PI * 2)
  context.arc(7, -5, 4, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#052e16'
  context.beginPath()
  context.arc(-5, -5, 1.7, 0, Math.PI * 2)
  context.arc(8, -5, 1.7, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = '#052e16'
  context.lineWidth = 2
  context.beginPath()
  context.arc(1, 5, 7, 0.15 * Math.PI, 0.85 * Math.PI)
  context.stroke()
  context.restore()
}

function drawParticles(context: CanvasRenderingContext2D) {
  particles.forEach((particle) => {
    context.globalAlpha = Math.max(0, particle.life / particle.maxLife)
    context.fillStyle = particle.color
    context.beginPath()
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
    context.fill()
  })
  context.globalAlpha = 1
}

function drawStatus(context: CanvasRenderingContext2D) {
  context.save()
  context.fillStyle = 'rgba(15, 23, 42, 0.68)'
  context.beginPath()
  context.roundRect(26, 22, 314, 58, 12)
  context.fill()
  context.fillStyle = '#f8fafc'
  context.font = '700 17px system-ui, sans-serif'
  context.fillText(`技能 ${bird.flying && !bird.abilityUsed ? birdSkillNames[bird.type] : '待命'}`, 46, 56)
  context.fillText(`剩余 ${birdQueue.value.length}`, 216, 56)
  context.restore()
}

function draw() {
  if (!ctx) return
  ctx.save()
  const shakeX = shake > 0 ? (Math.random() - 0.5) * shake : 0
  const shakeY = shake > 0 ? (Math.random() - 0.5) * shake : 0
  ctx.translate(shakeX, shakeY)
  drawBackground(ctx)
  drawTrajectory(ctx)
  drawSlingshot(ctx)
  blocks.forEach(block => drawBlock(ctx!, block))
  targets.forEach(target => drawTarget(ctx!, target))
  drawParticles(ctx)
  drawBird(ctx)
  drawStatus(ctx)
  ctx.restore()
}

function loop() {
  if (shake > 0) shake *= 0.88
  updateBird()
  updateBlocks()
  updateTargets()
  updateCollisions()
  updateParticles()
  draw()
  frameId = requestAnimationFrame(loop)
}

onMounted(() => {
  ctx = canvasRef.value?.getContext('2d') || null
  resetLevel()
  loop()
})

onBeforeUnmount(() => {
  window.clearTimeout(settleTimer)
  cancelAnimationFrame(frameId)
})
</script>

<style scoped>
.bird-game {
  min-height: calc(100vh - 40px);
  padding: 20px;
  background: radial-gradient(circle at 20% 0%, rgba(251, 191, 36, 0.22), transparent 30%),
  linear-gradient(135deg, #eff6ff, #fefce8 42%, #ecfccb);
}

.game-shell {
  max-width: 1160px;
  margin: 0 auto;
}

.game-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 12px;
}

.game-header h1 {
  margin: 0 0 6px;
  color: #172554;
  font-size: clamp(2rem, 5vw, 4.25rem);
  line-height: 1;
  font-weight: 900;
}

.game-header p {
  margin: 0;
  color: #475569;
  font-size: 1rem;
}

.score-board,
.bird-tray {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.score-board {
  justify-content: flex-end;
}

.score-board span,
.skill-tip,
.bird-token {
  border: 1px solid rgba(37, 99, 235, 0.16);
  background: rgba(255, 255, 255, 0.74);
  color: #334155;
}

.score-board span {
  min-width: 86px;
  padding: 9px 12px;
  font-size: 0.9rem;
  text-align: center;
}

.score-board strong {
  color: #0f172a;
  font-size: 1.3rem;
}

.bird-tray {
  margin-bottom: 14px;
}

.bird-token {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: white;
  font-weight: 800;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
}

.bird-token--red {
  background: linear-gradient(135deg, #f87171, #991b1b);
}

.bird-token--yellow {
  background: linear-gradient(135deg, #fde047, #a16207);
}

.bird-token--blue {
  background: linear-gradient(135deg, #60a5fa, #1e3a8a);
}

.bird-token--active {
  outline: 3px solid rgba(15, 23, 42, 0.18);
}

.skill-tip {
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-radius: 999px;
}

.canvas-wrap {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 10px;
  background: #7dd3fc;
  box-shadow: 0 26px 70px rgba(15, 23, 42, 0.16);
}

canvas {
  display: block;
  width: 100%;
  height: auto;
  touch-action: none;
  cursor: grab;
}

canvas:active {
  cursor: grabbing;
}

.game-message {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 14px;
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(4px);
  text-align: center;
}

.game-message strong {
  color: white;
  font-size: clamp(2.4rem, 8vw, 5.5rem);
  line-height: 1;
  text-shadow: 0 12px 40px rgba(15, 23, 42, 0.52);
}

.game-message p {
  margin: 0;
  color: #facc15;
  font-size: 2rem;
  letter-spacing: 0;
}

.message-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

@media (max-width: 760px) {
  .bird-game {
    min-height: calc(100vh - 24px);
    padding: 12px;
  }

  .game-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .score-board {
    width: 100%;
    justify-content: flex-start;
  }

  .score-board span {
    flex: 1;
  }

  .skill-tip {
    width: 100%;
    border-radius: 10px;
  }
}
</style>
