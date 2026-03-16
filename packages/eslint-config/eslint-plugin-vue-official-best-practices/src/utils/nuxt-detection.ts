/**
 * Nuxt detection utilities
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { RuleContext } from 'eslint'

let nuxtCache: boolean | null = null
let cacheKey: string | null = null

/**
 * Check if the project is using Nuxt
 * Caches result per working directory
 */
export function isNuxtMode(context: RuleContext<string, any[]>): boolean {
  const cwd = context.cwd ?? (context as any).getCwd?.()

  // Use cache if same directory
  if (cacheKey === cwd && nuxtCache !== null) {
    return nuxtCache
  }

  cacheKey = cwd

  // Check for nuxt.config.* files
  const nuxtConfigFiles = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs']

  for (const configFile of nuxtConfigFiles) {
    if (existsSync(join(cwd, configFile))) {
      nuxtCache = true
      return true
    }
  }

  // Check package.json for nuxt dependency
  try {
    const packageJsonPath = join(cwd, 'package.json')
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }

      if (deps.nuxt || deps['@nuxt/core'] || deps['@nuxt/kit']) {
        nuxtCache = true
        return true
      }
    }
  } catch {
    // Ignore errors reading package.json
  }

  nuxtCache = false
  return false
}

/**
 * Check if a function name is a Nuxt composable that's allowed at top-level
 */
export function isAllowedNuxtComposable(name: string): boolean {
  const allowedComposables = [
    'useFetch',
    'useAsyncData',
    'useState',
    'useCookie',
    'navigateTo',
    'useRoute',
    'useRouter',
    'useHead',
    'useNuxtApp',
    'useRuntimeConfig',
    'useRequestHeaders',
    'useRequestEvent',
    'useRequestURL',
  ]

  return allowedComposables.includes(name)
}
