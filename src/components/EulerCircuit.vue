<template>
  <div class="container mx-auto p-5 bg-white rounded-lg shadow-md">
    <div class="flex flex-col items-center">
      <h1 class="text-2xl text-gray-800 py-5">欧拉回路求解</h1>

      <!-- 图的输入区域 -->
      <div class="w-full max-w-2xl mb-6">
        <v-textarea
          v-model="graphInput"
          label="输入邻接表 (每行格式: 顶点 相邻顶点1,相邻顶点2,...)"
          placeholder="示例:
1 2,3
2 1,3,4
3 1,2,4
4 2,3"
          rows="6"
          class="font-mono"
          :error-messages="inputError"
        />
      </div>

      <!-- 控制按钮 -->
      <div class="flex gap-4 mb-6">
        <v-btn
          color="primary"
          @click="checkAndFindCircuit"
          :loading="processing"
        >
          检查并求解
        </v-btn>
        <v-btn
          color="secondary"
          @click="useExample"
        >
          使用示例
        </v-btn>
        <v-btn
          color="error"
          @click="clearGraph"
        >
          清除
        </v-btn>
      </div>

      <!-- 结果显示区域 -->
      <div v-if="result" class="w-full max-w-2xl">
        <v-card class="mb-4">
          <v-card-text>
            <div class="mb-2">
              <span class="font-bold">判定结果：</span>
              <span :class="{'text-green-600': hasEulerCircuit, 'text-red-600': !hasEulerCircuit}">
                {{ hasEulerCircuit ? '存在欧拉回路' : '不存在欧拉回路' }}
              </span>
            </div>
            <div v-if="hasEulerCircuit">
              <div class="font-bold mb-1">欧拉回路：</div>
              <div class="bg-gray-50 p-3 rounded-lg font-mono">
                {{ eulerCircuit.join(' → ') }}
              </div>
            </div>
            <div v-if="!hasEulerCircuit && reason" class="text-red-600 mt-2">
              原因：{{ reason }}
            </div>
          </v-card-text>
        </v-card>

        <!-- 图的可视化 -->
        <div ref="graphContainer" class="w-full h-[400px] border rounded-lg"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'

// 状态变量
const graphInput = ref('')
const inputError = ref('')
const processing = ref(false)
const result = ref(false)
const hasEulerCircuit = ref(false)
const eulerCircuit = ref<number[]>([])
const reason = ref('')
const graphContainer = ref<HTMLElement | null>(null)
let network: Network | null = null

// 图数据结构
interface Graph {
  [key: number]: number[]
}

// 示例数据
const exampleGraph = `1 2,3
2 1,3,4
3 1,2,4
4 2,3`

// 使用示例数据
function useExample() {
  graphInput.value = exampleGraph
  checkAndFindCircuit()
}

// 清除图
function clearGraph() {
  graphInput.value = ''
  result.value = false
  inputError.value = ''
  hasEulerCircuit.value = false
  eulerCircuit.value = []
  reason.value = ''
  if (network) {
    network.destroy()
    network = null
  }
}

// 解析输入的邻接表
function parseGraph(input: string): Graph {
  const graph: Graph = {}
  const lines = input.trim().split('\n')
  
  for (const line of lines) {
    const [vertex, neighbors] = line.trim().split(/\s+/)
    const v = parseInt(vertex)
    if (isNaN(v)) {
      throw new Error(`无效的顶点: ${vertex}`)
    }
    
    graph[v] = neighbors.split(',').map(n => {
      const neighbor = parseInt(n)
      if (isNaN(neighbor)) {
        throw new Error(`无效的相邻顶点: ${n}`)
      }
      return neighbor
    })
  }
  
  return graph
}

// 检查图的连通性
function isConnected(graph: Graph): boolean {
  const visited = new Set<number>()
  const vertices = Object.keys(graph).map(Number)
  
  function dfs(vertex: number) {
    visited.add(vertex)
    for (const neighbor of graph[vertex]) {
      if (!visited.has(neighbor)) {
        dfs(neighbor)
      }
    }
  }
  
  dfs(vertices[0])
  return visited.size === vertices.length
}

// 检查顶点的度数
function checkDegrees(graph: Graph): boolean {
  for (const vertex in graph) {
    if (graph[vertex].length % 2 !== 0) {
      reason.value = `顶点 ${vertex} 的度数为奇数`
      return false
    }
  }
  return true
}

// Hierholzer 算法求欧拉回路
function findEulerCircuit(graph: Graph): number[] {
  const circuit: number[] = []
  const edges = new Map<number, Set<number>>()
  
  // 构建边集
  for (const vertex in graph) {
    const v = parseInt(vertex)
    edges.set(v, new Set(graph[v]))
  }
  
  function dfs(vertex: number) {
    const stack: number[] = [vertex]
    const path: number[] = []
    
    while (stack.length > 0) {
      const current = stack[stack.length - 1]
      const neighbors = edges.get(current)!
      
      if (neighbors.size === 0) {
        path.push(stack.pop()!)
      } else {
        const next = neighbors.values().next().value
        neighbors.delete(next)
        edges.get(next)!.delete(current)
        stack.push(next)
      }
    }
    
    return path
  }
  
  // 从第一个顶点开始
  const start = parseInt(Object.keys(graph)[0])
  return dfs(start).reverse()
}

// 检查并求解欧拉回路
async function checkAndFindCircuit() {
  processing.value = true
  inputError.value = ''
  result.value = false
  hasEulerCircuit.value = false
  eulerCircuit.value = []
  reason.value = ''
  
  try {
    const graph = parseGraph(graphInput.value)
    
    // 检查图是否为空
    if (Object.keys(graph).length === 0) {
      throw new Error('图不能为空')
    }
    
    // 检查连通性
    if (!isConnected(graph)) {
      reason.value = '图不是连通的'
      hasEulerCircuit.value = false
    }
    // 检查顶点的度数
    else if (!checkDegrees(graph)) {
      hasEulerCircuit.value = false
    }
    else {
      hasEulerCircuit.value = true
      eulerCircuit.value = findEulerCircuit(graph)
    }
    
    result.value = true
    visualizeGraph(graph)
  } catch (error) {
    inputError.value = error.message
  } finally {
    processing.value = false
  }
}

// 可视化图
function visualizeGraph(graph: Graph) {
  if (!graphContainer.value) return
  
  const nodes = new DataSet(
    Object.keys(graph).map(vertex => ({
      id: parseInt(vertex),
      label: vertex
    }))
  )
  
  const edges = new DataSet(
    Object.entries(graph).flatMap(([vertex, neighbors]) =>
      neighbors.map(neighbor => ({
        from: parseInt(vertex),
        to: neighbor,
        arrows: 'to,from'
      }))
    )
  )
  
  const data = { nodes, edges }
  const options = {
    nodes: {
      shape: 'circle',
      size: 30,
      font: {
        size: 16
      },
      color: {
        background: '#4F46E5',
        border: '#312E81',
        highlight: {
          background: '#818CF8',
          border: '#4F46E5'
        }
      }
    },
    edges: {
      color: {
        color: '#94A3B8',
        highlight: '#64748B'
      },
      width: 2
    },
    physics: {
      stabilization: true,
      barnesHut: {
        gravitationalConstant: -2000,
        springLength: 200
      }
    }
  }
  
  if (network) {
    network.destroy()
  }
  network = new Network(graphContainer.value, data, options)
}

// 生命周期钩子
onMounted(() => {
  useExample()
})

onUnmounted(() => {
  if (network) {
    network.destroy()
  }
})
</script> 