/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * The Latin fonts (Geist, Geist Mono) asked for straight from index.html – not only once the CSS that names them has
 * come; their names carry the build's hash, so they are found in the bundle.
 */
function preloadFonts (): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml: (_html, context) => Object.keys(context.bundle ?? {})
      .filter(file => /geist(?:-mono)?-latin-wght-normal-[\w-]+\.woff2$/.test(file))
      .map(file => ({ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `/projects/web/${file}` }, injectTo: 'head' })),
  }
}

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
    plugins: [Vue(), preloadFonts()],
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
