# Integration Guide

## Adding to Nuxt 4 Project

### Step 1: Install the Plugin

```bash
cd /path/to/your/nuxt-project
npm install --save-dev eslint-plugin-nuxt-ui
```

### Step 2: Generate Component Spec

```bash
cd node_modules/eslint-plugin-nuxt-ui
npm run gen:spec
```

Or if installed locally in your project:

```bash
npm run gen:spec --prefix node_modules/eslint-plugin-nuxt-ui
```

### Step 3: Update ESLint Config

Edit your `eslint.config.mjs`:

```js
import withNuxt from './.nuxt/eslint.config.mjs'
import nuxtUI from 'eslint-plugin-nuxt-ui'

export default withNuxt(
  // ... existing config ...
  {
    plugins: {
      'nuxt-ui': nuxtUI,
    },
    rules: {
      // Use recommended config
      ...nuxtUI.configs.recommended.rules,

      // Or configure individually
      'nuxt-ui/no-unknown-component-prop': 'error',
      'nuxt-ui/no-deprecated-prop': 'error',
      'nuxt-ui/no-deprecated-slot': 'error',
      'nuxt-ui/no-deprecated-event': 'error',
      'nuxt-ui/require-valid-variant-values': 'error',
    },
  },
)
```

### Step 4: Test It

```bash
npm run lint
```

You should see errors for any invalid Nuxt UI component usage!

## Example Errors

### Unknown Prop

```vue
<!-- ❌ Error -->
<UButton oldProp="value">Click</UButton>
```

### Deprecated Prop

```vue
<!-- ❌ Error with autofix -->
<UButton oldName="value">Click</UButton>
<!-- Autofixes to: -->
<UButton newName="value">Click</UButton>
```

### Invalid Variant

```vue
<!-- ❌ Error -->
<UButton variant="invalid">Click</UButton>
<!-- Allowed: solid, soft, ghost, ... -->
```

## Custom Configuration

```js
{
  rules: {
    'nuxt-ui/no-unknown-component-prop': ['error', {
      prefixes: ['U', 'Nuxt'], // Custom prefixes
      components: ['UButton', 'UCard'], // Only check these
      specPath: './custom-spec.json', // Custom spec
    }],
  }
}
```
