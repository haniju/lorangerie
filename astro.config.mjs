import { defineConfig } from 'astro/config'
import colorsPlugin from './vite-plugin-colors.js'

// Astro tourne sur Vite : on réinjecte le plugin couleurs existant
// (son hook `configureServer` expose /__api/colors pour le color-manager)
// via vite.plugins. Le build statique sort en `dist/` pour que deploy.sh
// reste valable.
export default defineConfig({
  outDir: './dist',
  vite: {
    plugins: [colorsPlugin()],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  },
})
