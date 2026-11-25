// Configure the GitHub Pages base for production and the root path in local development.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/clinical-ai-safety-harness/',
  plugins: [react(), tailwindcss()],
}))
