# eslint-plugin-nuxt-ui

ESLint plugin to validate Nuxt UI v4 component usage in Nuxt 4 projects. Flags
common mistakes and deprecated syntax.

## Installation

```bash
npm install --save-dev eslint-plugin-nuxt-ui
# or
pnpm add -D eslint-plugin-nuxt-ui
```

## Prerequisites

- ESLint ^8.0.0 or ^9.0.0
- vue-eslint-parser ^9.0.0
- Nuxt 4 with Nuxt UI 4

## Setup

### 1. Generate Component Specifications

First, generate the component spec from the Nuxt UI documentation:

```bash
npm run gen:spec
# or
pnpm gen:spec
```

This fetches the spec from `https://ui.nuxt.com/llms-full.txt` and generates
`src/spec/nuxt-ui-v4.json`.

### 2. Configure ESLint

Add the plugin to your ESLint flat config (`eslint.config.mjs`):

```js
import nuxtUI from 'eslint-plugin-nuxt-ui'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // ... your existing config
  {
    plugins: {
      'nuxt-ui': nuxtUI,
    },
    rules: {
      ...nuxtUI.configs.recommended.rules,
      // Or configure individually:
      'nuxt-ui/no-unknown-component-prop': 'error',
      'nuxt-ui/no-deprecated-prop': 'error',
      'nuxt-ui/require-valid-variant-values': 'error',
    },
  },
)
```

## Rules

### `nuxt-ui/no-unknown-component-prop`

Flags props that don't exist in Nuxt UI v4 spec.

**Example:**

```vue
<!-- ❌ Error: Unknown prop "oldProp" on UButton -->
<UButton oldProp="value">Click</UButton>

<!-- ✅ Valid -->
<UButton variant="solid">Click</UButton>
```

### `nuxt-ui/no-deprecated-prop`

Flags deprecated props and provides autofix when a replacement exists.

**Example:**

```vue
<!-- ❌ Error: Prop "oldName" is deprecated. Use "newName" instead -->
<UButton oldName="value">Click</UButton>

<!-- ✅ Autofix available -->
<UButton newName="value">Click</UButton>
```

### `nuxt-ui/require-valid-variant-values`

Validates enum prop values (like `variant`, `size`, `color`) against documented
options.

**Example:**

```vue
<!-- ❌ Error: Invalid value "wrong" for prop "variant". Allowed values: solid, soft, ghost, ... -->
<UButton variant="wrong">Click</UButton>

<!-- ✅ Valid -->
<UButton variant="solid">Click</UButton>
```

## Configuration Options

```js
{
  rules: {
    'nuxt-ui/no-unknown-component-prop': ['error', {
      prefixes: ['U'], // Component name prefixes (default: ['U'])
      components: ['UButton', 'UCard'], // Allowlist (default: all supported)
      specPath: './custom-spec.json', // Custom spec path
    }],
  }
}
```

## Supported Components

The plugin validates these Nuxt UI v4 components:

**Most Used (Priority):**

- UButton, UCard, UIcon, UInput, UForm, UFormField, UModal, UBadge, UAvatar,
  USkeleton
- USelect, UTable, UTabs, UContainer, UAlert, UPagination, USeparator, UCheckbox
- UTextarea, UInputMenu, USwitch, UDropdown, UPopover, UTooltip, USlideover

**Additional:**

- UEmpty, UProgress, UToggle, UKbd, UCollapsible, UFormGroup
- UDropdownMenu, USelectMenu, UNavigationMenu
- UDashboardSidebar, UDashboardPanel, UDashboardGroup, UApp, UUser

## Publishing

To publish this plugin:

```bash
# 1. Generate the spec first
npm run gen:spec

# 2. Build
npm run build

# 3. Test
npm test

# 4. Publish (will run build automatically)
npm publish
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Generate spec (fetches from ui.nuxt.com)
npm run gen:spec

# Test
npm test

# Watch mode
npm run dev
```

## How It Works

1. **Spec Generation**: The `gen-spec.ts` script fetches `llms-full.txt` from
   `https://ui.nuxt.com/llms-full.txt` and extracts component specifications
   into a JSON file.

2. **Linting**: During ESLint runs, the plugin:
   - Loads the JSON spec (cached after first load)
   - Traverses Vue template AST
   - Matches component names against configured prefixes
   - Validates props/slots/events against the spec
   - Reports errors with helpful messages

3. **Autofixes**: When a deprecated prop/slot/event has a `replacedBy` value,
   ESLint can automatically fix simple renames.

## Limitations

- Only validates static prop values (string literals). Dynamic props with
  expressions are skipped.
- Spec must be generated before linting (no network requests during lint).
- Autofixes are only available for simple prop renames.

## Contributing

Contributions welcome! Please ensure:

1. Run `npm run gen:spec` to update the spec
2. Add tests for new rules
3. Update README with new features

## License

MIT
