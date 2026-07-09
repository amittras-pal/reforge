import { mount } from 'svelte'
import './styles/tokens.css'
import './styles/global.css'
import { density, theme } from './lib/stores/settings'
import {
  requestPersistentStorage,
  watchForFirstMeaningfulWrite,
} from './lib/pwa/storage'
import App from './App.svelte'

// Keep the document's theme/density attributes (and the theme-color meta, FR-04.7) in sync
// with the persisted settings (FR-02.8–FR-02.9). The initial value is applied synchronously in
// index.html before first paint to avoid a flash (FR-02.10); this subscription keeps it in
// sync afterwards.
const themeColorMeta = document.querySelector('meta[name="theme-color"]')

theme.subscribe((value) => {
  document.documentElement.setAttribute('data-theme', value)
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue('--bg')
    .trim()
  if (bg) themeColorMeta?.setAttribute('content', bg)
})
density.subscribe((value) => {
  document.documentElement.setAttribute('data-density', value)
})

// FR-04.12: request persistent storage at the first *meaningful* data write, not on launch.
watchForFirstMeaningfulWrite(() => {
  void requestPersistentStorage()
})

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
