<template>
    <div class="shader-lab">
      <section class="effect-strip solid-card" aria-label="Shader 效果选择">
        <v-btn-toggle
          v-model="activeEffect"
          mandatory
          color="primary"
          density="comfortable"
          rounded="lg"
        >
          <v-btn
            v-for="effect in effects"
            :key="effect.value"
            :value="effect.value"
            :prepend-icon="effect.icon"
          >
            {{ effect.label }}
          </v-btn>
        </v-btn-toggle>
      </section>

      <div class="shader-workspace">
        <section
          ref="stageRef"
          class="shader-stage"
          data-testid="shader-stage"
          :aria-busy="isInitializing"
          @pointermove="handlePointerMove"
          @pointerdown="handlePointerMove"
        >
          <div class="stage-stats" aria-label="Shader 性能统计">
            <span><small>FPS</small><strong>{{ displayedFps || '—' }}</strong></span>
            <span><small>Renderer</small><strong>{{ rendererName }}</strong></span>
            <span><small>Pass</small><strong>1</strong></span>
          </div>

          <div
            v-if="showsPointer"
            class="pointer-focus"
            :class="`pointer-focus--${activeEffect}`"
            :style="pointerStyle"
            aria-hidden="true"
          />

          <div v-if="isInitializing" class="stage-message" role="status">
            <v-progress-circular indeterminate color="info" :size="64" :width="6" />
            <strong>正在编译 GPU Shader</strong>
          </div>

          <div v-else-if="initError" class="stage-message stage-message--error" role="alert">
            <v-icon icon="mdi-alert-circle-outline" color="error" size="48" />
            <strong>Shader 初始化失败</strong>
            <span>{{ initError }}</span>
            <v-btn color="primary" variant="tonal" @click="initializePixi">重试</v-btn>
          </div>

          <div v-else-if="isPaused" class="stage-message stage-message--compact" role="status">
            <v-icon icon="mdi-pause-circle-outline" size="50" />
            <strong>动画已暂停</strong>
          </div>

        </section>

        <aside class="shader-controls solid-card" aria-label="Shader 参数控制台">
          <div class="controls-heading">
            <div class="controls-heading__icon">
              <v-icon :icon="activeEffectMeta.icon" size="24" />
            </div>
            <div>
              <strong>{{ activeEffectMeta.label }}</strong>
            </div>
          </div>

          <v-divider />

          <div class="control-group">
            <div class="control-label-row">
              <label>效果强度</label>
              <span>{{ intensity.toFixed(2) }}</span>
            </div>
            <v-slider
              v-model="intensity"
              :min="0"
              :max="2"
              :step="0.05"
              color="primary"
              density="compact"
              hide-details
            />
          </div>

          <div class="control-group">
            <div class="control-label-row">
              <label>动画速度</label>
              <span>{{ animationSpeed.toFixed(1) }}×</span>
            </div>
            <v-slider
              v-model="animationSpeed"
              :min="0.1"
              :max="2.5"
              :step="0.1"
              color="info"
              density="compact"
              hide-details
            />
          </div>

          <v-select
            v-model="renderResolution"
            :items="resolutionOptions"
            label="渲染精度"
            variant="outlined"
            density="compact"
            hide-details
          />

          <v-file-input
            accept="image/*"
            clearable
            density="compact"
            variant="outlined"
            prepend-icon="mdi-image-plus-outline"
            label="载入本地图片"
            @update:model-value="handleImageFile"
            @click:clear="restoreDefaultTexture"
          />

          <v-alert
            v-if="uploadError"
            type="error"
            variant="tonal"
            density="compact"
          >
            {{ uploadError }}
          </v-alert>

          <div class="source-info">
            <v-icon icon="mdi-image-outline" size="18" />
            <span>{{ sourceName }}</span>
          </div>

          <div class="control-actions">
            <v-btn
              :prepend-icon="isPaused ? 'mdi-play' : 'mdi-pause'"
              :color="isPaused ? 'success' : 'primary'"
              variant="tonal"
              :disabled="isInitializing || !!initError"
              @click="togglePause"
            >
              {{ isPaused ? '继续' : '暂停' }}
            </v-btn>
            <v-btn
              prepend-icon="mdi-tune-variant"
              variant="outlined"
              :disabled="isInitializing || !!initError"
              @click="resetParameters"
            >
              重置参数
            </v-btn>
          </div>
        </aside>
      </div>

    </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue'
import {
  Application,
  Container,
  defaultFilterVert,
  Filter,
  RendererType,
  Sprite,
  Texture,
  UniformGroup,
  type Ticker
} from 'pixi.js'

type ShaderEffect = 'ripple' | 'blackHole' | 'aurora' | 'lava' | 'crt'

interface EffectDefinition {
  value: ShaderEffect
  mode: number
  label: string
  icon: string
}

type ShaderUniformDefinitions = {
  uTime: {value: number, type: 'f32'}
  uIntensity: {value: number, type: 'f32'}
  uSpeed: {value: number, type: 'f32'}
  uPointer: {value: Float32Array, type: 'vec2<f32>'}
  uResolution: {value: Float32Array, type: 'vec2<f32>'}
}

const effects: EffectDefinition[] = [
  {
    value: 'ripple',
    mode: 0,
    label: '水波',
    icon: 'mdi-waves'
  },
  {
    value: 'blackHole',
    mode: 1,
    label: '黑洞',
    icon: 'mdi-circle-opacity'
  },
  {
    value: 'aurora',
    mode: 2,
    label: '极光',
    icon: 'mdi-weather-night'
  },
  {
    value: 'lava',
    mode: 3,
    label: '熔岩',
    icon: 'mdi-fire'
  },
  {
    value: 'crt',
    mode: 4,
    label: 'CRT 故障',
    icon: 'mdi-television-classic'
  }
]

const resolutionOptions = [
  {title: '100%', value: 1},
  {title: '75%', value: 0.75},
  {title: '50%', value: 0.5}
]

const FILTER_FRAGMENT_SOURCE = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputClamp;
uniform float uTime;
uniform float uIntensity;
uniform float uSpeed;
uniform vec2 uPointer;
uniform vec2 uResolution;

float hash21(vec2 point) {
    point = fract(point * vec2(123.34, 456.21));
    point += dot(point, point + 45.32);
    return fract(point.x * point.y);
}

float valueNoise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    float a = hash21(cell);
    float b = hash21(cell + vec2(1.0, 0.0));
    float c = hash21(cell + vec2(0.0, 1.0));
    float d = hash21(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
    for (int octave = 0; octave < 5; octave++) {
        value += valueNoise(point) * amplitude;
        point = rotation * point * 2.03 + 17.1;
        amplitude *= 0.5;
    }
    return value;
}

mat2 rotate2d(float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return mat2(cosine, -sine, sine, cosine);
}

vec2 textureUv(vec2 uv) {
    return mix(uInputClamp.xy, uInputClamp.zw, clamp(uv, 0.0, 1.0));
}

vec4 sampleSource(vec2 uv) {
    return texture(uTexture, textureUv(uv));
}

#if EFFECT_MODE == 0
vec4 rippleEffect(vec2 uv, float time) {
    float aspect = uResolution.x / max(1.0, uResolution.y);
    vec2 delta = uv - uPointer;
    vec2 corrected = delta * vec2(aspect, 1.0);
    float distanceFromPointer = length(corrected);
    float wave = sin(distanceFromPointer * 68.0 - time * 7.0);
    wave *= exp(-distanceFromPointer * 5.5) * uIntensity;
    vec2 direction = normalize(corrected + vec2(0.0001));
    vec2 offset = direction / vec2(aspect, 1.0) * wave * 0.020;
    vec4 source = sampleSource(uv);
    vec4 distorted = sampleSource(uv + offset);
    vec4 color = mix(source, distorted, clamp(abs(wave) * 1.8, 0.0, 1.0));
    float ring = exp(-abs(distanceFromPointer - 0.16) * 42.0);
    float highlight = max(0.0, wave) * 0.24 + ring * 0.32 * uIntensity;
    color.rgb += vec3(0.08, 0.58, 0.92) * highlight;
    return vec4(color.rgb, 1.0);
}

#elif EFFECT_MODE == 1
vec4 blackHoleEffect(vec2 uv, float time) {
    float aspect = uResolution.x / max(1.0, uResolution.y);
    vec2 point = (uv - uPointer) * vec2(aspect, 1.0);
    float radius = length(point);
    float lens = uIntensity * 0.085 / (radius + 0.045);
    vec2 warped = rotate2d(lens + sin(time * 0.55) * 0.025) * point;
    warped *= 1.0 + uIntensity * 0.030 / (radius + 0.035);
    vec2 sampleUv = uPointer + warped / vec2(aspect, 1.0);
    vec4 source = sampleSource(uv);
    vec4 warpedColor = sampleSource(sampleUv);
    float lensMask = (1.0 - smoothstep(0.04, 0.48, radius)) * clamp(uIntensity, 0.0, 2.0);
    vec4 color = mix(source, warpedColor, clamp(lensMask, 0.0, 1.0));
    float horizon = 1.0 - smoothstep(0.045, 0.105, radius);
    float disk = exp(-abs(radius - 0.155) * 54.0);
    float halo = exp(-radius * 7.0) * (1.0 - horizon);
    float asymmetry = 0.55 + 0.45 * sin(atan(point.y, point.x) + time * 1.8);
    vec3 diskColor = mix(vec3(0.12, 0.38, 1.0), vec3(1.0, 0.42, 0.08), asymmetry);
    color.rgb = color.rgb * (1.0 - horizon * 0.99);
    color.rgb += diskColor * (disk * 1.35 + halo * 0.20) * uIntensity;
    return vec4(color.rgb, 1.0);
}

#elif EFFECT_MODE == 2
vec4 auroraEffect(vec2 uv, float time) {
    vec4 source = sampleSource(uv);
    vec2 point = uv;
    float flow = fbm(vec2(point.x * 2.4 + time * 0.08, point.y * 1.7 - time * 0.04));
    float ribbonA = exp(-abs(point.y - 0.42 - sin(point.x * 5.0 + time * 0.7) * 0.10 - flow * 0.16) * 17.0);
    float ribbonB = exp(-abs(point.y - 0.60 - sin(point.x * 7.0 - time * 0.5) * 0.07 + flow * 0.10) * 23.0);
    float curtain = (ribbonA + ribbonB * 0.72) * (0.58 + flow * 0.62);
    vec3 cyan = vec3(0.05, 0.92, 0.72);
    vec3 violet = vec3(0.28, 0.32, 1.0);
    vec3 aurora = mix(cyan, violet, clamp(point.x + flow * 0.3, 0.0, 1.0));
    vec3 result = source.rgb * 0.42 + aurora * curtain * uIntensity;
    result += vec3(0.04, 0.10, 0.22) * flow;
    return vec4(result, source.a);
}

#elif EFFECT_MODE == 3
vec4 lavaEffect(vec2 uv, float time) {
    vec4 source = sampleSource(uv);
    vec2 point = uv * 4.1;
    float warpA = fbm(point + vec2(time * 0.12, -time * 0.09));
    float warpB = fbm(point * 1.8 + vec2(-time * 0.16, time * 0.11) + warpA * 2.2);
    float field = smoothstep(0.36, 0.82, warpA * 0.58 + warpB * 0.72);
    float veins = smoothstep(0.70, 0.98, 1.0 - abs(warpA - warpB));
    vec3 rock = vec3(0.035, 0.025, 0.055);
    vec3 ember = mix(vec3(0.68, 0.045, 0.01), vec3(1.0, 0.72, 0.08), field);
    vec3 lava = mix(rock, ember, field) + vec3(1.0, 0.24, 0.02) * veins * field;
    vec3 result = mix(source.rgb * 0.28, lava, clamp(uIntensity * 0.78, 0.0, 1.0));
    return vec4(result, source.a);
}

#else
vec4 crtEffect(vec2 uv, float time) {
    vec4 source = sampleSource(uv);
    vec2 centered = uv - 0.5;
    float radiusSquared = dot(centered, centered);
    vec2 warped = 0.5 + centered * (1.0 + radiusSquared * 0.28 * uIntensity);
    float row = floor((uv.y + time * 0.08) * 90.0);
    float glitchGate = step(0.92, hash21(vec2(row, floor(time * 9.0))));
    float glitch = (hash21(vec2(row, time)) - 0.5) * 0.055 * glitchGate * uIntensity;
    warped.x += glitch;
    float separation = (0.0018 + glitchGate * 0.005) * uIntensity;
    float red = sampleSource(warped + vec2(separation, 0.0)).r;
    float green = sampleSource(warped).g;
    float blue = sampleSource(warped - vec2(separation, 0.0)).b;
    float scanline = 0.84 + 0.16 * sin(uv.y * uResolution.y * 3.14159);
    float staticNoise = (hash21(gl_FragCoord.xy + time * 73.0) - 0.5) * 0.07 * uIntensity;
    float vignette = 1.0 - smoothstep(0.22, 0.78, radiusSquared);
    vec3 separated = vec3(red, green, blue);
    vec3 color = mix(source.rgb, separated, clamp(0.45 + uIntensity * 0.25, 0.0, 1.0));
    color = (color + staticNoise) * scanline * vignette;
    return vec4(color, 1.0);
}
#endif

void main() {
    vec2 inputRange = max(uInputClamp.zw - uInputClamp.xy, vec2(0.0001));
    vec2 uv = clamp((vTextureCoord - uInputClamp.xy) / inputRange, 0.0, 1.0);
    float time = uTime * uSpeed;
#if EFFECT_MODE == 0
    finalColor = rippleEffect(uv, time);
#elif EFFECT_MODE == 1
    finalColor = blackHoleEffect(uv, time);
#elif EFFECT_MODE == 2
    finalColor = auroraEffect(uv, time);
#elif EFFECT_MODE == 3
    finalColor = lavaEffect(uv, time);
#else
    finalColor = crtEffect(uv, time);
#endif
}
`

function createFilterFragment(mode: number) {
  return `#define EFFECT_MODE ${mode}\n${FILTER_FRAGMENT_SOURCE}`
}

const stageRef = ref<HTMLElement | null>(null)
const activeEffect = ref<ShaderEffect>('ripple')
const intensity = ref(1)
const animationSpeed = ref(1)
const renderResolution = ref(1)
const isPaused = ref(false)
const isInitializing = ref(false)
const initError = ref('')
const uploadError = ref('')
const sourceName = ref('Tool Hub 默认测试图')
const displayedFps = ref(0)
const rendererName = ref('初始化中')
const pointer = reactive({x: 0.5, y: 0.5})

let pixiApp: Application | null = null
let effectLayer: Container | null = null
let sourceSprite: Sprite | null = null
let sourceTexture: Texture | null = null
let shaderUniforms: UniformGroup<ShaderUniformDefinitions> | null = null
const effectFilters = new Map<ShaderEffect, Filter>()
let isUnmounted = false
let statsElapsed = 0
let lastStageWidth = 0
let lastStageHeight = 0

const activeEffectMeta = computed(() => effects.find(effect => effect.value === activeEffect.value) || effects[0])
const showsPointer = computed(() => activeEffect.value === 'ripple' || activeEffect.value === 'blackHole')
const pointerStyle = computed(() => ({left: `${pointer.x * 100}%`, top: `${pointer.y * 100}%`}))

function cssToken(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function createDefaultCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 1440
  canvas.height = 900
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法创建图片画布')

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, cssToken('--color-primary-dark'))
  gradient.addColorStop(0.48, cssToken('--color-text'))
  gradient.addColorStop(1, cssToken('--color-info'))
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.strokeStyle = cssToken('--color-primary-light')
  context.globalAlpha = 0.16
  context.lineWidth = 1
  for (let x = 0; x <= canvas.width; x += 72) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, canvas.height)
    context.stroke()
  }
  for (let y = 0; y <= canvas.height; y += 72) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(canvas.width, y)
    context.stroke()
  }

  context.globalAlpha = 0.92
  context.fillStyle = cssToken('--color-surface')
  context.font = '800 86px system-ui, sans-serif'
  context.fillText('GPU SHADER LAB', 92, 170)
  context.globalAlpha = 0.7
  context.font = '500 30px system-ui, sans-serif'
  context.fillText('Move the pointer · bend the pixels · feel the GPU', 98, 224)

  const colors = [
    cssToken('--color-primary'),
    cssToken('--color-info'),
    cssToken('--color-success'),
    cssToken('--color-warning'),
    cssToken('--color-error')
  ]
  colors.forEach((color, index) => {
    context.globalAlpha = 0.72
    context.fillStyle = color
    context.beginPath()
    context.arc(230 + index * 235, 560 + Math.sin(index * 1.5) * 90, 105 - index * 7, 0, Math.PI * 2)
    context.fill()
  })
  context.globalAlpha = 1
  return canvas
}

function replaceSourceTexture(texture: Texture, name: string) {
  const previousTexture = sourceTexture
  sourceTexture = texture
  sourceName.value = name
  if (sourceSprite) {
    sourceSprite.texture = texture
  }
  fitSourceSprite()
  previousTexture?.destroy(true)
  renderIfPaused()
}

function restoreDefaultTexture() {
  uploadError.value = ''
  replaceSourceTexture(Texture.from(createDefaultCanvas()), 'Tool Hub 默认测试图')
}

async function handleImageFile(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] : value
  if (!file) return
  uploadError.value = ''

  if (!file.type.startsWith('image/')) {
    uploadError.value = '请选择图片文件。'
    return
  }
  if (file.size > 15 * 1024 * 1024) {
    uploadError.value = '图片不能超过 15 MB。'
    return
  }

  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 1000
    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法创建图片纹理')

    const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height)
    const width = bitmap.width * scale
    const height = bitmap.height * scale
    context.drawImage(bitmap, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
    bitmap.close()
    replaceSourceTexture(Texture.from(canvas), file.name)
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : '图片读取失败。'
  }
}

function rendererLabel(type: RendererType) {
  if (type === RendererType.WEBGL) return 'WebGL 2'
  if (type === RendererType.WEBGPU) return 'WebGPU'
  if (type === RendererType.CANVAS) return 'Canvas'
  return 'GPU'
}

function fitSourceSprite() {
  if (!pixiApp || !sourceSprite || !sourceTexture) return
  const width = pixiApp.screen.width
  const height = pixiApp.screen.height
  const textureWidth = Math.max(1, sourceTexture.width)
  const textureHeight = Math.max(1, sourceTexture.height)
  const scale = Math.max(width / textureWidth, height / textureHeight)
  sourceSprite.anchor.set(0.5)
  sourceSprite.position.set(width / 2, height / 2)
  sourceSprite.scale.set(scale)
  if (effectLayer) effectLayer.filterArea = pixiApp.screen
}

function updateUniforms() {
  if (!shaderUniforms) return
  shaderUniforms.uniforms.uIntensity = intensity.value
  shaderUniforms.uniforms.uSpeed = animationSpeed.value
  const pointerUniform = shaderUniforms.uniforms.uPointer as Float32Array
  pointerUniform[0] = pointer.x
  pointerUniform[1] = pointer.y
  const resolutionUniform = shaderUniforms.uniforms.uResolution as Float32Array
  resolutionUniform[0] = pixiApp?.screen.width || 1
  resolutionUniform[1] = pixiApp?.screen.height || 1
}

function updateShader(ticker: Ticker) {
  if (!shaderUniforms || !pixiApp) return
  shaderUniforms.uniforms.uTime += Math.min(ticker.deltaMS, 34) / 1000
  updateUniforms()

  const width = pixiApp.screen.width
  const height = pixiApp.screen.height
  if (width !== lastStageWidth || height !== lastStageHeight) {
    lastStageWidth = width
    lastStageHeight = height
    fitSourceSprite()
  }

  statsElapsed += ticker.deltaMS
  if (statsElapsed >= 300) {
    displayedFps.value = Math.round(ticker.FPS)
    statsElapsed = 0
  }
}

function handlePointerMove(event: PointerEvent) {
  const canvas = pixiApp?.canvas
  if (!canvas) return
  const bounds = canvas.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return
  pointer.x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
  pointer.y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
  updateUniforms()
  renderIfPaused()
}

function renderIfPaused() {
  if (isPaused.value && pixiApp) pixiApp.render()
}

function togglePause() {
  if (!pixiApp) return
  isPaused.value = !isPaused.value
  if (isPaused.value) pixiApp.stop()
  else pixiApp.start()
}

function resetParameters() {
  intensity.value = 1
  animationSpeed.value = 1
  renderResolution.value = 1
  pointer.x = 0.5
  pointer.y = 0.5
  updateUniforms()
  renderIfPaused()
}

function handleVisibilityChange() {
  if (!pixiApp) return
  if (document.hidden) pixiApp.stop()
  else if (!isPaused.value) pixiApp.start()
}

function activateEffectFilter() {
  if (!effectLayer || !shaderUniforms) return
  let filter = effectFilters.get(activeEffect.value)
  if (!filter) {
    filter = Filter.from({
      gl: {
        vertex: defaultFilterVert,
        fragment: createFilterFragment(activeEffectMeta.value.mode),
        name: `tool-hub-shader-${activeEffect.value}`
      },
      resources: {shaderUniforms},
      resolution: renderResolution.value,
      antialias: 'off'
    })
    effectFilters.set(activeEffect.value, filter)
  }
  effectLayer.filters = [filter]
  renderIfPaused()
}

async function initializePixi() {
  if (!stageRef.value || pixiApp || isInitializing.value) return
  initError.value = ''
  isInitializing.value = true
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

    const uniforms = new UniformGroup<ShaderUniformDefinitions>({
      uTime: {value: 0, type: 'f32'},
      uIntensity: {value: 1, type: 'f32'},
      uSpeed: {value: 1, type: 'f32'},
      uPointer: {value: new Float32Array([0.5, 0.5]), type: 'vec2<f32>'},
      uResolution: {value: new Float32Array([app.screen.width, app.screen.height]), type: 'vec2<f32>'}
    })
    const texture = Texture.from(createDefaultCanvas())
    const sprite = new Sprite(texture)
    const layer = new Container()
    layer.addChild(sprite)

    pixiApp = app
    shaderUniforms = uniforms
    sourceTexture = texture
    sourceSprite = sprite
    effectLayer = layer
    activateEffectFilter()
    rendererName.value = rendererLabel(app.renderer.type)
    app.canvas.className = 'shader-canvas'
    app.canvas.setAttribute('role', 'img')
    app.canvas.setAttribute('aria-label', 'PixiJS GPU Shader 实时预览画布')
    stageRef.value.appendChild(app.canvas)
    app.stage.addChild(layer)
    fitSourceSprite()
    updateUniforms()
    app.ticker.maxFPS = 60
    app.ticker.add(updateShader)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    isInitializing.value = false
  } catch (error) {
    app.destroy({removeView: true})
    pixiApp = null
    isInitializing.value = false
    initError.value = error instanceof Error ? error.message : '当前环境无法创建 WebGL Shader。'
  }
}

watch([activeEffect, intensity, animationSpeed], () => {
  updateUniforms()
  activateEffectFilter()
  renderIfPaused()
})

watch(renderResolution, value => {
  effectFilters.forEach(filter => {
    filter.resolution = value
  })
  renderIfPaused()
})

onMounted(() => {
  void initializePixi()
})

onBeforeUnmount(() => {
  isUnmounted = true
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (pixiApp) {
    pixiApp.ticker.remove(updateShader)
    pixiApp.destroy({removeView: true}, {children: true})
  }
  effectFilters.forEach(filter => filter.destroy())
  effectFilters.clear()
  sourceTexture?.destroy(true)
  pixiApp = null
  effectLayer = null
  sourceSprite = null
  sourceTexture = null
  shaderUniforms = null
})
</script>

<style scoped>
.shader-lab {
  display: grid;
  gap: 14px;
}

.effect-strip {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 20px;
  padding: 14px 16px;
  border-radius: var(--radius-element);
}

.effect-strip :deep(.v-btn) {
  text-transform: none;
}

.shader-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 14px;
}

.shader-stage {
  position: relative;
  isolation: isolate;
  height: clamp(510px, 68vh, 760px);
  min-height: 510px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--color-primary) 24%, var(--color-border));
  border-radius: var(--radius-card);
  background: color-mix(in srgb, var(--color-text) 94%, var(--color-primary));
  box-shadow: var(--shadow-card);
  cursor: crosshair;
  touch-action: none;
  user-select: none;
}

.shader-stage :deep(.shader-canvas) {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
}

.stage-stats {
  position: absolute;
  z-index: 3;
  top: 14px;
  left: 14px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  max-width: calc(100% - 28px);
  padding: 7px;
  border: 1px solid color-mix(in srgb, var(--color-surface) 18%, transparent);
  border-radius: var(--radius-element);
  background: color-mix(in srgb, var(--color-text) 76%, transparent);
  color: var(--color-surface);
  backdrop-filter: blur(12px);
}

.stage-stats > span {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 2px 7px;
}

.stage-stats small {
  color: color-mix(in srgb, var(--color-surface) 66%, transparent);
  font-size: 0.67rem;
  text-transform: uppercase;
}

.stage-stats strong {
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}

.pointer-focus {
  position: absolute;
  z-index: 2;
  width: 34px;
  height: 34px;
  transform: translate(-50%, -50%);
  border: 2px solid color-mix(in srgb, var(--color-info) 72%, var(--color-surface));
  border-radius: var(--radius-pill);
  box-shadow:
    0 0 24px color-mix(in srgb, var(--color-info) 70%, transparent),
    0 0 64px color-mix(in srgb, var(--color-primary) 52%, transparent);
  pointer-events: none;
}

.pointer-focus--blackHole {
  border-color: color-mix(in srgb, var(--color-warning) 76%, var(--color-surface));
  background: color-mix(in srgb, var(--color-text) 72%, transparent);
  box-shadow:
    0 0 28px color-mix(in srgb, var(--color-warning) 68%, transparent),
    0 0 76px color-mix(in srgb, var(--color-error) 48%, transparent);
}

.stage-message {
  position: absolute;
  z-index: 5;
  top: 50%;
  left: 50%;
  display: flex;
  width: min(350px, calc(100% - 40px));
  padding: 24px;
  align-items: center;
  flex-direction: column;
  gap: 12px;
  transform: translate(-50%, -50%);
  border: 1px solid color-mix(in srgb, var(--color-surface) 20%, transparent);
  border-radius: var(--radius-card);
  background: color-mix(in srgb, var(--color-text) 84%, transparent);
  color: var(--color-surface);
  text-align: center;
  backdrop-filter: blur(16px);
}

.stage-message span {
  color: color-mix(in srgb, var(--color-surface) 72%, transparent);
  font-size: 0.84rem;
}

.stage-message--error strong {
  color: color-mix(in srgb, var(--color-error) 52%, var(--color-surface));
}

.stage-message--compact {
  width: auto;
}

.shader-controls {
  display: flex;
  min-width: 0;
  padding: 18px;
  flex-direction: column;
  gap: 18px;
  border-radius: var(--radius-card);
}

.controls-heading {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}

.controls-heading__icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radius-element);
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.controls-heading strong {
  color: var(--color-text);
}

.control-group {
  min-width: 0;
}

.control-label-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 3px;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.control-label-row span {
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.source-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 9px 10px;
  border-radius: var(--radius-element);
  background: var(--color-bg);
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.source-info span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: auto;
}

@media (max-width: 1100px) {
  .effect-strip {
    align-items: stretch;
    flex-direction: column;
  }

  .effect-strip :deep(.v-btn-toggle) {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    width: 100%;
  }

  .shader-workspace {
    grid-template-columns: 1fr;
  }

  .shader-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .controls-heading,
  .shader-controls > .v-divider,
  .source-info,
  .control-actions,
  .shader-controls > .v-alert {
    grid-column: 1 / -1;
  }
}

@media (max-width: 700px) {
  .effect-strip :deep(.v-btn-toggle) {
    grid-template-columns: repeat(2, 1fr);
    height: auto;
  }

  .effect-strip :deep(.v-btn) {
    min-width: 0;
    font-size: 0.75rem;
  }

  .shader-stage {
    height: 56vh;
    min-height: 450px;
  }

  .shader-controls {
    display: flex;
  }

}

@media (prefers-reduced-motion: reduce) {
  .pointer-focus {
    transition: none;
  }
}
</style>
