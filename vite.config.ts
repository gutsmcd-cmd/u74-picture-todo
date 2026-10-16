import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const MANIFEST_ID = '/u74-picture-todo/'

function assertManifestId(): Plugin {
  return {
    name: 'assert-manifest-id',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const file = resolve('dist/manifest.webmanifest')
      const manifest = JSON.parse(readFileSync(file, 'utf8')) as { id?: string }
      if (manifest.id !== MANIFEST_ID) {
        throw new Error(
          `manifest id must be ${MANIFEST_ID} (never './'), got ${String(manifest.id)}`,
        )
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-32.png', 'icons/icon-180.png'],
      manifest: {
        id: MANIFEST_ID,
        name: '絵でやること',
        short_name: '絵でやること',
        description: '絵でやること：やることリストが絵のカードに。Picture To-Do: your to-do list as picture cards.',
        lang: 'ja',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#1a1424',
        theme_color: '#1a1424',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2,mjs}'],
        maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
    assertManifestId(),
  ],
})
