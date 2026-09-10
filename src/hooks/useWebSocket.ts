import {ref} from 'vue'
import {useUserStore} from '../stores/user'

export function useWebSocket(url: string) {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const messageHandler = ref<((event: MessageEvent) => void) | null>(null)
  const userStore = useUserStore()

  const connect = () => {
    const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:9999'
    const token = userStore.token
      const shouldUseLegacyQueryToken = import.meta.env.VITE_WS_TOKEN_IN_QUERY === 'true'
      const wsUrl = shouldUseLegacyQueryToken && token
          ? `${baseUrl}${url}${url.includes('?') ? '&' : '?'}Authorization=${encodeURIComponent(`Bearer ${token}`)}`
          : `${baseUrl}${url}`
    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      isConnected.value = true
        if (!shouldUseLegacyQueryToken && token) {
            ws.value?.send(JSON.stringify({type: 'auth', token}))
        }
    }

    ws.value.onclose = () => {
      isConnected.value = false
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
            JSON.parse(event.data)
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
