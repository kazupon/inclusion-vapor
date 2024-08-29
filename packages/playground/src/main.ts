import { createVaporApp as createApp } from 'vue/vapor'
import './style.css'
import App from './App.vue'

// @ts-expect-error -- NOTE: ignore, because we are still prototyping ...
createApp(App, {}).mount('#app') // eslint-disable-line @typescript-eslint/no-unsafe-argument
