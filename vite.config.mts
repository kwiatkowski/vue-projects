/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // PROJECTS_DEV_* are read here, in Node – never exposed to the browser bundle (only VITE_* are)
  const env = loadEnv(mode, process.cwd(), 'PROJECTS_DEV_')

  return {
    // the build lands in web/ and is served from /projects/web/; WordPress serves the shell at /projects/
    base: '/projects/web/',
    build: {
      outDir: 'web',
      emptyOutDir: true,
    },
    plugins: [Vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('src', import.meta.url)),
      },
    },
    server: {
      host: true,
      port: 3001,
      // dev against a real WordPress: requests go through this proxy, which adds an application password
      proxy: env.PROJECTS_DEV_API
        ? {
            '/wp-json': {
              target: env.PROJECTS_DEV_API,
              changeOrigin: true,
              secure: false,
              auth: env.PROJECTS_DEV_AUTH,
            },
          }
        : undefined,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.spec.ts'],
    },
  }
})
