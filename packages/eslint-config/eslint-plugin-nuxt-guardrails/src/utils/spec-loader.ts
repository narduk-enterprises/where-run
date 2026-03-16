/**
 * Load and parse Nuxt 4 specifications
 */

import type { Nuxt4Spec } from '../types'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Get __dirname in a way that works for both ESM and CJS
function getDirname(): string {
  try {
    // ESM
    return dirname(fileURLToPath(import.meta.url))
  } catch {
    // CJS fallback
    try {
      return __dirname
    } catch {
      return process.cwd()
    }
  }
}

const __dirname = getDirname()

let cachedSpec: Nuxt4Spec | null = null

/**
 * Load the Nuxt 4 spec from the generated JSON file
 */
export function loadSpec(specPath?: string): Nuxt4Spec {
  if (cachedSpec) {
    return cachedSpec
  }

  // Try multiple possible paths
  const possiblePaths = [
    specPath,
    join(__dirname, '../spec/nuxt4-spec.json'), // dist/spec (after build)
    join(__dirname, '../../src/spec/nuxt4-spec.json'), // src/spec (dev)
    join(process.cwd(), 'eslint-plugin-nuxt-guardrails/src/spec/nuxt4-spec.json'), // from project root
    join(process.cwd(), 'eslint-plugin-nuxt-guardrails/dist/spec/nuxt4-spec.json'), // from project root dist
  ].filter(Boolean) as string[]

  let path: string | null = null
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      path = p
      break
    }
  }

  if (!path) {
    // Return empty spec if file doesn't exist
    return {
      version: '4.2.2',
      generatedAt: new Date().toISOString(),
      apis: {},
      deprecations: {},
    }
  }

  const content = readFileSync(path, 'utf-8')
  cachedSpec = JSON.parse(content) as Nuxt4Spec

  return cachedSpec
}

/**
 * Get spec for a specific API
 */
export function getApiSpec(apiName: string, specPath?: string): import('../types').ApiSpec | null {
  const spec = loadSpec(specPath)
  return spec.apis[apiName] || null
}

/**
 * Get deprecation info for a pattern
 */
export function getDeprecation(
  pattern: string,
  specPath?: string,
): import('../types').DeprecationSpec | null {
  const spec = loadSpec(specPath)
  return spec.deprecations[pattern] || null
}
