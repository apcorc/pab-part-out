import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function rebrickableDbPlugin(): Plugin {
  const dir = path.resolve(__dirname, 'rebrickable-db')
  const files = ['elements.csv', 'parts.csv'] as const

  return {
    name: 'rebrickable-db',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/rebrickable-db/')) {
          next()
          return
        }
        const name = decodeURIComponent(
          req.url.slice('/rebrickable-db/'.length).split('?')[0] ?? '',
        )
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
