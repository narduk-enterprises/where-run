/**
 * Load and parse Nuxt UI component specifications
 */

import type { NuxtUISpec } from '../types'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Get __dirname in a way that works for both ESM and CJS
function getDirname(): string {
  try {
    // ESM
    return dirname(fileURLToPath(import.meta.url))
  } catch {
    // CJS fallback - use require.main or process.cwd()
    try {
      return __dirname
    } catch {
      return process.cwd()
    }
  }
}

const __dirname = getDirname()

let cachedSpec: NuxtUISpec | null = null

/**
 * Load the Nuxt UI spec from the generated JSON file
 */
export function loadSpec(specPath?: string): NuxtUISpec {
  if (cachedSpec) {
    return cachedSpec
  }

  // Try multiple possible paths (dist/spec, src/spec, or custom path)
  const possiblePaths = [
    specPath,
    join(__dirname, '../spec/nuxt-ui-v4.json'), // dist/spec (after build)
    join(__dirname, '../../src/spec/nuxt-ui-v4.json'), // src/spec (dev)
    join(process.cwd(), 'eslint-plugin-nuxt-ui/src/spec/nuxt-ui-v4.json'), // from project root
    join(process.cwd(), 'eslint-plugin-nuxt-ui/dist/spec/nuxt-ui-v4.json'), // from project root dist
  ].filter(Boolean) as string[]

  let path: string | null = null
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      path = p
      break
    }
  }

  if (!path) {
    // Return empty spec if file doesn't exist (spec not generated yet)
    return {
      version: '4.0.0',
      components: {},
    }
  }

  const content = readFileSync(path, 'utf-8')
  cachedSpec = JSON.parse(content) as NuxtUISpec

  return cachedSpec
}

/**
 * Get spec for a specific component
 */
export function getComponentSpec(
  componentName: string,
  specPath?: string,
): import('../types').ComponentSpec | null {
  const spec = loadSpec(specPath)
  if (spec.components[componentName]) {
    return spec.components[componentName]
  }

  // Try case-insensitive lookup for improperly normalized names (e.g. USelectmenu vs USelectMenu)
  const lowerName = componentName.toLowerCase()
  for (const key of Object.keys(spec.components)) {
    if (key.toLowerCase() === lowerName) {
      return spec.components[key]
    }
  }

  return null
}
