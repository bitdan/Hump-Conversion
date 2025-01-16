import {ref} from 'vue'
import {useUserStore} from '../stores/user'

export function useWebSocket(url: string) {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const messageHandler = ref<((event: MessageEvent) => void) | null>(null)
  const userStore = useUserStore()

  const connect = () => {
    const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'
    const token = userStore.token
    const wsUrl = `${baseUrl}${url}${url.includes('?') ? '&' : '?'}Authorization=Bearer ${token}`
    console.log('WebSocket URL:', wsUrl)
    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      isConnected.value = true
      console.log('WebSocket connected')
    }

    ws.value.onclose = () => {
      isConnected.value = false
      console.log('WebSocket disconnected')
      setTimeout(connect, 3000)
    }

    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.value.onmessage = (event) => {
      if (messageHandler.value) {
        messageHandler.value(event)
      } else {
        try {
          const data = JSON.parse(event.data)
          console.log('WebSocket message:', data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
    }
  }

  const disconnect = () => {
    if (ws.value && isConnected.value) {
      ws.value.close()
      ws.value = null
      isConnected.value = false
    }
  }

  const send = (data: any) => {
    if (ws.value && isConnected.value) {
      ws.value.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  const onMessage = (handler: (event: MessageEvent) => void) => {
    messageHandler.value = handler
  }

  return {
    isConnected,
    connect,
    disconnect,
    send,
    onMessage
  }
}
