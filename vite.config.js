import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/gunny/' : '/',
  server: {
    port: 5174,
    host: true,
    strictPort: true,
  },
});
