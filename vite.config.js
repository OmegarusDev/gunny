import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.GITHUB_ACTIONS ? '/gunny/' : '/';

export default defineConfig({
  base,
  server: {
    port: 5174,
    host: true,
    strictPort: true,
  },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        id: `${base}`,
        name: 'Gunny',
        short_name: 'Gunny',
        description:
          'Shoulder-fire auto-runner. Shoot over your shoulder and do not let them touch you.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#140e0a',
        theme_color: '#1a120c',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
        // Avoid workbox→terser child-process hangs in some CI/sandbox environments.
        mode: 'development',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
