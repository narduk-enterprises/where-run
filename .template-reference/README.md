## Template Reference Baselines

These files are synced from the template into downstream apps as **reference
copies** for files that are intentionally allowed to stay app-local.

They exist so each app can keep a customized:

- `apps/web/AGENTS.md`
- `tools/AGENTS.md`
- `CONTRIBUTING.md`
- `playwright.config.ts`

while still having a current template baseline to diff against.

Typical workflow in a downstream app:

```bash
diff -u .template-reference/apps/web/AGENTS.md apps/web/AGENTS.md
diff -u .template-reference/tools/AGENTS.md tools/AGENTS.md
diff -u .template-reference/CONTRIBUTING.md CONTRIBUTING.md
diff -u .template-reference/playwright.config.ts playwright.config.ts
```

Do not edit the reference copies inside a downstream app. Update the template
baseline instead, then run template sync.
