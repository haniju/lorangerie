import { resolve } from 'path'
import { defineConfig } from 'vite'
import colorsPlugin from './vite-plugin-colors.js'

export default defineConfig({
  root: '.',
  plugins: [colorsPlugin()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        contact: resolve(__dirname, 'contact.html'),
        designsystem: resolve(__dirname, 'design-system.html'),
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
})
