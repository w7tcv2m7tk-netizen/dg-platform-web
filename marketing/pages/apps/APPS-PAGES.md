# DigitalGate Apps pages — Gen 2 Website Studio

**Live URLs:** `https://digitalgate.com.au/apps/` and nested App paths  
**Source catalog:** `marketing/pages/apps/catalog.mjs`  
**Sync into Studio (Neon):** from `dg-platform-web`:

```bash
npm run sync:dg-apps
```

Regenerates HTML from the catalog, upserts pages on the **DigitalGate Website** site, and patches homepage, pricing, header nav, and footer chrome.

---

## Studio grouping

Pages appear in Website Studio under:

| Group | Slugs |
|-------|--------|
| **Apps hub** | `apps` |
| **Core Apps** | `apps/core/*` |
| **Infrastructure Apps** | `apps/infrastructure/*` |
| **Industry Apps** | `apps/industry/*` |
| **Growth Apps** | `apps/growth/*` |

Nested slugs (`apps/core/crm`) map to public URLs `/apps/core/crm/` on `digitalgate.com.au`.

---

## Depth tiers

| Depth | Apps | Page job |
|-------|------|----------|
| **Full** | CRM, Opportunities, Real Estate, Accommodation, AI Visibility, SEO, Automation, Prospecting & Opportunity Engine | Sell the operating loop |
| **Lite** | Contacts, Tasks, Calendar, Documents, Communications, Commerce, Website, Website Builder, Domains, DNS, Email, Analytics, Social, Reputation, AI Communications | Status + connection + register interest |
| **Soon** | Hosting, SSL, Backups, Cloudflare, PM, Commercial, Property Development, Services, Finance, Automotive, Creator | Coming Soon template |

Every page reinforces **Connect → Centralise → Understand → Decide → Act → Learn → Grow**.

SEO (title, description, keywords, OG) is set on each page in Studio via sync — editable under the **SEO** tab.

---

## Review

- **Studio:** [DigitalGate Website Studio](https://app.digitalgate.com.au/apps/websites/studio/cmskwz6zv0001l404cfi1wal4)
- **Hub:** https://digitalgate.com.au/apps/
- **Tier 1 examples:** `/apps/core/crm/`, `/apps/industry/property/` (Industry), `/apps/industry/real-estate/` (Property Template), `/apps/growth/prospecting/`

Re-run `npm run sync:dg-apps` after editing `catalog.mjs` or `build.mjs`.

---

## Handoff (cross-machine)

**Repos (sibling folders or in-repo):**

- `marketing/pages/apps/` inside `dg-platform-web` (preferred after clone), **or**
- `dg-platform/marketing/pages/apps/` as a sibling folder — sync uses whichever has `catalog.mjs`
- `dg-platform-web/` — run `npm run sync:dg-apps` with `.env.local`

**Live Studio:** `cmskwz6zv0001l404cfi1wal4` · https://app.digitalgate.com.au/apps/websites/studio/cmskwz6zv0001l404cfi1wal4

**Real Estate page (flagship):** commercial status, What you get, Built for, Roe Realty production proof — see `catalog.mjs` → `real-estate`.

**Full-page template:** 10 sections in `build.mjs` (Hero → Loop → What it does → Built for → Core connection → Workflow → What you get → Production/readiness → Related → Pricing → CTA). Lite/soon pages stay short.

**Priority sell pages:** Core, CRM, Real Estate, Accommodation, AI Visibility, SEO, Automation, Prospecting, Business Audit (funnel at audit.digitalgate.com.au). Do not expand Coming Soon verticals.

**Current focus:** Founding 10 ops — Stage 1 evidence, email reliability, P0/P1, outreach. Website content is sufficient for now.
