import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NavMode, NavStore } from './nav.d'

export const useNavStore = defineStore('nav', (): NavStore => {
  const mode = ref<NavMode>(localStorage.getItem('navMode') as NavMode || 'side')

  const toggleMode = () => {
    mode.value = mode.value === 'side' ? 'top' : 'side'
    localStorage.setItem('navMode', mode.value)
  }

  return {
    mode,
    toggleMode
  }
}) 