# Design Notes

## Architecture

### File Structure

```
eslint-plugin-nuxt-ui/
├── src/
│   ├── index.ts                 # Plugin entry point, exports rules & configs
│   ├── types.ts                 # TypeScript type definitions
│   ├── rules/                   # Individual ESLint rules
│   │   ├── no-unknown-component-prop.ts
│   │   ├── no-deprecated-prop.ts
│   │   ├── no-deprecated-slot.ts
│   │   ├── no-deprecated-event.ts
│   │   └── require-valid-variant-values.ts
│   ├── utils/                   # Shared utilities
│   │   ├── component-utils.ts   # Name normalization, matching
│   │   └── spec-loader.ts       # Load JSON spec
│   └── spec/
│       └── nuxt-ui-v4.json      # Generated component specifications
├── scripts/
│   └── gen-spec.ts              # Spec generator from llms-full.txt
├── tests/                       # RuleTester test cases
├── package.json
├── tsconfig.json
├── tsup.config.ts              # Build configuration
└── README.md
```

## Key Design Decisions

### 1. Spec Generation

- **Why JSON?** Avoids network requests during linting, faster execution
- **Versioned spec** allows future support for multiple Nuxt UI versions
- **Generator script** can be re-run when docs update

### 2. Component Name Normalization

- Handles both `<UButton>` and `<u-button>` (PascalCase and kebab-case)
- Supports custom prefixes via configuration
- Normalizes to PascalCase internally for spec lookup

### 3. Prop Name Handling

- Vue automatically converts kebab-case to camelCase
- Rules check both formats to avoid false positives
- Handles `:prop="..."` (dynamic) vs `prop="literal"` (static)

### 4. Static Analysis Only

- Only validates string literals, not dynamic expressions
- Skips `v-bind="obj"` spreads (can't statically analyze)
- This prevents false positives but means some invalid usage won't be caught

### 5. Autofix Strategy

- Only provides fixes for mechanical renames (prop/slot/event names)
- Doesn't fix complex transformations (would require AST manipulation)
- Fixes are safe and predictable

### 6. Rule Severity

- Default: `error` for unknown/deprecated usage
- Can be configured per-rule or globally
- Recommended config enables all rules as errors

## Template AST Traversal

Uses `vue-eslint-parser`'s template AST:

- `VElement` nodes represent component tags
- `VAttribute` nodes represent props/attributes
- `VDirectiveKey` for `v-on`, `v-slot`, etc.
- `VLiteral` for static string values

## Spec Schema

```typescript
{
  version: string
  components: {
    [componentName: string]: {
      props: Array<{
        name: string
        type: string
        enum?: string[]
        deprecated?: boolean
        replacedBy?: string
      }>
      slots: Array<{
        name: string
        deprecated?: boolean
        replacedBy?: string
      }>
      events: Array<{
        name: string
        deprecated?: boolean
        replacedBy?: string
      }>
      requiresAppWrapper?: boolean
    }
  }
}
```

## Limitations & Future Work

### Current Limitations

1. **Spec parsing** is basic - relies on regex patterns. Could be improved with
   proper markdown parsing
2. **Dynamic props** are skipped - can't validate `:prop="dynamicValue"`
3. **Tailwind class validation** in `ui` prop is not implemented (would require
   Tailwind parser)
4. **UApp wrapper detection** is not implemented (requires full app tree
   analysis)

### Future Enhancements

1. Better spec parsing from llms-full.txt (use proper markdown parser)
2. Type-aware validation (if TypeScript types are available)
3. Integration with eslint-plugin-tailwindcss for `ui` prop validation
4. Full app tree traversal for UApp wrapper detection
5. Support for JSX/TSX usage
6. More comprehensive autofixes

## Testing Strategy

- Use ESLint's RuleTester with vue-eslint-parser
- Test both PascalCase and kebab-case component names
- Test static and dynamic prop values
- Test autofixes where applicable
- Golden tests for most-used components

## Performance Considerations

- Spec is loaded once and cached
- Component matching is O(1) via Set/Map lookups
- Only processes Vue SFC templates (not script blocks)
- Minimal AST traversal overhead
