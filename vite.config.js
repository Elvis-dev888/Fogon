import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'web-dist',
  },
  server: {
    watch: {
      ignored: ['**/release/**', '**/android/**', '**/web-dist/**', '**/.git/**']
    }
  }
})
