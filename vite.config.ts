import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function rebrickableDbPlugin(): Plugin {
  const dir = path.resolve(__dirname, 'rebrickable-db')
  const files = ['elements.csv', 'parts.csv'] as const

  function serveCsv(
    url: string | undefined,
    prefixes: string[],
    res: import('http').ServerResponse,
    next: () => void,
  ) {
    if (!url) {
      next()
      return
    }
    const pathname = url.split('?')[0] ?? ''
    const prefix = prefixes.find((p) => pathname.startsWith(p))
    if (!prefix) {
      next()
      return
    }
    const name = decodeURIComponent(pathname.slice(prefix.length))
    if (!files.includes(name as (typeof files)[number])) {
      next()
      return
    }
    const file = path.join(dir, name)
    if (!fs.existsSync(file)) {
      res.statusCode = 404
      res.end('Not found')
      return
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    fs.createReadStream(file).pipe(res)
  }

  return {
    name: 'rebrickable-db',
    configureServer(server) {
      const basePrefix = `${server.config.base}rebrickable-db/`.replace(
        /\/{2,}/g,
        '/',
      )
      server.middlewares.use((req, res, next) => {
        serveCsv(req.url, [basePrefix, '/rebrickable-db/'], res, next)
      })
    },
    configurePreviewServer(server) {
      const basePrefix = `${server.config.base}rebrickable-db/`.replace(
        /\/{2,}/g,
        '/',
      )
      server.middlewares.use((req, res, next) => {
        serveCsv(req.url, [basePrefix, '/rebrickable-db/'], res, next)
      })
    },
    writeBundle(options) {
      const outDir = options.dir
      if (!outDir) return
      const dest = path.join(outDir, 'rebrickable-db')
      fs.mkdirSync(dest, { recursive: true })
      for (const name of files) {
        const src = path.join(dir, name)
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(dest, name))
        }
      }
    },
  }
}

export default defineConfig({
  base: '/pab-part-out/',
  plugins: [react(), tailwindcss(), rebrickableDbPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
