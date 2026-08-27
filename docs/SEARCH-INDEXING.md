# DigitalGate Search Indexing & AI Discoverability

**Status:** Gen 2 implementation (August 2026)  
**Canonical marketing site:** `https://digitalgate.com.au`  
**Platform app (not indexed):** `https://app.digitalgate.com.au`

---

## 1. Search Indexing Audit — Current State

| Area | Status | Implementation |
|------|--------|----------------|
| Canonical HTTPS apex | ✅ | Middleware: www→apex, trailing-slash 308, HTTPS |
| Vercel preview noindex | ✅ | `*.vercel.app` → `X-Robots-Tag: noindex, nofollow` |
| robots.txt | ✅ | Host-aware `/sites/seo/robots` + platform `app/robots.ts` |
| sitemap.xml | ✅ | DB-driven from published Studio pages |
| Canonical tags | ✅ | `generateMetadata()` via `publicPageMetadata()` |
| OG / Twitter | ✅ | All public pages via Next Metadata |
| Organization schema | ✅ | Homepage + runtime JSON-LD |
| Article schema | ✅ | Insights + foundational articles at runtime |
| BreadcrumbList | ✅ | Growth, Insights, Intelligence pages |
| SoftwareApplication | ✅ | Growth product pages (/seo, /ai-visibility, …) |
| IndexNow | ✅ | `POST /api/indexnow` + key file on apex |
| GSC / Bing verification | 🔶 | Env meta tags — operator must set tokens |
| Indexing health check | ✅ | Website Health Centre → Search indexing |

**Search ecosystems**

| Engine | Upstream source | Action |
|--------|-----------------|--------|
| Google | Google crawl + GSC | Domain property + sitemap submit |
| Bing | Bing crawl + IndexNow | Webmaster Tools + sitemap |
| DuckDuckGo | Bing index | Bing setup is sufficient |
| Yahoo | Bing index | Bing setup is sufficient |
| Brave | Independent + Bing | Sitemap + quality signals |
| Ecosia | Bing index | Bing setup is sufficient |

Do not manually submit to downstream indexes that consume Bing/Google.

---

## 2. Robots Policy

### Marketing apex (`digitalgate.com.au`)

- **Allow:** all public marketing pages
- **Allow AI crawlers:** GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc. (public educational content)
- **Disallow:** legacy WP paths, `/card`, `/onboarding`, platform routes
- **Sitemap:** `https://digitalgate.com.au/sitemap.xml`

### Platform app (`app.digitalgate.com.au`, `*.vercel.app`)

- **Disallow:** entire site (`app/robots.ts` + Vercel noindex header)

### Never indexed

- Dashboards, `/apps/*`, `/api/*`, `/command/*`, auth routes
- Invite tokens, preview (`?preview=1` is draft-only)
- Funnel capture pages (`business-audit`, `property-report`)
- Utility: `/card`, retired `/onboarding`

---

## 3. Sitemap Architecture

- **URL:** `https://digitalgate.com.au/sitemap.xml`
- **Source:** published `WebsitePage` rows for site slug `digitalgate`
- **Excluded:** draft, archived, redirect intent, `noindex` pages, funnels
- **Priority:** home 1.0 · pricing/founding 0.9 · growth/insights 0.8 · legal 0.3
- **Updates:** automatic on publish — re-seed or Studio publish updates DB → next sitemap request reflects changes

Future: sitemap index if page count exceeds ~500 URLs.

---

## 4. Google Search Console Setup

1. Add **Domain property** for `digitalgate.com.au` (DNS TXT verification)
2. Set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in Vercel → redeploy
3. Submit sitemap: `https://digitalgate.com.au/sitemap.xml`
4. Monitor: Coverage, Core Web Vitals, Enhancements (structured data)
5. **Do not** manually request indexing for every Insight — rely on sitemap + internal links

---

## 5. Bing Webmaster Tools

1. Verify domain (DNS or meta via `NEXT_PUBLIC_BING_SITE_VERIFICATION`)
2. Submit same sitemap URL
3. Enable IndexNow (see §6)

---

## 6. IndexNow

```bash
# Generate key once
uuidgen | tr '[:upper:]' '[:lower:]'

# Vercel env
INDEXNOW_KEY=<uuid>
INDEXNOW_HOST=digitalgate.com.au

# Key file (auto-served): https://digitalgate.com.au/<INDEXNOW_KEY>.txt

# Submit after publishing
curl -X POST https://app.digitalgate.com.au/api/indexnow \
  -H "X-API-Key: $DG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://digitalgate.com.au/new-insight-slug/"]}'
```

---

## 7. Structured Data Summary

| Page type | Schema |
|-----------|--------|
| Homepage | Organization, WebSite |
| Insights | Article, BreadcrumbList |
| Growth products | SoftwareApplication, BreadcrumbList |
| Intelligence frameworks | BreadcrumbList |
| All non-home | BreadcrumbList where applicable |

Validate: [Google Rich Results Test](https://search.google.com/test/rich-results)

---

## 8. AI Crawler Policy

**Permit** public marketing + Insights for major AI crawlers (listed in `robots/route.ts`).

**Rationale:** DigitalGate's strategy requires AI systems to understand public educational and product content.

**Block:** all authenticated platform routes, customer data, API endpoints.

---

## 9. Internal Linking / Topic Graph

Primary discovery = internal links (header/footer chrome + editorial blocks).

```
DigitalGate (/)
  → Core narrative (homepage anchors)
  → Industry (homepage #industries)
  → Growth hub (/growth) → /seo, /ai-visibility, …
  → Intelligence (/business-brain) → frameworks
  → Insights (/insights) → individual articles
  → Pricing (/pricing) · Founding (/founding-customers)
```

Cross-links built in: insights `build.mjs`, growth `catalog.mjs`, homepage chrome.

---

## 10. Indexability Rules

| Index | Noindex |
|-------|---------|
| Homepage, pricing, about, contact | `/card`, `/onboarding` |
| Growth, Intelligence, Insights | Funnels, invite pages |
| Founding, discover, strategy-session | Preview/draft |
| Legal (low priority, indexed) | Platform app entirely |

---

## 11. Automated Publishing Workflow

When publishing a new Insight:

1. Add to `marketing/pages/insights/articles.mjs`
2. Run `node build.mjs` in insights folder
3. `node scripts/seed-digitalgate-marketing-pages.mjs --publish`
4. Sitemap + metadata + Article schema update automatically
5. Optional: `POST /api/indexnow` with canonical URL
6. Monitor GSC/Bing after 3–7 days

---

## 12. Monitoring Dashboard

| Source | Metrics |
|--------|---------|
| Google Search Console | Impressions, clicks, coverage, CWV |
| Bing Webmaster | Index status, crawl errors |
| Website Health (Studio) | SEO title/desc coverage, indexing ready |
| SEO App (operator) | Presence audit — title, meta, OG, JSON-LD |

AI visibility (brand mentions, citation accuracy) — monitor manually until measurable tooling exists.

---

## 13. External Authority (document only)

Legitimate channels: Australian business/tech publications, software directories, partner sites, founder LinkedIn, podcasts, industry associations.

**Do not:** buy links, spam directories, fake citations.

---

## 14. Google Business Profile

Keep name, category, website URL, and description aligned with `digitalgate.com.au` and Organization schema.

---

## Key Files

```
src/lib/public-website-seo.ts      — metadata + JSON-LD builders
src/lib/digitalgate-seo-catalog.ts — page taxonomy, breadcrumbs, index rules
src/app/sites/by-host/page.tsx     — runtime metadata + schema injection
src/app/sites/seo/robots/route.ts
src/app/sites/seo/sitemap/route.ts
src/app/robots.ts                    — platform app disallow
src/lib/indexnow.ts
src/middleware.ts                    — canonical, noindex, IndexNow key
scripts/seed-digitalgate-marketing-pages.mjs — SEO metadata persistence
```
