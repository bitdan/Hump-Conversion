import { ref, onUnmounted } from 'vue'

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)

  const connect = (path: string) => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}${path}`
      console.log('Connecting to WebSocket:', wsUrl)
      
      ws.value = new WebSocket(wsUrl)
      
      ws.value.onopen = () => {
        isConnected.value = true
        console.log('WebSocket connected')
      }
      
      ws.value.onclose = () => {
        isConnected.value = false
        console.log('WebSocket disconnected')
      }
      
      ws.value.onerror = (error) => {
        console.error('WebSocket error:', error)
        isConnected.value = false
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      isConnected.value = false
    }
  }

  const disconnect = () => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.close()
    }
  }

  const send = (message: string | object) => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message)
      ws.value.send(data)
    } else {
      console.error('WebSocket is not connected')
    }
  }

  // 组件卸载时自动断开连接
  onUnmounted(() => {
    disconnect()
  })

  return {
    ws,
    isConnected,
    connect,
    disconnect,
    send
  }
} 