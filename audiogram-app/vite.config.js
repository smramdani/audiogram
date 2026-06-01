import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// On a production build we serve from the GitHub Pages sub-path
// (https://smramdani.github.io/audiogram/). Local dev/preview stays at root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/audiogram/' : '/',
  plugins: [react()],
}))
