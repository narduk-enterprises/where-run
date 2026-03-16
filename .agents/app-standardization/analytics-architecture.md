# Analytics Architecture Reference

> **Location:** `.agents/app-standardization/analytics-architecture.md`
>
> Everything an agent needs to know to set up, audit, or troubleshoot analytics
> across any Narduk app.

---

## Entity Hierarchy

```mermaid
graph TD
    A["Google Cloud Project<br/><b>narduk-analytics</b>"] --> B["Service Account<br/>analytics-admin@narduk-analytics.iam.gserviceaccount.com"]
    A --> C["GA4 Account<br/><b>377883200</b>"]
    C --> D1["Property: clawdle<br/>G-CJQTK0EP1C"]
    C --> D2["Property: flashcard-pro<br/>G-50XDR48NRY"]
    C --> D3["Property: portfolio<br/>G-Z463980Z97"]
    C --> D4["Property: papa-everetts-pizza<br/>G-8WZ93XNKHX"]
    C --> D5["Property: ogpreview-app<br/>G-GPBN760E23"]
    C --> D6["Property: old-austin-grouch<br/>G-25BQF233XW"]
    C --> D7["Property: neon-sewer-raid<br/>G-98D3NQ778G"]
    C --> D8["Property: imessage-dictionary<br/>G-D828EMDYLC"]
    C --> D9["Property: nagolnagemluapleira<br/>G-PD2G5Z5H0R"]
    C --> D10["Property: ... (new apps)"]
    B --> E["GSC Sites<br/>(registered per SITE_URL)"]
    B --> F["Indexing API<br/>(urlNotifications:publish)"]
```

## Doppler Architecture

```mermaid
graph LR
    subgraph "Hub Projects (shared, DO NOT modify)"
        H1["narduk-nuxt-template<br/>CLOUDFLARE_API_TOKEN<br/>CLOUDFLARE_ACCOUNT_ID"]
        H2["narduk-analytics<br/>GA_ACCOUNT_ID<br/>GSC_SERVICE_ACCOUNT_JSON<br/>GSC_USER_EMAIL<br/>POSTHOG_PUBLIC_KEY<br/>POSTHOG_PROJECT_ID<br/>POSTHOG_HOST"]
    end
    subgraph "Per-App Spoke Projects"
        S1["my-app<br/>SITE_URL (per-app)<br/>APP_NAME (per-app)<br/>GA_MEASUREMENT_ID (auto)<br/>INDEXNOW_KEY (auto)"]
    end
    H1 -->|"cross-ref"| S1
    H2 -->|"cross-ref"| S1
```

## Shared Identifiers (narduk-analytics project)

| Entity                | Value                                                      |
| --------------------- | ---------------------------------------------------------- |
| GCP Project ID        | `narduk-analytics`                                         |
| Service Account Email | `analytics-admin@narduk-analytics.iam.gserviceaccount.com` |
| GA4 Account ID        | `377883200`                                                |
| GSC User Email        | `narduk@gmail.com`                                         |
| PostHog Public Key    | `phc_89fp2sDs0E8GTO5BAGoMTz1MkZbJ5BuCcR4fryqcuAF`          |
| PostHog Project ID    | `325202`                                                   |
| PostHog Host          | `https://us.i.posthog.com`                                 |

## Per-App Measurement IDs

| App                          | GA4 Measurement ID | Production URL                                   | IndexNow |
| ---------------------------- | ------------------ | ------------------------------------------------ | -------- |
| clawdle                      | `G-CJQTK0EP1C`     | `https://clawdle.com`                            | ✅       |
| flashcard-pro                | `G-50XDR48NRY`     | `https://flashcard-pro.narduk.workers.dev`       | ✅       |
| narduk-enterprises-portfolio | `G-Z463980Z97`     | `https://portfolio.nard.uk`                      | ✅       |
| papa-everetts-pizza          | `G-8WZ93XNKHX`     | `https://papaeverettspizza.com`                  | ✅       |
| ogpreview-app                | `G-GPBN760E23`     | `https://ogpreview.app`                          | ✅       |
| old-austin-grouch            | `G-25BQF233XW`     | `https://grouch.austin-texas.net`                | ✅       |
| neon-sewer-raid              | `G-98D3NQ778G`     | `https://neon-sewer-raid.narduk.workers.dev`     | ❌       |
| imessage-dictionary          | `G-D828EMDYLC`     | `https://dictionary.nard.uk`                     | ❌       |
| nagolnagemluapleira          | `G-PD2G5Z5H0R`     | `https://nagolnagemluapleira.narduk.workers.dev` | ❌       |

## Integration Flow (Runtime)

```mermaid
sequenceDiagram
    participant Browser
    participant NuxtApp
    participant GA4
    participant PostHog
    participant GSC
    participant IndexNow

    Note over NuxtApp: Client-side plugins (no-op without keys)
    Browser->>NuxtApp: Page load
    NuxtApp->>GA4: gtag('config', GA_MEASUREMENT_ID)
    NuxtApp->>PostHog: posthog.init(POSTHOG_PUBLIC_KEY)

    Note over NuxtApp: SPA navigation
    Browser->>NuxtApp: Route change
    NuxtApp->>GA4: gtag('event', 'page_view')
    NuxtApp->>PostHog: posthog.capture('$pageview')

    Note over NuxtApp: Server-side (admin endpoints)
    NuxtApp->>GSC: /api/admin/gsc/performance (JWT auth)
    NuxtApp->>IndexNow: /api/indexnow/submit (Bing, Yandex)
    NuxtApp->>GA4: /api/admin/ga/overview (JWT auth)
```

## Key Files

| File                                   | Purpose                                           |
| -------------------------------------- | ------------------------------------------------- |
| `layers/.../plugins/gtag.client.ts`    | GA4 page tracking (reads `GA_MEASUREMENT_ID`)     |
| `layers/.../plugins/posthog.client.ts` | PostHog analytics (reads `POSTHOG_PUBLIC_KEY`)    |
| `layers/.../server/utils/google.ts`    | Service account JWT auth for GA/GSC/Indexing APIs |
| `tools/setup-analytics.ts`             | Bootstrap: PostHog → GA4 → GSC → IndexNow         |
| `tools/gsc-toolbox.ts`                 | CLI for GSC site management + Indexing API        |

## Troubleshooting

| Symptom                    | Cause                              | Fix                                                                                                 |
| -------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| GA4 not tracking           | `GA_MEASUREMENT_ID` empty or wrong | Check Doppler: `doppler secrets get GA_MEASUREMENT_ID --project APP --config prd`                   |
| PostHog not tracking       | `POSTHOG_PUBLIC_KEY` empty         | Wire hub ref: `doppler secrets set 'POSTHOG_PUBLIC_KEY=${narduk-analytics.prd.POSTHOG_PUBLIC_KEY}'` |
| GSC API 403                | Service account not authorized     | Add `analytics-admin@narduk-analytics.iam.gserviceaccount.com` as owner in GSC                      |
| IndexNow 400               | Key file not served                | Check `INDEXNOW_KEY` is set and `/api/indexnow/submit` exists                                       |
| `setup-analytics.ts` fails | Missing `GA_ACCOUNT_ID`            | Wire hub ref from `narduk-analytics`                                                                |
