import { Ref } from 'vue'

export type NavMode = 'side' | 'top'

export interface NavStore {
  mode: Ref<NavMode>
  toggleMode: () => void
} 