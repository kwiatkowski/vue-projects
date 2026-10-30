import { createApp } from 'vue'
import { registerPlugins } from '@/plugins'
import { useNotifyStore } from '@/stores/notify'
import App from './App.vue'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@/styles/app.css'

const app = createApp(App)

registerPlugins(app)

// an error while rendering would otherwise go to the console alone – the page half drawn (a dialog with nothing in
// it) and no word why; now it says what broke
app.config.errorHandler = (error, _instance, info) => {
  console.error(error, info)
  useNotifyStore().show(`Błąd aplikacji: ${error instanceof Error ? error.message : String(error)} – odśwież stronę.`, { tone: 'error' })
}

// a part of the app from before a deploy (the page open since) is gone from the server – the new version, at once
window.addEventListener('vite:preloadError', () => window.location.reload())

app.mount('#app')
