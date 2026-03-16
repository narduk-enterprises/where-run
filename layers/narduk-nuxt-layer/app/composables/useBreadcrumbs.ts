/**
 * useBreadcrumbs — Route-aware breadcrumb generation.
 *
 * Derives breadcrumb items from the current route path segments.
 * Compatible with Nuxt UI's UBreadcrumb component.
 * Includes JSON-LD structured data for SEO.
 *
 * @example
 * ```vue
 * <script setup>
 * const { items } = useBreadcrumbs()
 * </script>
 * <template>
 *   <UBreadcrumb :items="items" />
 * </template>
 * ```
 */
export interface BreadcrumbItem {
  label: string
  to?: string
  icon?: string
}

export interface UseBreadcrumbsOptions {
  /** Custom label resolver for route segments. If not provided, segments are title-cased. */
  resolveLabel?: (segment: string) => string | undefined
  /** Home icon (default: 'i-lucide-house') */
  homeIcon?: string
}

export function useBreadcrumbs(options: UseBreadcrumbsOptions = {}) {
  const route = useRoute()
  const runtimeConfig = useRuntimeConfig()
  const { resolveLabel, homeIcon = 'i-lucide-house' } = options
  const siteUrl = ((runtimeConfig.public?.siteUrl as string) || '').replace(/\/$/, '')

  const items = computed<BreadcrumbItem[]>(() => {
    const segments = route.path.replace(/\/$/, '').split('/').filter(Boolean)
    if (segments.length === 0) return []

    const result: BreadcrumbItem[] = [{ label: 'Home', to: '/', icon: homeIcon }]
    let path = ''

    for (const segment of segments) {
      path += `/${segment}`
      const customLabel = resolveLabel?.(segment)
      const label =
        customLabel ?? segment.replaceAll('-', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase())
      result.push({ label, to: `${path}/` })
    }

    // Last item is current page — no link
    if (result.length > 1) {
      const last = result.at(-1)
      if (last) delete last.to
    }

    return result
  })

  // JSON-LD structured data
  const jsonLdItems = computed(() =>
    items.value.map((item, index) => ({
      '@type': 'ListItem' as const,
      position: index + 1,
      name: item.label,
      item: item.to ? `${siteUrl}${item.to}` : undefined,
    })),
  )

  return { items, jsonLdItems }
}
