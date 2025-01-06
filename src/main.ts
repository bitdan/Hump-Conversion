import { createApp, type App as VueApp } from "vue";
import { createPinia } from 'pinia';
import { createVuetify, type ThemeDefinition } from "vuetify";
import "vuetify/styles";
import "./main.css";
import App from "./App.vue";
import router from './router'
import './assets/tailwind.css'
import '@mdi/font/css/materialdesignicons.css'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import VueKonva from 'vue-konva'

const lightTheme: ThemeDefinition = {
  colors: {
    primary: '#1867C0',
    secondary: '#5CBBF6',
  },
}

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: lightTheme,
    },
  },
})

const app: VueApp = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(VueKonva)
app.use(router)
app.use(vuetify)
app.mount('#app') 