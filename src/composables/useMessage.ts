export function useMessage() {
  const showSuccess = (message: string) => {
    // 这里可以使用你的UI框架的消息提示组件
    // 例如 Element Plus 的 ElMessage
  }

  const showError = (message: string) => {
    console.error('Error:', message)
  }

  const showWarning = (message: string) => {
    console.warn('Warning:', message)
  }

  return {
    showSuccess,
    showError,
    showWarning
  }
} 
