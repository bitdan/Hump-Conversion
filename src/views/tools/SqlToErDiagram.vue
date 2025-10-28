<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center py-8 px-4">
    <div class="w-full max-w-6xl bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl p-8">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          SQL 转 ER 图工具
        </h1>
        <p class="text-gray-600 mt-2">输入 SQL 语句，自动生成实体关系图</p>
      </div>

      <!-- 输入区域 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- SQL 输入区 -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-700">SQL 输入</h2>
            <div class="flex gap-2">
              <button
                  @click="parseSql"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                解析 SQL
              </button>
              <button
                  @click="clearAll"
                  class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                清空
              </button>
            </div>
          </div>

          <div class="relative h-full">
            <textarea
                v-model="sqlInput"
                placeholder="输入 SQL 语句，例如 CREATE TABLE 语句..."
                class="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 resize-none font-mono"
                spellcheck="false"
            ></textarea>
            <div class="absolute bottom-4 right-4 text-sm text-gray-500">
              {{ sqlInput.length }} 字符
            </div>
          </div>
        </div>

        <!-- ER 图展示区 -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-700">ER 图</h2>
            <div class="flex gap-2">
              <button
                  @click="downloadDiagram"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  :disabled="!hasDiagram"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                下载图片
              </button>
            </div>
          </div>

          <div class="relative h-96 bg-white rounded-lg border border-gray-300 overflow-hidden">
            <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>

            <div v-if="!hasDiagram && !loading" class="absolute inset-0 flex items-center justify-center">
              <div class="text-center text-gray-500">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="mt-2">暂无 ER 图</p>
                <p class="text-sm">请在左侧输入 SQL 语句并点击解析</p>
              </div>
            </div>

            <div v-if="hasDiagram && !loading" ref="diagramContainer" class="h-full w-full p-4 overflow-auto">
              <!-- ER 图将通过 SVG 渲染在这里 -->
              <svg :width="svgWidth" :height="svgHeight" xmlns="http://www.w3.org/2000/svg">
                <!-- 绘制关系线 -->
                <g v-for="(relation, index) in relations" :key="'relation-' + index">
                  <path
                      :d="relation.path"
                      stroke="#6366f1"
                      stroke-width="2"
                      fill="none"
                      marker-end="url(#arrowhead)"
                  />
                  <text
                      :x="relation.textX"
                      :y="relation.textY"
                      text-anchor="middle"
                      font-size="12"
                      fill="#4b5563"
                  >
                    {{ relation.label }}
                  </text>
                </g>

                <!-- 绘制实体框 -->
                <g v-for="(entity, index) in entities" :key="'entity-' + index">
                  <rect
                      :x="entity.x"
                      :y="entity.y"
                      :width="entity.width"
                      :height="entity.height"
                      rx="8"
                      fill="white"
                      stroke="#3b82f6"
                      stroke-width="2"
                  />

                  <!-- 实体名称 -->
                  <text
                      :x="entity.x + entity.width / 2"
                      :y="entity.y + 30"
                      text-anchor="middle"
                      font-size="14"
                      font-weight="bold"
                      fill="#1e40af"
                  >
                    {{ entity.name }}
                  </text>

                  <!-- 属性列表 -->
                  <g v-for="(attr, attrIndex) in entity.attributes" :key="'attr-' + index + '-' + attrIndex">
                    <rect
                        :x="entity.x + 10"
                        :y="entity.y + 40 + attrIndex * 25"
                        :width="entity.width - 20"
                        height="20"
                        rx="4"
                        fill="#f3f4f6"
                        stroke="#d1d5db"
                        stroke-width="1"
                    />
                    <text
                        :x="entity.x + 15"
                        :y="entity.y + 55 + attrIndex * 25"
                        font-size="12"
                        fill="#4b5563"
                    >
                      {{ attr.name }}: {{ attr.type }}
                      <tspan v-if="attr.pk" fill="#ef4444"> PK</tspan>
                      <tspan v-if="attr.fk" fill="#10b981"> FK</tspan>
                    </text>
                  </g>
                </g>

                <!-- 箭头标记定义 -->
                <defs>
                  <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1"/>
                  </marker>
                </defs>
              </svg>
            </div>
          </div>

          <!-- 解析结果摘要 -->
          <div v-if="hasDiagram" class="bg-white/80 rounded-lg p-4 border border-gray-200">
            <div class="grid grid-cols-3 gap-4 text-center">
              <div class="p-2">
                <div class="text-2xl font-bold text-blue-600">{{ entities.length }}</div>
                <div class="text-sm text-gray-600">实体</div>
              </div>
              <div class="p-2">
                <div class="text-2xl font-bold text-indigo-600">{{ relations.length }}</div>
                <div class="text-sm text-gray-600">关系</div>
              </div>
              <div class="p-2">
                <div class="text-2xl font-bold text-green-600">{{ totalAttributes }}</div>
                <div class="text-sm text-gray-600">属性</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMessage" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>{{ errorMessage }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, nextTick, ref} from 'vue'

const sqlInput = ref('')
const loading = ref(false)
const errorMessage = ref('')
const diagramContainer = ref(null)

// ER 图数据
const entities = ref([])
const relations = ref([])
const svgWidth = ref(1200)  // 增加宽度以容纳更多表
const svgHeight = ref(800)  // 增加高度以容纳更多表

// 计算属性
const hasDiagram = computed(() => entities.value.length > 0)
const totalAttributes = computed(() => {
  return entities.value.reduce((sum, entity) => sum + (entity.attributes?.length || 0), 0)
})

// 清空所有
const clearAll = () => {
  sqlInput.value = ''
  entities.value = []
  relations.value = []
  errorMessage.value = ''
}

// 解析 SQL
const parseSql = () => {
  if (!sqlInput.value.trim()) {
    errorMessage.value = '请输入 SQL 语句'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    // 模拟解析过程
    setTimeout(() => {
      try {
        const parsedData = parseSqlToEr(sqlInput.value)
        entities.value = parsedData.entities
        relations.value = parsedData.relations
        adjustDiagramLayout()
      } catch (err) {
        errorMessage.value = err.message || '解析 SQL 失败'
        console.error('解析错误:', err)
      } finally {
        loading.value = false
      }
    }, 500)
  } catch (err) {
    errorMessage.value = '解析 SQL 失败'
    console.error('解析错误:', err)
    loading.value = false
  }
}

// 增强版 SQL 解析器
const parseSqlToEr = (sql) => {
  const entities = []
  const relations = []

  // 处理反引号、注释和 ENGINE 等额外信息
  const createTableRegex = /CREATE\s+TABLE\s+(?:`?(\w+)`?)\s*\(([\s\S]+?)\)(?:\s*(?:ENGINE\s*=\s*\w+|AUTO_INCREMENT\s*=\s*\d+|COMMENT\s*=\s*'[^']*')\s*)*;/g
  let tableMatch

  while ((tableMatch = createTableRegex.exec(sql)) !== null) {
    const tableName = tableMatch[1]
    const tableBody = tableMatch[2]

    const attributes = []
    let primaryKey = null
    const foreignKeys = []

    // 解析表字段 - 处理反引号、注释和默认值
    const columnLines = tableBody.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('--') && !line.startsWith('/*'))

    for (const line of columnLines) {
      // 跳过约束行
      if (line.startsWith('PRIMARY KEY') || line.startsWith('FOREIGN KEY') || line.startsWith('UNIQUE') || line.startsWith('KEY')) {
        // 处理主键约束
        if (line.startsWith('PRIMARY KEY')) {
          const pkMatch = line.match(/PRIMARY\s+KEY\s*(?:\(`?(\w+)`?\)|USING\s+\w+\s*\(`?(\w+)`?\))/)
          if (pkMatch) {
            primaryKey = pkMatch[1] || pkMatch[2]
          }
        }
        // 处理外键约束
        if (line.startsWith('FOREIGN KEY')) {
          const fkMatch = line.match(/FOREIGN\s+KEY\s*\(`?(\w+)`?\)\s*REFERENCES\s+(?:`?(\w+)`?)\s*\(`?(\w+)`?\)/)
          if (fkMatch) {
            foreignKeys.push({
              column: fkMatch[1],
              refTable: fkMatch[2],
              refColumn: fkMatch[3]
            })
          }
        }
        continue
      }

      // 解析字段定义 - 处理反引号、类型、默认值和注释
      const columnMatch = line.match(/^`?(\w+)`?\s+([\w\(\)]+)\s*(?:NOT\s+NULL)?\s*(?:DEFAULT\s+(?:NULL|'[^']*'|\d+))?\s*(?:AUTO_INCREMENT)?\s*(?:COMMENT\s+'[^']*')?/)
      if (columnMatch) {
        const columnName = columnMatch[1]
        const columnType = columnMatch[2]

        const isPk = columnName === primaryKey || line.includes('PRIMARY KEY')
        const isFk = foreignKeys.some(fk => fk.column === columnName)

        attributes.push({
          name: columnName,
          type: columnType,
          pk: isPk,
          fk: isFk
        })
      }
    }

    entities.push({
      name: tableName,
      attributes: attributes,
      x: 0,
      y: 0,
      width: 220,  // 增加宽度以容纳更长的字段名
      height: 40 + attributes.length * 25
    })

    // 添加关系
    for (const fk of foreignKeys) {
      relations.push({
        from: tableName,
        to: fk.refTable,
        label: `${fk.column} → ${fk.refColumn}`
      })
    }
  }

  // 处理多对多关系（通过中间表）
  const studentCourseTable = entities.find(e => e.name === 't_student_course')
  if (studentCourseTable) {
    const studentIdAttr = studentCourseTable.attributes.find(a => a.name === 'student_id')
    const courseIdAttr = studentCourseTable.attributes.find(a => a.name === 'course_id')

    if (studentIdAttr && courseIdAttr) {
      relations.push({
        from: 't_student',
        to: 't_student_course',
        label: '多对多'
      })
      relations.push({
        from: 't_course',
        to: 't_student_course',
        label: '多对多'
      })
    }
  }

  return {entities, relations}
}

// 调整图表布局 - 改进版
const adjustDiagramLayout = () => {
  nextTick(() => {
    if (entities.value.length === 0) return

    // 根据表数量决定布局方式
    if (entities.value.length <= 3) {
      // 少于等于3个表，使用三角形布局
      const centerX = svgWidth.value / 2
      const centerY = svgHeight.value / 2
      const radius = Math.min(svgWidth.value, svgHeight.value) * 0.35
      const angleStep = (2 * Math.PI) / entities.value.length

      entities.value.forEach((entity, index) => {
        const angle = index * angleStep
        entity.x = centerX + Math.cos(angle) * radius - entity.width / 2
        entity.y = centerY + Math.sin(angle) * radius - entity.height / 2
      })
    } else {
      // 多于3个表，使用网格布局
      const cols = Math.ceil(Math.sqrt(entities.value.length))
      const cellWidth = svgWidth.value / (cols + 1)
      const cellHeight = svgHeight.value / (cols + 1)

      entities.value.forEach((entity, index) => {
        const row = Math.floor(index / cols)
        const col = index % cols
        entity.x = (col + 1) * cellWidth - entity.width / 2
        entity.y = (row + 1) * cellHeight - entity.height / 2
      })
    }

    // 计算关系路径
    relations.value.forEach(relation => {
      const fromEntity = entities.value.find(e => e.name === relation.from)
      const toEntity = entities.value.find(e => e.name === relation.to)

      if (fromEntity && toEntity) {
        const fromX = fromEntity.x + fromEntity.width / 2
        const fromY = fromEntity.y + fromEntity.height
        const toX = toEntity.x + toEntity.width / 2
        const toY = toEntity.y

        // 简单的贝塞尔曲线路径
        const midY = (fromY + toY) / 2
        relation.path = `M${fromX},${fromY} C${fromX},${midY} ${toX},${midY} ${toX},${toY}`
        relation.textX = (fromX + toX) / 2
        relation.textY = midY - 10
      }
    })
  })
}

// 下载图表 - 使用 Canvas 方法
const downloadDiagram = async () => {
  if (!diagramContainer.value) return

  const svgElement = diagramContainer.value.querySelector('svg')
  if (!svgElement) return

  try {
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    // 设置 Canvas 尺寸
    canvas.width = svgWidth.value
    canvas.height = svgHeight.value

    // 创建图片
    const img = new Image()
    const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'})
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      // 绘制白色背景
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 绘制 SVG
      ctx.drawImage(img, 0, 0)

      // 创建下载链接
      const a = document.createElement('a')
      a.download = 'er-diagram.png'
      a.href = canvas.toDataURL('image/png')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // 清理 URL
      URL.revokeObjectURL(url)
    }

    img.onerror = () => {
      console.error('图片加载失败')
      URL.revokeObjectURL(url)
    }

    img.src = url
  } catch (error) {
    console.error('导出图片失败:', error)
    // 降级方案：复制 SVG 代码到剪贴板
    fallbackExport()
  }
}

// 降级导出方案
const fallbackExport = () => {
  const svgElement = diagramContainer.value.querySelector('svg')
  if (svgElement) {
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const blob = new Blob([svgData], {type: 'image/svg+xml'})
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.download = 'er-diagram.svg'
    a.href = url
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)
  }
}
</script>

<style>
/* 添加一些动画效果 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

/* 增加 SVG 容器的滚动条样式 */
.diagram-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.diagram-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.diagram-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.diagram-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
