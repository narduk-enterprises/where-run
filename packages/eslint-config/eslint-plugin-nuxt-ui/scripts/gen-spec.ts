/**
 * Spec generator: Fetches/reads llms-full.txt and extracts component specifications
 * Uses single-pass streaming to extract all components efficiently
 */

import { createReadStream, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Components to extract (normalized - remove 'U' prefix for matching)
// Note: Dropdown → DropdownMenu, Toggle → Switch, FormGroup → FormField in v4
const TARGET_COMPONENTS = [
  'Button',
  'Card',
  'Icon',
  'Input',
  'Form',
  'FormField',
  'Modal',
  'Badge',
  'Avatar',
  'Skeleton',
  'Select',
  'Table',
  'Tabs',
  'Container',
  'Alert',
  'Pagination',
  'Separator',
  'Checkbox',
  'Textarea',
  'InputMenu',
  'Switch', // Toggle was renamed to Switch in v4
  'Popover',
  'Tooltip',
  'Slideover',
  'Empty',
  'Progress',
  'Kbd',
  'Collapsible',
  'DropdownMenu', // Dropdown was renamed to DropdownMenu in v4
  'SelectMenu',
  'NavigationMenu',
  'DashboardSidebar',
  'DashboardPanel',
  'DashboardGroup',
  'App',
  'User',
]

interface ComponentSpec {
  name: string
  props: Array<{
    name: string
    type: string
    required?: boolean
    default?: string
    description?: string
    enum?: string[]
    deprecated?: boolean
    replacedBy?: string
  }>
  slots: Array<{
    name: string
    description?: string
    deprecated?: boolean
    replacedBy?: string
  }>
  events: Array<{
    name: string
    description?: string
    deprecated?: boolean
    replacedBy?: string
  }>
  requiresAppWrapper?: boolean
}

/**
 * Parse component section from accumulated lines
 */
function parseComponentSection(lines: string[], componentName: string): ComponentSpec | null {
  const spec: ComponentSpec = {
    name: `U${componentName}`,
    props: [],
    slots: [],
    events: [],
  }

  const section = lines.join('\n')

  // Extract props from API section (TypeScript interface)
  // Match interface with optional extends clause
  const propsSection = section.match(
    /###\s+Props[\s\S]*?```ts[\s\S]*?interface\s+\w+Props\s*(?:extends\s+[^{]+)?\{([\s\S]*?)\}[\s\S]*?```/i,
  )
  if (propsSection) {
    const propsContent = propsSection[1]

    // Check if interface extends another interface (we'll note this but can't easily resolve it)
    const extendsMatch = section.match(/interface\s+\w+Props\s+extends\s+([^{]+)\{/i)
    if (extendsMatch) {
      // Note: We can't easily resolve extended props without a full TypeScript parser
      // This is a limitation - extended props won't be included in the spec
      // Common extended props might need to be added manually or fetched from source
    }

    // First, extract props with JSDoc comments
    // Match: /** ... */ propName?: type;
    // Use non-greedy match to handle multiple JSDoc blocks correctly
    const propWithJSDocRegex = /\/\*\*([\s\S]*?)\*\/\s*(\w+)\??\s*:\s*([^;]+?);/g
    const processedProps = new Set<string>()
    let propMatch

    while ((propMatch = propWithJSDocRegex.exec(propsContent)) !== null) {
      const propComment = propMatch[1]
      const propName = propMatch[2]
      let propType = propMatch[3].trim()

      // Handle multi-line types that might have been cut off
      // If the type doesn't look complete (ends with | or &), try to get more
      const matchEnd = propMatch.index + propMatch[0].length
      if (propType.endsWith('|') || propType.endsWith('&')) {
        // Try to get the rest of the type from the next part of the string
        const remaining = propsContent.slice(matchEnd)
        const nextSemicolon = remaining.indexOf(';')
        if (nextSemicolon !== -1) {
          propType += remaining.slice(0, nextSemicolon).trim()
        }
      }

      processedProps.add(propName)

      // Extract description from JSDoc
      const descLines = propComment
        .split('\n')
        .map((l) => l.replace(/^\s*\*\s?/, '').trim())
        .filter(Boolean)
      const description = descLines.find((l) => !l.startsWith('@')) || undefined

      // Check for deprecated
      const deprecated = /@deprecated|deprecated|renamed|use\s+[A-Z]|replaced\s+by/i.test(
        propComment,
      )
      const replacedByMatch = propComment.match(
        /use\s+`?([a-zA-Z-]+)`?|replaced\s+by\s+`?([a-zA-Z-]+)`?/i,
      )
      const replacedBy = replacedByMatch ? replacedByMatch[1] || replacedByMatch[2] : undefined

      // Extract enum values from union types like "a" | "b" | "c"
      const enumMatch = propType.match(/"([^"]+)"/g)
      const enumValues = enumMatch ? enumMatch.map((m) => m.replace(/"/g, '')) : undefined

      spec.props.push({
        name: propName,
        type: propType,
        required: !propMatch[0].includes('?'),
        description,
        enum: enumValues,
        deprecated,
        replacedBy,
      })
    }

    // Then, extract props WITHOUT JSDoc comments
    // Use a more sophisticated approach: find prop name, then consume until semicolon
    // This handles multi-line types better
    const lines = propsContent.split('\n')
    let i = 0
    while (i < lines.length) {
      const line = lines[i].trim()

      // Skip empty lines, comments, and closing braces
      if (!line || line.startsWith('//') || line.startsWith('*') || line === '}') {
        i++
        continue
      }

      // Look for prop definition: propName?: type;
      // Match prop name at start of line (not preceded by JSDoc)
      const propNameMatch = line.match(/^(\w+)\??\s*:\s*(.+)$/)
      if (propNameMatch) {
        const propName = propNameMatch[1]
        let propType = propNameMatch[2]
        const isOptional = line.includes('?')

        // Skip if already processed (had JSDoc)
        if (processedProps.has(propName)) {
          i++
          continue
        }

        // If type doesn't end with semicolon, continue reading lines until we find one
        if (!propType.endsWith(';')) {
          i++
          while (i < lines.length) {
            const nextLine = lines[i].trim()
            propType += ' ' + nextLine
            if (nextLine.endsWith(';')) {
              propType = propType.slice(0, -1).trim() // Remove trailing semicolon
              break
            }
            i++
          }
        } else {
          propType = propType.slice(0, -1).trim() // Remove trailing semicolon
        }

        // Extract enum values from union types
        const enumMatch = propType.match(/"([^"]+)"/g)
        const enumValues = enumMatch ? enumMatch.map((m) => m.replace(/"/g, '')) : undefined

        spec.props.push({
          name: propName,
          type: propType,
          required: !isOptional,
          enum: enumValues,
          deprecated: false,
        })

        processedProps.add(propName)
      }

      i++
    }
  }

  // Extract slots from API section
  const slotsSection = section.match(
    /###\s+Slots[\s\S]*?```ts[\s\S]*?interface\s+\w+Slots\s*\{([\s\S]*?)\}[\s\S]*?```/i,
  )
  if (slotsSection) {
    const slotsContent = slotsSection[1]
    const slotRegex = /(\w+)\(\):\s*any;/g
    let slotMatch
    while ((slotMatch = slotRegex.exec(slotsContent)) !== null) {
      spec.slots.push({
        name: slotMatch[1],
      })
    }
  }

  // Extract events from API section
  const eventsSection = section.match(
    /###\s+Emits[\s\S]*?```ts[\s\S]*?interface\s+\w+Emits\s*\{([\s\S]*?)\}[\s\S]*?```/i,
  )
  if (eventsSection) {
    const eventsContent = eventsSection[1]
    const eventRegex = /(\w+):\s*\(payload:[\s\S]*?\)\s*=>\s*void;/g
    let eventMatch
    while ((eventMatch = eventRegex.exec(eventsContent)) !== null) {
      spec.events.push({
        name: eventMatch[1],
      })
    }
  }

  // Check if requires UApp wrapper
  spec.requiresAppWrapper = /requires?\s+<UApp>|must\s+be\s+wrapped/i.test(section)

  return spec
}

/**
 * Single-pass streaming parser that extracts all target components
 */
async function extractComponents(
  source: AsyncIterable<string>,
): Promise<Record<string, ComponentSpec>> {
  const components: Record<string, ComponentSpec> = {}
  const targetSet = new Set(TARGET_COMPONENTS)

  let currentComponent: string | null = null
  let currentLines: string[] = []
  let currentDepth = 0

  for await (const line of source) {
    // Check if this is a component header (# ComponentName - single #)
    // Component names in docs are without U prefix (e.g., "Button", "Card")
    const componentMatch = line.match(/^#\s+([A-Z][a-zA-Z0-9]+)\s*$/)
    if (componentMatch) {
      // Save previous component if we were collecting one
      if (currentComponent && currentLines.length > 0) {
        if (targetSet.has(currentComponent)) {
          const spec = parseComponentSection(currentLines, currentComponent)
          if (spec) {
            components[spec.name] = spec

            console.log(`✓ Extracted ${spec.name}`)
          }
        }
      }

      // Start new component (name is already without U prefix)
      const componentName = componentMatch[1]
      if (targetSet.has(componentName)) {
        currentComponent = componentName
        currentLines = [line]
        currentDepth = 1
      } else {
        currentComponent = null
        currentLines = []
      }
      continue
    }

    // If we're collecting a component, add the line
    if (currentComponent) {
      currentLines.push(line)

      // Check if we've hit the next top-level section (#)
      if (line.startsWith('#') && !line.startsWith('##')) {
        const newDepth = line.match(/^#+/)?.[0]?.length || 0
        if (newDepth <= currentDepth && newDepth === 1) {
          // Save and stop collecting (only stop on #, not ##)
          if (targetSet.has(currentComponent)) {
            const spec = parseComponentSection(currentLines, currentComponent)
            if (spec) {
              components[spec.name] = spec

              console.log(`✓ Extracted ${spec.name}`)
            }
          }
          currentComponent = null
          currentLines = []
        }
      }
    }
  }

  // Handle last component
  if (currentComponent && currentLines.length > 0) {
    if (targetSet.has(currentComponent)) {
      const spec = parseComponentSection(currentLines, currentComponent)
      if (spec) {
        components[spec.name] = spec

        console.log(`✓ Extracted ${spec.name}`)
      }
    }
  }

  return components
}

/**
 * Main generator function using single-pass streaming
 */
async function generateSpec() {
  // Try to fetch with streaming, or use local file
  let source: AsyncIterable<string>

  try {
    const response = await fetch('https://ui.nuxt.com/llms-full.txt')
    if (!response.ok) throw new Error('Failed to fetch')

    if (!response.body) throw new Error('No response body')

    // Convert ReadableStream to async iterable of lines
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    source = (async function* () {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            if (buffer) yield buffer
            break
          }
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            yield line
          }
        }
      } finally {
        reader.releaseLock()
      }
    })()
  } catch {
    // Fallback to local file
    const localPath = join(__dirname, '../llms-full.txt')
    if (!existsSync(localPath)) {
      console.error('Could not fetch or read llms-full.txt')
      console.error('Please download it from https://ui.nuxt.com/llms-full.txt')
      process.exit(1)
    }

    const fileStream = createReadStream(localPath, { encoding: 'utf-8' })
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    })

    source = (async function* () {
      for await (const line of rl) {
        yield line
      }
    })()
  }

  console.log('Extracting component specifications...')
  const components = await extractComponents(source)

  // Check for missing components
  for (const target of TARGET_COMPONENTS) {
    const fullName = `U${target}`
    if (!components[fullName]) {
      console.warn(`⚠ Could not find ${fullName} in spec`)
    }
  }

  const output = {
    version: '4.0.0',
    generatedAt: new Date().toISOString(),
    components,
  }

  const outputPath = join(__dirname, '../src/spec/nuxt-ui-v4.json')
  writeFileSync(outputPath, JSON.stringify(output, null, 2))

  console.log(`\n✓ Generated spec at ${outputPath}`)

  console.log(`  Extracted ${Object.keys(components).length} components`)
}

generateSpec().catch((error) => {
  console.error(error)
  process.exit(1)
})
