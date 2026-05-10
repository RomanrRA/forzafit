// Генерация PNG-иконок из public/icons/icon.svg.
// Использование: node apps/web/scripts/generate-icons.mjs (из корня apps/web).
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SVG = readFileSync(resolve(__dirname, '../public/icons/icon.svg'))
const out = (n) => resolve(__dirname, '../public/icons/', n)

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of sizes) {
  await sharp(SVG, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(out(name))
  console.log('✓', name, `${size}×${size}`)
}
