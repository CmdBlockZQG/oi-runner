import { createApp } from 'vue'
import App from './App.vue'

import '@vscode/codicons/dist/codicon.css'

const vscode = acquireVsCodeApi()

const app = createApp(App)
app.provide('vscode', vscode)
app.mount('#app')
