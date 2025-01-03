import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNavStore = defineStore('nav', () => {
  const mode = ref(localStorage.getItem('navMode') || 'side')

  const toggleMode = () => {
    mode.value = mode.value === 'side' ? 'top' : 'side'
    localStorage.setItem('navMode', mode.value)
  }

  return {
    mode,
    toggleMode
  }
}) 