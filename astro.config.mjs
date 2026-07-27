import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import colorsPlugin from './vite-plugin-colors.js'

// Astro tourne sur Vite : on réinjecte le plugin couleurs existant
// (son hook `configureServer` expose /__api/colors pour le color-manager)
// via vite.plugins. Le build statique sort en `dist/` pour que deploy.sh
// reste valable.
export default defineConfig({
  site: 'https://lorangerie.pulpe.bzh',
  outDir: './dist',
  devToolbar: {
    enabled: false,
  },
  integrations: [
    sitemap({
      // page d'outillage interne (Produit B, gelé) — hors sitemap public
      filter: (page) => !page.includes('/design-system'),
    }),
  ],
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
