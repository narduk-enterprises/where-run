# eslint-plugin-vue-official-best-practices

ESLint plugin to enforce Vue 3 best practices (Composition API +
`<script setup>`) based strictly on official Vue documentation, with Nuxt
compatibility.

## Installation

This plugin is part of the monorepo and is automatically available when running
ESLint.

## Configuration

### Recommended (Default)

The `recommended` config provides pragmatic defaults with warnings for most
rules and errors for critical violations:

```javascript
import vueOfficialBestPractices from './tools/eslint-plugin-vue-official-best-practices/src/index.js'

export default {
  plugins: {
    'vue-official': vueOfficialBestPractices,
  },
  rules: {
    ...vueOfficialBestPractices.configs.recommended.rules,
  },
}
```

### Strict

The `strict` config enforces all rules as errors:

```javascript
import vueOfficialBestPractices from './tools/eslint-plugin-vue-official-best-practices/src/index.js'

export default {
  plugins: {
    'vue-official': vueOfficialBestPractices,
  },
  rules: {
    ...vueOfficialBestPractices.configs.strict.rules,
  },
}
```

## Rules

### Component Rules

#### `vue-official/require-script-setup`

Warns when Options API is used instead of `<script setup>`.

**Options:**

- `allowOptionsApi` (boolean, default: `true`) - Allow Options API in mixed
  codebases

**Docs:** [Vue Style Guide](https://vuejs.org/style-guide/)

---

#### `vue-official/no-setup-top-level-side-effects`

Errors on top-level side effects in `<script setup>` that can cause SSR issues.

**Detects:**

- `fetch()` calls (not `useFetch`)
- `setInterval`/`setTimeout` without cleanup
- `addEventListener` without cleanup
- Direct DOM access (`document.*`, `window.*`)

**Allows:**

- Side effects inside lifecycle hooks (`onMounted`, etc.)
- Nuxt composables at top-level (`useFetch`, `useAsyncData`, etc.)

**Docs:** [Vue SSR Guide](https://vuejs.org/guide/scaling-up/ssr.html)

---

#### `vue-official/no-async-computed-getter`

Errors on async computed properties (anti-pattern).

**Suggests:** Use `watchEffect`/`watch` + `ref`, or Nuxt data fetching
composables.

**Docs:**
[Vue Composition API FAQ](https://vuejs.org/guide/extras/composition-api-faq.html)

---

#### `vue-official/prefer-shallow-watch`

Warns against deep watches for performance.

**Suppression:** Use `/* vue-official allow-deep-watch */` comment

**Options:**

- `strict` (boolean, default: `true`) - Enable strict mode

**Docs:**
[Vue Best Practices](https://vuejs.org/guide/best-practices/overview.html)

---

#### `vue-official/no-template-complex-expressions`

Warns on complex expressions in templates.

**Detects:**

- Nested ternaries (depth > 1)
- Chained logical ops beyond threshold (default: 3)
- Function calls with arguments (unless whitelisted)

**Options:**

- `maxTernaryDepth` (number, default: `1`)
- `maxLogicalOps` (number, default: `3`)
- `allowedFunctions` (string[], default: formatters like `formatPrice`,
  `formatChange`, etc.)

**Docs:** [Vue Style Guide](https://vuejs.org/style-guide/)

---

#### `vue-official/consistent-defineprops-emits`

Errors if `defineProps` or `defineEmits` are called multiple times or not at
top-level.

**Docs:**
[Vue Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)

---

#### `vue-official/prefer-typed-defineprops`

Warns if `defineProps()` uses runtime-only props instead of typed props in
TypeScript.

**Suggests:** `defineProps<{...}>()` or
`withDefaults(defineProps<{...}>(), {...})`

**Docs:**
[Vue TypeScript Guide](https://vuejs.org/guide/typescript/overview.html)

---

### Composable Rules

#### `vue-official/require-use-prefix-for-composables`

Warns when composable functions don't use "use" prefix.

**Applies to:** `composables/**/*.ts|js` (configurable)

**Options:**

- `paths` (string[], default:
  `['**/composables/**/*.ts', '**/composables/**/*.js']`)

**Docs:** [Vue Style Guide](https://vuejs.org/style-guide/)

---

#### `vue-official/no-composable-conditional-hooks`

Warns if composable conditionally calls Vue composables (`ref`, `computed`,
`watchEffect`, etc.).

**Allows:** Hooks inside lifecycle callbacks (those are already conditional)

**Docs:**
[Vue Composition API FAQ](https://vuejs.org/guide/extras/composition-api-faq.html)

---

#### `vue-official/no-composable-dom-access-without-client-guard`

Errors when DOM access in composables lacks client guard.

**Requires:** `if (import.meta.client) { ... }` or `onMounted(...)`

**Options:**

- `allowProcessClient` (boolean, default: `false`) - Allow `process.client`
  (Nuxt legacy)

**Docs:** [Vue SSR Guide](https://vuejs.org/guide/scaling-up/ssr.html)

---

### Store Rules (Pinia)

#### `vue-official/pinia-require-defineStore-id`

Errors if `defineStore` is called without a string literal id.

**Docs:** [Pinia Docs](https://pinia.vuejs.org/)

---

#### `vue-official/pinia-no-direct-state-mutation-outside-actions`

Warns against direct state mutation outside store actions.

**Options:**

- `strict` (boolean, default: `true`) - Enable strict mode

**Docs:** [Pinia Docs](https://pinia.vuejs.org/)

---

#### `vue-official/pinia-prefer-storeToRefs-destructure`

Warns when destructuring reactive store properties without `storeToRefs`.

**Autofix:** Available for simple cases

**Example:**

```typescript
// ❌ Bad
const { count } = useCounterStore()

// ✅ Good
const { count } = storeToRefs(useCounterStore())
```

**Docs:** [Pinia Docs](https://pinia.vuejs.org/)

---

## Nuxt Compatibility

The plugin automatically detects Nuxt projects and adjusts rules accordingly:

- **Auto-detection:** Checks for `nuxt` dependency or `nuxt.config.*` files
- **Allowed patterns:** Top-level `useFetch`, `useAsyncData`, `useState`, etc.
  in `<script setup>`
- **SSR safety:** Prefers `import.meta.client` over `process.client` in messages

## Examples

### Valid Code

```vue
<script setup lang="ts">
// ✅ Typed props
const props = defineProps<{ name: string }>()

// ✅ Nuxt composables at top-level
const { data } = await useFetch('/api/users')

// ✅ Computed (not async)
const doubled = computed(() => count.value * 2)

// ✅ Side effects in lifecycle
onMounted(() => {
  window.addEventListener('resize', handleResize)
})
</script>
```

### Invalid Code

```vue
<script setup>
// ❌ Top-level side effect
fetch('/api/users') // Use useFetch() instead

// ❌ Async computed
const data = computed(async () => {
  return await fetch('/api').then((r) => r.json())
})

// ❌ Deep watch without comment
watch(state, () => {}, { deep: true })
</script>
```

## Migration Guide

1. **Enable recommended config** - Start with warnings
2. **Fix critical errors** - Address `error` level rules first
3. **Gradually fix warnings** - Work through warnings over time
4. **Use strict config** - Once codebase is clean, enable strict mode

## Contributing

This plugin is part of the monorepo. To contribute:

1. Make changes in `tools/eslint-plugin-vue-official-best-practices/`
2. Add tests in `tests/` directory
3. Update this README if adding new rules

## References

- [Vue 3 Documentation](https://vuejs.org/)
- [Vue Style Guide](https://vuejs.org/style-guide/)
- [Vue Best Practices](https://vuejs.org/guide/best-practices/overview.html)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Nuxt Documentation](https://nuxt.com/docs/)
