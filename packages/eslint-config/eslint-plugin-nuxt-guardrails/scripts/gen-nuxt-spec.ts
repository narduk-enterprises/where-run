/**
 * Spec generator: Fetches curated Nuxt 4 docs and extracts API specifications
 * Uses llms.txt as index and only fetches a curated subset of pages
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Default allowlist of essential Nuxt 4 docs
const DEFAULT_ALLOWLIST = [
  '/docs/4.x/getting-started/introduction',
  '/docs/4.x/guide/directory-structure/app',
  '/docs/4.x/guide/directory-structure/pages',
  '/docs/4.x/guide/concepts/data-fetching',
  '/docs/api/composables/use-async-data',
  '/docs/api/composables/use-fetch',
  '/docs/api/composables/use-head',
  '/docs/api/composables/use-seo-meta',
  '/docs/4.x/guide/concepts/rendering',
  '/docs/4.x/guide/concepts/server-engine',
  '/docs/4.x/getting-started/upgrade',
]

const BASE_URL = 'https://nuxt.com'
const CACHE_DIR = join(process.cwd(), '.cache/nuxt-docs')
const SPEC_OUTPUT = join(__dirname, '../src/spec/nuxt4-spec.json')

/**
 * Normalize URL path for caching
 */
function normalizePath(path: string): string {
  return path.replace(/[^a-zA-Z0-9]/g, '_')
}

/**
 * Get cached file path for a URL
 */
function getCachePath(url: string): string {
  const normalized = normalizePath(url)
  return join(CACHE_DIR, `${normalized}.html`)
}

/**
 * Fetch a URL with caching
 */
async function fetchWithCache(url: string): Promise<string> {
  const cachePath = getCachePath(url)

  // Check cache first
  if (existsSync(cachePath)) {
    const cached = readFileSync(cachePath, 'utf-8')
    // For now, always use cache if available (can add TTL later)
    return cached
  }

  // Fetch from network
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`)
    }
    const content = await response.text()

    // Cache it
    mkdirSync(CACHE_DIR, { recursive: true })
    writeFileSync(cachePath, content, 'utf-8')

    return content
  } catch (error) {
    console.warn(`Failed to fetch ${url}:`, error)
    return ''
  }
}

/**
 * Extract API names from markdown content
 */
function extractApiNames(content: string): string[] {
  const apis: string[] = []

  // Match composables: useAsyncData, useFetch, etc.
  const composableRegex = /`(use[A-Z]\w+)`/g
  let match
  while ((match = composableRegex.exec(content)) !== null) {
    apis.push(match[1])
  }

  // Match macros: definePageMeta, defineNuxtConfig, etc.
  const macroRegex = /`(define[A-Z]\w+)`/g
  while ((match = macroRegex.exec(content)) !== null) {
    apis.push(match[1])
  }

  return [...new Set(apis)] // Deduplicate
}

/**
 * Extract deprecation signals from content
 */
function extractDeprecations(
  content: string,
  docUrl: string,
): Array<{ pattern: string; message: string; replacement: string; docUrl: string }> {
  const deprecations: Array<{
    pattern: string
    message: string
    replacement: string
    docUrl: string
  }> = []

  // Look for deprecation patterns
  const deprecationPatterns = [
    {
      regex: /`([^`]+)`\s+(?:is\s+)?deprecated/i,
      extract: (match: RegExpMatchArray) => ({
        pattern: match[1],
        message: `"${match[1]}" is deprecated`,
        replacement: '',
        docUrl,
      }),
    },
    {
      regex: /`([^`]+)`\s+has\s+been\s+replaced\s+by\s+`([^`]+)`/i,
      extract: (match: RegExpMatchArray) => ({
        pattern: match[1],
        message: `"${match[1]}" has been replaced`,
        replacement: match[2],
        docUrl,
      }),
    },
    {
      regex: /use\s+`([^`]+)`\s+instead\s+of\s+`([^`]+)`/i,
      extract: (match: RegExpMatchArray) => ({
        pattern: match[2],
        message: `"${match[2]}" should be replaced`,
        replacement: match[1],
        docUrl,
      }),
    },
    {
      regex: /`([^`]+)`\s+is\s+no\s+longer\s+(?:supported|available)/i,
      extract: (match: RegExpMatchArray) => ({
        pattern: match[1],
        message: `"${match[1]}" is no longer supported`,
        replacement: '',
        docUrl,
      }),
    },
  ]

  for (const { regex, extract } of deprecationPatterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      const deprecation = extract(match)
      if (deprecation.pattern) {
        deprecations.push(deprecation)
      }
    }
  }

  return deprecations
}

/**
 * Extract usage recommendations from content
 */
function extractUsage(content: string): string[] {
  const usage: string[] = []

  // Look for usage sections
  const usageSection = content.match(/##\s+Usage[\s\S]*?(?=##|$)/i)
  if (usageSection) {
    // Extract bullet points
    const bullets = usageSection[0].match(/^[-*]\s+(.+)$/gm)
    if (bullets) {
      usage.push(...bullets.map((b) => b.replace(/^[-*]\s+/, '').trim()).filter(Boolean))
    }
  }

  return usage.slice(0, 5) // Limit to 5 most relevant
}

/**
 * Extract option enums from content
 */
function extractOptionEnums(content: string): Record<string, { enum?: string[] }> {
  const options: Record<string, { enum?: string[] }> = {}

  // Look for TypeScript interface definitions
  const interfaceMatch = content.match(
    /```ts[\s\S]*?interface\s+\w+Options\s*\{([\s\S]*?)\}[\s\S]*?```/i,
  )
  if (interfaceMatch) {
    const propsContent = interfaceMatch[1]

    // Match enum-like union types: `server: true | false`
    const enumRegex = /(\w+)\??\s*:\s*([^;]+);/g
    let match
    while ((match = enumRegex.exec(propsContent)) !== null) {
      const propName = match[1]
      const typeDef = match[2]

      // Check if it's a union of literals
      const literalMatch = typeDef.match(
        /(?:true|false|"[^"]+"|'[^']+'|\d+)(?:\s*\|\s*(?:true|false|"[^"]+"|'[^']+'|\d+))+/,
      )
      if (literalMatch) {
        const values = literalMatch[0].split(/\s*\|\s*/).map((v) => v.trim().replace(/['"]/g, ''))
        options[propName] = { enum: values }
      }
    }
  }

  return options
}

/**
 * Process a single doc page
 */
async function processDocPage(path: string): Promise<{
  apis: Record<string, ApiSpec>
  deprecations: Record<string, DeprecationSpec>
}> {
  const url = `${BASE_URL}${path}`
  const content = await fetchWithCache(url)

  if (!content) {
    return { apis: {}, deprecations: {} }
  }

  const apis: Record<string, ApiSpec> = {}
  const deprecations: Record<string, DeprecationSpec> = {}

  // Extract API names
  const apiNames = extractApiNames(content)
  for (const apiName of apiNames) {
    if (!apis[apiName]) {
      apis[apiName] = {
        name: apiName,
        docUrl: url,
        usage: extractUsage(content),
        options: extractOptionEnums(content),
      }
    }
  }

  // Extract deprecations
  const pageDeprecations = extractDeprecations(content, url)
  for (const dep of pageDeprecations) {
    deprecations[dep.pattern] = {
      message: dep.message,
      replacement: dep.replacement,
      docUrl: dep.docUrl,
    }
  }

  return { apis, deprecations }
}

/**
 * Fetch llms.txt index and extract doc links
 */
async function fetchIndex(): Promise<string[]> {
  const indexUrl = `${BASE_URL}/llms.txt`
  const content = await fetchWithCache(indexUrl)

  if (!content) {
    console.warn('Failed to fetch llms.txt, using default allowlist')
    return DEFAULT_ALLOWLIST
  }

  // Extract URLs from the index
  const urls: string[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    // Look for markdown links: [text](url)
    const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      const url = linkMatch[2]
      // Filter to Nuxt 4 docs
      if (url.includes('/docs/4.x/') || url.includes('/docs/api/')) {
        // Normalize to path (remove base URL if present)
        const path = url.startsWith('http') ? new URL(url).pathname : url
        urls.push(path)
      }
    }

    // Also look for plain URLs
    const urlMatch = line.match(/https?:\/\/nuxt\.com(\/docs\/[^\s]+)/)
    if (urlMatch) {
      const path = urlMatch[1]
      if (path.includes('/docs/4.x/') || path.includes('/docs/api/')) {
        urls.push(path)
      }
    }
  }

  return [...new Set(urls)] // Deduplicate
}

/**
 * Main generator function
 */
async function generateSpec() {
  console.log('Fetching Nuxt docs index...')

  // Get allowlist from env or use default
  const envAllowlist = process.env.NUXT_DOCS_ALLOWLIST
  let paths: string[]

  if (envAllowlist) {
    paths = envAllowlist.split(',').map((p) => p.trim())
  } else {
    // Fetch index and filter
    const allPaths = await fetchIndex()

    // Filter to default allowlist + any matching paths
    const matchingPaths = allPaths.filter((p) =>
      DEFAULT_ALLOWLIST.some((defaultPath) => p.includes(defaultPath)),
    )

    paths = [...new Set([...DEFAULT_ALLOWLIST, ...matchingPaths])]
  }

  console.log(`Processing ${paths.length} doc pages...`)

  const allApis: Record<string, ApiSpec> = {}
  const allDeprecations: Record<string, DeprecationSpec> = {}

  // Process each page
  for (const path of paths) {
    console.log(`  Processing ${path}...`)
    const { apis, deprecations } = await processDocPage(path)

    // Merge APIs (prefer existing if duplicate)
    for (const [name, spec] of Object.entries(apis)) {
      if (!allApis[name]) {
        allApis[name] = spec
      } else {
        // Merge usage and options
        allApis[name].usage = [...new Set([...(allApis[name].usage || []), ...(spec.usage || [])])]
        allApis[name].options = { ...allApis[name].options, ...spec.options }
      }
    }

    // Merge deprecations
    Object.assign(allDeprecations, deprecations)
  }

  // Create spec object
  const spec = {
    version: '4.2.2',
    generatedAt: new Date().toISOString(),
    apis: allApis,
    deprecations: allDeprecations,
  }

  // Ensure output directory exists
  mkdirSync(join(__dirname, '../src/spec'), { recursive: true })

  // Write spec
  writeFileSync(SPEC_OUTPUT, JSON.stringify(spec, null, 2), 'utf-8')

  console.log(`\n✓ Generated spec at ${SPEC_OUTPUT}`)

  console.log(`  Extracted ${Object.keys(allApis).length} APIs`)

  console.log(`  Found ${Object.keys(allDeprecations).length} deprecations`)
}

generateSpec().catch((error) => {
  console.error('Error generating spec:', error)
  process.exit(1)
})
