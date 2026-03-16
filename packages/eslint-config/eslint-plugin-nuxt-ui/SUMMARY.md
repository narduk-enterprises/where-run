# ESLint Plugin for Nuxt UI v4 - Complete Summary

## Overview

This ESLint plugin validates Nuxt UI v4 component usage in Nuxt 4 projects,
flagging:

- Unknown props/slots/events
- Deprecated syntax from older Nuxt UI versions
- Invalid variant/enum values
- Common mistakes

## File Structure

```
eslint-plugin-nuxt-ui/
├── src/
│   ├── index.ts                      # Plugin entry, exports all rules
│   ├── types.ts                      # TypeScript interfaces
│   ├── rules/                        # 5 ESLint rules
│   │   ├── no-unknown-component-prop.ts
│   │   ├── no-deprecated-prop.ts
│   │   ├── no-deprecated-slot.ts
│   │   ├── no-deprecated-event.ts
│   │   └── require-valid-variant-values.ts
│   ├── utils/
│   │   ├── component-utils.ts        # Name normalization
│   │   └── spec-loader.ts           # JSON spec loader
│   └── spec/
│       └── nuxt-ui-v4.json          # Generated component specs
├── scripts/
│   └── gen-spec.ts                  # Fetches & parses llms-full.txt
├── tests/                           # RuleTester tests
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

## Key Design Decisions

### 1. Spec as JSON

- **Why**: Fast, no network during lint, versioned
- **How**: Generator script parses `llms-full.txt` → JSON
- **When**: Run `npm run gen:spec` before linting

### 2. Component Name Normalization

- Handles `<UButton>` and `<u-button>` → `UButton`
- Supports custom prefixes: `['U', 'Nuxt']`
- Case-insensitive matching

### 3. Static Analysis Only

- Validates string literals: `variant="solid"` ✅
- Skips dynamic: `:variant="dynamic"` ⏭️
- Skips spreads: `v-bind="obj"` ⏭️

### 4. Autofix Strategy

- Only for mechanical renames
- Example: `oldProp` → `newProp`
- Safe and predictable

## Rules Implemented

### 1. `no-unknown-component-prop`

- **What**: Flags props not in v4 spec
- **Example**: `<UButton unknownProp="value">`
- **Fix**: None (manual fix required)

### 2. `no-deprecated-prop`

- **What**: Flags deprecated props
- **Example**: `<UButton oldName="value">`
- **Fix**: Auto-renames if `replacedBy` exists

### 3. `no-deprecated-slot`

- **What**: Flags deprecated/unknown slots
- **Example**: `<template #oldSlot>`
- **Fix**: Auto-renames if `replacedBy` exists

### 4. `no-deprecated-event`

- **What**: Flags deprecated/unknown events
- **Example**: `@oldEvent="handler"`
- **Fix**: Auto-renames if `replacedBy` exists

### 5. `require-valid-variant-values`

- **What**: Validates enum prop values
- **Example**: `<UButton variant="invalid">`
- **Fix**: None (shows allowed values)

## Installation & Setup

### Step 1: Install

```bash
npm install --save-dev eslint-plugin-nuxt-ui
```

### Step 2: Generate Spec

```bash
cd node_modules/eslint-plugin-nuxt-ui
npm run gen:spec
```

### Step 3: Configure ESLint

```js
// eslint.config.mjs
import withNuxt from './.nuxt/eslint.config.mjs'
import nuxtUI from 'eslint-plugin-nuxt-ui'

export default withNuxt({
  plugins: {
    'nuxt-ui': nuxtUI,
  },
  rules: {
    ...nuxtUI.configs.recommended.rules,
  },
})
```

### Step 4: Run Lint

```bash
npm run lint
```

## Spec Generator Details

The `gen-spec.ts` script:

1. Fetches `https://ui.nuxt.com/llms-full.txt`
2. Parses markdown sections for each component
3. Extracts:
   - Props (name, type, enum, deprecated, replacedBy)
   - Slots (name, deprecated, replacedBy)
   - Events (name, deprecated, replacedBy)
4. Outputs JSON to `src/spec/nuxt-ui-v4.json`

**Note**: Current parsing is regex-based and basic. Could be improved with a
proper markdown parser.

## Supported Components (39 total)

**Priority (Most Used):** UButton, UCard, UIcon, UInput, UForm, UFormField,
UModal, UBadge, UAvatar, USkeleton, USelect, UTable, UTabs, UContainer, UAlert,
UPagination, USeparator, UCheckbox, UTextarea, UInputMenu, USwitch, UDropdown,
UPopover, UTooltip, USlideover

**Additional:** UEmpty, UProgress, UToggle, UKbd, UCollapsible, UFormGroup,
UDropdownMenu, USelectMenu, UNavigationMenu, UDashboardSidebar, UDashboardPanel,
UDashboardGroup, UApp, UUser

## Configuration Options

```js
{
  rules: {
    'nuxt-ui/no-unknown-component-prop': ['error', {
      prefixes: ['U'],              // Component prefixes
      components: ['UButton'],      // Allowlist (optional)
      specPath: './custom.json',    // Custom spec (optional)
    }],
  }
}
```

## Limitations

1. **Spec Parsing**: Basic regex - may miss some edge cases
2. **Dynamic Props**: Only validates static string literals
3. **Tailwind Classes**: `ui` prop validation not implemented
4. **UApp Detection**: Not implemented (requires full app tree)
5. **JSX/TSX**: Not supported in v1 (Vue SFC only)

## Future Enhancements

1. Better markdown parsing for spec generation
2. Type-aware validation (if TS types available)
3. Tailwind class validation in `ui` prop
4. Full app tree traversal for UApp detection
5. JSX/TSX support
6. More comprehensive autofixes

## Testing

Uses ESLint's RuleTester:

- Tests PascalCase and kebab-case
- Tests static and dynamic values
- Tests autofixes
- Golden tests for priority components

## Publishing

```bash
# 1. Generate spec
npm run gen:spec

# 2. Build
npm run build

# 3. Test
npm test

# 4. Publish
npm publish
```

## Success Criteria ✅

- ✅ Flags unknown props on UButton/UCard/etc
- ✅ Detects deprecated/renamed props/slots/events
- ✅ Validates enum variant values
- ✅ Provides autofixes for renames
- ✅ No network required during lint
- ✅ Works with ESLint 9 flat config
- ✅ Compatible with @nuxt/eslint

## Code Quality

- TypeScript for type safety
- ESM + CJS builds
- Comprehensive error messages
- Helpful documentation links
- Extensible architecture
