# DigitalGate Entity Consolidation

**Status:** Priority 1 complete (August 2026)  
**Canonical marketing site:** `https://digitalgate.com.au`  
**Redirect SoT (runtime):** `src/lib/dg-legacy-urls.ts`  
**Marketing HTML SoT:** `../dg-platform/marketing/pages/` (seeded into Website Studio)  
**Related:** [SEARCH-INDEXING.md](./SEARCH-INDEXING.md), `marketing/pages/REDIRECT-MAP.md` (historical WP notes)

---

## 1. Entity statement

**DigitalGate** is an **AI-powered Business Operating Platform**.

| Layer | Meaning |
|-------|---------|
| **Platform** | Infrastructure — Connect → Centralise → Understand → Automate → Grow |
| **Digital Twin™** | Living business context (customers, opportunities, marketing, website, SEO, AI Visibility, revenue, automation, reviews) |
| **Business Brain™** | Intelligence and recommended action on top of the Twin |
| **Apps** | Capabilities on one shared data model — Core, Infrastructure, Industry, Growth |
| **Professional Services** | Optional implementation layer (websites, SEO, content, ads support, configuration) — **never** the headline product |

**Not DigitalGate (retired positioning):** marketing agency retainers, utility brokering, “CapitalGate brand”, standalone SEO/ads agency menus, Growth Systems retainer SKUs as the product.

Legal contracting entity (ABN / company name) must match Stripe, invoices, and customer agreements — one named operator in terms/privacy; do not invent alternate brand parents on public pages.

---

## 2. Canonical information architecture

```
digitalgate.com.au/
├── /                         Platform story (homepage)
├── /apps/                    Product architecture hub
│   ├── /apps/core/           CRM, Opportunities, Tasks, …
│   ├── /apps/infrastructure/ Website, Domains, DNS, …
│   ├── /apps/industry/       Real Estate, Accommodation, …
│   └── /apps/growth/         AI Visibility, SEO, Automation, …
├── /seo /automation /…       Growth capability landings (indexable)
├── /insights/                Knowledge hub
├── /about/                   Entity / authority
├── /pricing/                 Commercial conversion
├── /contact/ /discover/      Lead capture
├── audit.digitalgate.com.au  Free audit (acquisition)
└── app.digitalgate.com.au    Product (robots Disallow /)
```

**Hierarchy rule:** Platform → Apps → Services. Services never compete with Platform in H1/nav primary positioning.

---

## 3. URL disposition matrix

### KEEP (indexable Gen 2)

| Path | Role |
|------|------|
| `/`, `/pricing`, `/about`, `/contact`, `/discover` | Core commercial |
| `/apps`, `/apps/core|infrastructure|industry|growth/**` | Architecture |
| `/growth`, `/seo`, `/ai-visibility`, **`/automation`**, `/analytics`, `/social`, `/reputation`, `/prospecting`, `/ai-communications` | Growth landings |
| `/insights`, insight articles, foundational series | Content |
| `/business-brain`, framework pages (AI Visibility, Appraisal Magnet, …) | IP / entity |
| `/founding-customers`, legal pages | Programme / legal |

### REWRITE (done / ongoing)

| Path | Action |
|------|--------|
| `/legal-notice` | Platform + Professional Services framing (not agency marketing menu) |
| `/terms-conditions`, `/privacy-policy` | Keep aligned with Platform entity |
| App/Growth landings | Later: Problem → Product → UI → Outcome → CTA (Priority 6) |

### REDIRECT (308 via `dg-legacy-urls.ts`)

| Old | New | Notes |
|-----|-----|-------|
| `/solutions` | `/pricing` | Old agency “solutions” hub |
| `/services`, `/services/*` | `/pricing` | Old agency services tree |
| `/growth-systems`, `/growth-systems/*` | `/pricing` | Legacy retainer category |
| `/strategy-session` | `/contact` | Public consultation → contact |
| `/platform` | `/` | Homepage is platform story |
| `/free-agency-audit`, `/free-digital-audit`, `/business-audit` | audit host | Acquisition |
| `/beta`, `/founding`, `/founding-application` | `/founding-customers` | Programme |
| Old RE marketing URLs | insights / frameworks | See `DG_LEGACY_REDIRECTS` |
| Portal leftovers (`/client-portal`, …) | app login | |

**Critical:** Do **not** put Growth product slugs (`/automation`, `/seo`, …) in `DG_LEGACY_REDIRECTS`. Assertions: `node scripts/test-dg-legacy-urls.mjs`.

### NOINDEX (must exist, not in search)

| Slug | Reason |
|------|--------|
| `card` | Personal digital card |
| `onboarding` | Post-sale ops (marketing path); app onboarding is separate host |
| `business-audit` | Utility / redirected |

Implemented in `DG_NOINDEX_SLUGS` (`src/lib/digitalgate-seo-catalog.ts`).

### DELETE / GONE (410)

WP junk, `/*.php`, `/wp-*`, `/system-pages/*`, `/__static`, etc. — see `resolveDgLegacyRequest` / `isDgJunkRequest`.

---

## 4. Operator checklist (entity / SERP cleanup)

1. **GSC** — Domain property for `digitalgate.com.au`; submit sitemap; request indexing for `/`, `/apps`, `/automation`, `/pricing`; Removals / inspect for stale `/solutions` snippets if cache lingers.
2. **Bing** — Webmaster Tools + sitemap; IndexNow after redirect/content ships.
3. **IndexNow** — after deploy:

```bash
curl -X POST https://app.digitalgate.com.au/api/indexnow \
  -H "Content-Type: application/json" \
  -d '{"host":"digitalgate.com.au","urlList":["https://digitalgate.com.au/","https://digitalgate.com.au/automation/","https://digitalgate.com.au/solutions/","https://digitalgate.com.au/legal-notice/","https://digitalgate.com.au/pricing/"]}'
```

4. **Verify live** — `/automation` → **200** Growth landing; `/solutions` → **308** `/pricing`; `/growth-systems` → **308** `/pricing`.
5. Re-seed marketing after HTML SoT edits:  
   `node --env-file=.env.local scripts/seed-digitalgate-marketing-pages.mjs --publish`

---

## 5. Strategic roadmap

Full developer roadmap (Clarify → Prove → Convert → Expand → Index → Measure), content architecture rule, and OS mirror thesis:

→ **[WEBSITE-STRATEGIC-ROADMAP.md](./WEBSITE-STRATEGIC-ROADMAP.md)**

Priority **1 Consolidate** is this document. Next: **Clarify** (Platform → Core → Industry → Growth unmistakable).

---

## 6. Assertion coverage

| Check | How |
|-------|-----|
| Growth slugs not redirected | `scripts/test-dg-legacy-urls.mjs` |
| Agency hubs redirect | same script |
| `/growth-systems/*` prefix | same script |
