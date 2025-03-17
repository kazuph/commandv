import build from '@hono/vite-build/cloudflare-workers'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'
import autoprefixer from 'autoprefixer'

export default defineConfig(({ mode }) => {
  // 共通設定
  const serverConfig = {
    server: {
      port: 3000, // デフォルトの5173から3000に変更
    }
  };

  if (mode === 'client') {
    return {
      ...serverConfig,
      css: {
        postcss: {
          plugins: [
            autoprefixer,
          ],
        },
      },
      build: {
        rollupOptions: {
          input: './src/client.tsx',
          output: {
            entryFileNames: 'static/client.js'
          }
        }
      }
    }
  } else {
    return {
      ...serverConfig,
      ssr: {
        external: ['react', 'react-dom']
      },
      css: {
        postcss: {
          plugins: [
            autoprefixer,
          ],
        },
      },
      plugins: [
        build({
          outputDir: 'server-build'
        }),
        devServer({
          adapter,
          entry: 'src/index.tsx'
        })
      ]
    }
  }
})
