import {createApp} from "vue";
import {createVuetify} from "vuetify";
import "vuetify/styles";
import "./main.css";
import App from "./App.vue";
import router from './router'
import './assets/tailwind.css'
import '@mdi/font/css/materialdesignicons.css'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

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

app.use(router)
app.use(vuetify)
app.mount('#app')
