import { defineConfig } from 'tsup'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['eslint', 'vue-eslint-parser'],
  tsconfig: './tsconfig.json',
  onSuccess: async () => {
    // Copy spec file to dist
    const specSource = join(__dirname, 'src/spec/nuxt4-spec.json')
    const specDest = join(__dirname, 'dist/spec/nuxt4-spec.json')
    if (existsSync(specSource)) {
      mkdirSync(join(__dirname, 'dist/spec'), { recursive: true })
      copyFileSync(specSource, specDest)

      console.log('✓ Copied spec file to dist')
    }
  },
})
