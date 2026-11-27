import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const envRecord = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;
const rawBase = envRecord?.VITE_BASE_PATH ?? '/';
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-512.png',
      ],
      manifest: {
        name: 'Mini Baseball Manager',
        short_name: 'MiniBaseball',
        description: 'Retro 90s cartoon & chibi 3D baseball GM and manager RPG.',
        theme_color: '#1B4332',
        background_color: '#FBF4E4',
        display: 'standalone',
        orientation: 'any',
        scope: base,
        start_url: base,
        categories: ['games', 'sports'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache core app shell & PWA icons only; cache large player portrait WebPs on-demand via CacheFirst
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}', 'icons/*.png'],
        globIgnores: ['**/assets/mbm-*.{png,webp}', '**/assets/felix-*.{png,webp}', '**/assets/manny-*.{png,webp}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(?:png|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mbm-portraits-v1',
              expiration: {
                maxEntries: 260,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'hobby-stories': ['./src/engine/rpg/playerHobbyStories.ts'],
          three: ['three'],
          react: ['react', 'react-dom'],
          lucide: ['lucide-react'],
          zustand: ['zustand'],
        },
      },
    },
  },
});
