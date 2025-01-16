import {defineStore} from 'pinia'
import {ref} from 'vue'

export const useNavStore = defineStore('nav', () => {
  // 从本地存储读取导航模式，默认为侧边栏
  const mode = ref<'side' | 'top'>(localStorage.getItem('navMode') as 'side' | 'top' || 'side')

  const toggleMode = () => {
    mode.value = mode.value === 'side' ? 'top' : 'side'
    // 保存到本地存储
    localStorage.setItem('navMode', mode.value)
  }

  return {
    mode,
    toggleMode
  }
})
