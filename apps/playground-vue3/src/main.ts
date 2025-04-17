import { createApp } from 'vue'
import GoogleTranslateSelect from 'vue3-translate-select'
// import '@google-translate-select/theme-chalk/src/index.scss'
import App from './App.vue'
import './style.css'

createApp(App).use(GoogleTranslateSelect).mount('#app')
