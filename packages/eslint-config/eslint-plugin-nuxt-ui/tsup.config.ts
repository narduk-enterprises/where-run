import { defineConfig } from 'tsup'
import { copyFileSync, existsSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['eslint', 'vue-eslint-parser'],
  tsconfig: './tsconfig.json',
  onSuccess: async () => {
    // Copy spec file to dist
    const specSource = join(__dirname, 'src/spec/nuxt-ui-v4.json')
    const specDest = join(__dirname, 'dist/spec/nuxt-ui-v4.json')
    if (existsSync(specSource)) {
      const { mkdirSync } = await import('fs')
      mkdirSync(join(__dirname, 'dist/spec'), { recursive: true })
      copyFileSync(specSource, specDest)

      console.log('✓ Copied spec file to dist')
    }
  },
})
