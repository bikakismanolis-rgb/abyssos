import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { rename } from 'node:fs/promises';
import { resolve } from 'node:path';

// `vite build`               -> dist/   PWA bundle (service worker, manifest, icons). Deployed to GitHub Pages.
//                                BASE_PATH=/abyssos/ is set by the Pages workflow; default '/' for local preview.
// `vite build --mode single` -> release/abyssos.html  one self-contained file (no PWA), for the Supabase download link.
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: single ? './' : (process.env.BASE_PATH || '/'),
    publicDir: single ? false : 'public',   // a lone HTML file needs no icons folder next to it
    build: {
      target: 'es2019',   // older Android WebViews must still parse the bundle
      outDir: single ? 'release' : 'dist',
      emptyOutDir: !single   // release/ also holds the APK; only dist/ is wiped
    },
    plugins: single
      ? [
          viteSingleFile(),
          {
            name: 'single-file-cleanup',
            // icon links point to files that do not exist next to a lone HTML file
            transformIndexHtml: (html) => html.replace(/\s*<link rel="(?:icon|apple-touch-icon)"[^>]*>/g, ''),
            closeBundle: () => rename(resolve('release/index.html'), resolve('release/abyssos.html'))
          }
        ]
      : [
          VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            includeAssets: ['icons/apple-touch-icon-180.png', 'icons/icon.svg'],
            manifest: {
              name: 'Άβυσσος',
              short_name: 'Άβυσσος',
              description: 'Ένα μικρό βαθυσκάφος, ένα φως, και ό,τι ζει εκεί κάτω.',
              lang: 'el',
              start_url: '.',
              scope: '.',
              display: 'standalone',
              orientation: 'portrait',
              background_color: '#03101b',
              theme_color: '#03101b',
              icons: [
                { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
              ]
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
              navigateFallback: 'index.html',
              // downloads next to the site (the APK) must reach the server, not the app shell
              navigateFallbackDenylist: [/\.apk$/i, /\.zip$/i]
            }
          })
        ]
  };
});
