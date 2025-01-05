import './utils/auth'
import {createApp} from "vue";
import {createPinia} from 'pinia';
import {createVuetify} from "vuetify";
import "vuetify/styles";
import "./main.css";
import App from "./App.vue";
import router from './router'
import './assets/tailwind.css'
import '@mdi/font/css/materialdesignicons.css'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import VueKonva from 'vue-konva'
import axios from 'axios'
import { useUserStore } from './stores/user'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1867C0',
          secondary: '#5CBBF6',
        },
      },
    },
  },
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(VueKonva) 
app.use(router)
app.use(vuetify)

// 配置全局请求拦截器
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      console.log('Adding token to request:', token)
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 配置全局响应拦截器
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const userStore = useUserStore()
      userStore.clearToken()
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

app.mount('#app')
