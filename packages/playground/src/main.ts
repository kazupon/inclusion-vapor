import { createVaporApp as createApp } from 'vue/vapor'
import './style.css'
import App from './App.vue'

// @ts-expect-error -- NOTE: ignore, because we are still prototyping ...
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
createApp(App, {}).mount('#app')
