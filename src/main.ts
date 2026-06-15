import {type App as VueApp, createApp} from "vue";
import {createPinia} from 'pinia';
import {createVuetify, type ThemeDefinition} from "vuetify";
import "vuetify/styles";
import "./main.css";
import App from "./App.vue";
import router from './router/index'
import './assets/tailwind.css'
import '@mdi/font/css/materialdesignicons.css'
import VueKonva from 'vue-konva'
import {QueryClient, VueQueryPlugin} from '@tanstack/vue-query'

const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0ea5e9',
    'surface': '#ffffff',
    'surface-variant': '#f8fafc',
    'background': '#f8fafc',
    'on-primary': '#ffffff',
    'on-secondary': '#ffffff',
    'on-surface': '#0f172a',
    'on-surface-variant': '#64748b',
    'on-success': '#ffffff',
    'on-warning': '#ffffff',
    'on-error': '#ffffff',
    'on-info': '#ffffff',
  },
}

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: lightTheme,
    },
  },
})

const app: VueApp = createApp(App)
const pinia = createPinia()
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
})

app.use(pinia)
app.use(VueQueryPlugin, {queryClient})
app.use(VueKonva)
app.use(router)
app.use(vuetify)
app.mount('#app')
