import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'

export type NavMode = 'side' | 'top'

export interface NavStore {
  mode: Ref<NavMode>
  toggleMode: () => void
}

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