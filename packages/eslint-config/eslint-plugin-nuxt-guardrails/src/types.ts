/**
 * Type definitions for Nuxt Guardrails ESLint plugin
 */

export interface Nuxt4Spec {
  version: string
  generatedAt: string
  apis: Record<string, ApiSpec>
  deprecations: Record<string, DeprecationSpec>
}

export interface ApiSpec {
  name: string
  deprecated?: boolean
  replacedBy?: string
  docUrl: string
  usage?: string[]
  options?: Record<string, OptionSpec>
}

export interface OptionSpec {
  enum?: string[]
  description?: string
  deprecated?: boolean
  replacedBy?: string
}

export interface DeprecationSpec {
  message: string
  replacement: string
  docUrl: string
}

export interface PluginOptions {
  strictness?: 'low' | 'medium' | 'high'
  projectStyle?: 'app-dir' | 'mixed' | 'legacy' | 'auto'
  allowProcessClientServer?: boolean
  requireStableAsyncDataKeys?: boolean
}
