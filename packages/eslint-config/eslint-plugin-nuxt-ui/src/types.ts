/**
 * Type definitions for Nuxt UI component specifications
 */

export interface ComponentProp {
  name: string
  type: string
  required?: boolean
  default?: string
  description?: string
  enum?: string[]
  deprecated?: boolean
  replacedBy?: string
}

export interface ComponentSlot {
  name: string
  description?: string
  deprecated?: boolean
  replacedBy?: string
}

export interface ComponentEvent {
  name: string
  description?: string
  deprecated?: boolean
  replacedBy?: string
}

export interface ComponentSpec {
  name: string
  props: ComponentProp[]
  slots: ComponentSlot[]
  events: ComponentEvent[]
  requiresAppWrapper?: boolean
}

export interface NuxtUISpec {
  version: string
  components: Record<string, ComponentSpec>
}

export interface PluginOptions {
  prefixes?: string[]
  components?: string[]
  specPath?: string
  severity?: 'error' | 'warn' | 'off'
}
