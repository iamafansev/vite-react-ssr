import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src', 'entries', 'home', 'index.html'),
        about: resolve(__dirname, 'src', 'entries', 'about', 'index.html'),
      },
    },
  },
  plugins: [react()],
})
