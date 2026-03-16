# Quick Setup

The plugin is now integrated directly into the project - no separate install
needed!

## Current Status

✅ Plugin code is in `eslint-plugin-nuxt-ui/` ✅ ESLint config imports it
directly ✅ Ready to use once spec is generated

## Generate Spec (First Time)

```bash
npm run lint:nuxt-ui:gen-spec
```

**Note**: The current spec generator uses basic regex parsing and may not
extract all components perfectly. The spec file will be created at:

```
eslint-plugin-nuxt-ui/src/spec/nuxt-ui-v4.json
```

## Using the Plugin

The plugin is already enabled in `eslint.config.mjs`. Just run:

```bash
npm run lint
```

## If Spec Generation Fails

The plugin will work with an empty spec (won't error, just won't validate). To
improve the spec generator:

1. The regex patterns in `scripts/gen-spec.ts` need refinement
2. Consider using a proper markdown parser
3. Or manually create/edit `src/spec/nuxt-ui-v4.json` based on Nuxt UI docs

## Next Steps

1. Improve spec generator parsing (or manually create spec)
2. Test with `npm run lint`
3. Add more rules as needed
