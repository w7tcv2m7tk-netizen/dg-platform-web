# DigitalGate Website Builder

**Design now. Build MVP.**

AI-native web presence for DigitalGate organisations — not another generic page builder, and **not** arbitrary PHP on the main platform.

The native builder targets **Next.js Generation 2**. Existing WordPress sites stay on the **WordPress Connector** until migrated. Advanced code edits happen only in a **controlled sandbox** (later).

**Status:** **Closed beta ready** — see [WEBSITES-BETA-LAUNCH.md](../WEBSITES-BETA-LAUNCH.md).  

**MVP vertical slice (shipped):** Website as first-class asset → AI structured generate → Studio basics → `/sites/[slug]` renderer → Forms → CRM → WP content import v0 → Domains go-live. Feature flag: `websites.builder` (soft-on when unset; Enable Websites beta sets true).

See [PRODUCT-VISION.md](../PRODUCT-VISION.md), [ROADMAP.md](../ROADMAP.md), [GLOBAL-READINESS.md](./GLOBAL-READINESS.md), [INFRASTRUCTURE.md](./INFRASTRUCTURE.md), [NETWORK-LAYER.md](./NETWORK-LAYER.md), [BUSINESS-PROFILE.md](./BUSINESS-PROFILE.md), [websites/WEBSITES-ARCHITECTURE.md](../websites/WEBSITES-ARCHITECTURE.md), [ADR 0001](../adr/0001-generation-2-nextjs-platform.md), [ADR 0002](../adr/0002-wordpress-as-connector.md).

---

## Product framing

**Not** “AI that writes HTML.”

**=** an **AI-native website platform** that understands the business and can create, manage, optimise, and evolve its digital presence.

More than “another website builder”: Buy Domain → Create Website → AI builds → **DG Hosting** → **DG DNS** → auto SSL → connected to **Business Profile** → **CRM + Forms + Analytics + SEO + AI Visibility**.

### Flywheel

```
Business Profile → AI → Website → CRM → Marketing → Automation → Intelligence → Growth
```

Website Builder sits in that loop as the digital-presence surface; Intelligence and Growth Apps close the feedback cycle. Vision and pillar placement: [PRODUCT-VISION.md](../PRODUCT-VISION.md). Execution filter: [ROADMAP.md](../ROADMAP.md).

---

## Architectural decision

| Layer | Role |
|-------|------|
| **Website Builder** | Growth / Platform **App** (Studio surfaces, generative UX, publish tooling) |
| **Website** | **First-class DigitalGate asset** — not merely an App artifact |

### Asset hierarchy (target)

```
Organisation
  └── Business Profile
        └── Websites[]
              ├── Domain
              ├── Pages
              ├── Components
              ├── Forms
              ├── SEO
              ├── Analytics
              ├── AI Visibility
              └── Integrations
```

**AI Service** is the intelligence layer across the website lifecycle (plan → generate → edit → optimise → evolve) — same AI Service posture as the rest of the platform ([PRODUCT-VISION.md](../PRODUCT-VISION.md)).

Design Core / Profile / catalogues so `Website` can hang under Organisation → Business Profile later without a rebuild. Suggested objects remain design-only until after Core / RE beta (see Design-now requirements below).

---

## Key principle

AI generates a **structured website model** DigitalGate understands — pages, typed components, brand tokens, SEO metadata, forms — **not a pile of HTML**.

The renderer and Studio operate on that model. Raw markup is an output (or sandbox escape hatch), never the source of truth for the native builder.

---

## Pipeline

```
Business Profile
  → AI Website Planner
  → Brand + Content + SEO context
  → AI Site Generator
  → Structured Page / Component System
  → Website Renderer
  → Published Website
```

| Stage | Role |
|-------|------|
| **Business Profile** | Canonical identity, services, brand, locations, voice |
| **AI Website Planner** | Site map, page intents, IA, conversion goals |
| **Brand + Content + SEO context** | Colours, logo, copy brief, FAQs, reviews, AI Visibility, locality |
| **AI Site Generator** | Emits structured page/component model + metadata |
| **Structured system** | Typed pages & components DigitalGate can validate and edit |
| **Website Renderer** | Next.js Gen 2 render of the model (preview + publish) |
| **Published Website** | Domains, hosting, CDN via Infrastructure / Hosting |

---

## 1. Business Profile as source

Website generation **reads** Organisation Business Profile (and related signals) — it does not re-ask for business identity in isolation. See [BUSINESS-PROFILE.md](./BUSINESS-PROFILE.md).

| Input | Use in planner / generator |
|-------|----------------------------|
| Name / trading name | Brand, titles, schema.org |
| Industry | Templates, IA, component defaults |
| Services | Services grid, service pages, CTAs |
| Locations | Suburb / area pages, local SEO, NAP |
| Contact | Header/footer, forms, click-to-call |
| Brand · logo · colours | Design tokens, theme |
| Social | Footer, schema, share |
| Description · brand voice | About, homepage narrative |
| Target customers | Messaging, offers, AI rewrite |
| Reviews | Trust / testimonials blocks |
| FAQs | FAQ sections + FAQ schema |
| SEO fields | Titles, descriptions, keywords |
| AI Visibility | Answer-engine friendly copy & structure |
| **User brief** | Natural-language intent (“premium Currumbin agency…”) |

Optional enrichment (when Apps/connectors exist): Twin health, connected GBP, live review feeds — never block generation on them.

---

## 2. AI Website Studio (major App)

Primary product surface for create → edit → publish. Natural-language and structured editing share the **same model**. Studio spans three capability levels (see §9); most users stay on AI Website.

### Nav (target)

| Area | Purpose |
|------|---------|
| **Pages** | Site map, page editor, draft/publish |
| **Design** | Theme tokens, layouts, global styles |
| **Content** | Copy, media, FAQs, trust content |
| **SEO** | Metadata, schema, locality pages |
| **AI** | Planner, generator, rewrite, visibility |
| **Forms** | Form definitions → Contact / Lead / CRM |
| **Domains** | Custom domains, DNS guidance |
| **Hosting** | Deploy, SSL, CDN, environments |
| **Analytics** | Traffic, conversions, funnel (Growth-aligned) |

### Natural-language edits (examples)

- “Create homepage”
- “Make it more premium”
- “Add a services page”
- “Target Currumbin and the southern Gold Coast”
- “Change the primary CTA to Book an appraisal”
- “Rewrite for AI visibility”

Studio translates NL → **model patches** (add page, retune props, swap variant, update SEO) — not opaque HTML dumps. Preview before publish; drafts by default (same rule as [WEBSITES-ARCHITECTURE.md](../websites/WEBSITES-ARCHITECTURE.md)).

---

## 3. Component / schema system (not raw code first)

Pages are compositions of **typed components** with validated props.

### Illustrative page composition

```
Page
  ├── Hero
  ├── Trust
  ├── Services Grid
  ├── About
  ├── Testimonials
  ├── CTA
  └── Footer
```

Each component has a schema (props, variants, responsive rules). AI and humans edit props and composition; the renderer maps schema → UI.

### Why schema-first

| Benefit | Why it matters |
|---------|----------------|
| **Consistency** | Brand and layout rules across orgs/industries |
| **Security** | No arbitrary script injection as the default path |
| **Performance** | Known component tree → predictable bundles / CWV |
| **Versioning** | Migrate component versions without rewriting sites |
| **Editing** | Studio and NL map cleanly to props |
| **Responsive** | Breakpoints owned by components, not ad-hoc CSS |
| **AI manipulation** | Models can propose structured diffs DigitalGate validates |
| **Global changes** | Theme / component upgrades roll out platform-wide |

Industry and Country Pack templates specialise **which** components and defaults appear — not a fork of the renderer.

---

## 4. Advanced Code / AI Developer layer

For power users and edge cases: HTML · CSS · JS · React · Next.js · API · schema · custom blocks — only inside a **controlled sandbox**. This is the foundation for **Developer Studio** (§9).

| Rule | Detail |
|------|--------|
| **Native builder runtime** | **Next.js Gen 2** — structured model + renderer |
| **No arbitrary AI PHP on main platform** | Gen 2 is not WordPress; do not generate PHP into Platform Core |
| **WordPress sites** | Via **WordPress Connector** (health, content sync, forms) — see ADR 0002 |
| **AI Developer** | NL → code/schema diff → preview → **human review** → deploy |
| **Sandbox** | Isolated preview/deploy; no unrestricted write into tenant data or core |

Sandbox may emit custom components that still register against the schema system where possible, so Studio and SEO tooling remain coherent.

---

## 5. DigitalGate hosting

The end-to-end path is owned by DigitalGate — not “export HTML to a third-party host.”

**Hosting, DNS, and SSL come from the Infrastructure Core layer** — not from Website Builder itself. Website Builder publishes a structured site; Infrastructure makes it live (domain connect, DNS, auto SSL, hosting abstraction). See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md).

```
Buy Domain
  → Create Website
  → AI builds (structured model)
  → DG Hosting          ← Infrastructure (Vercel/CF adapter)
  → DG DNS              ← Infrastructure (Dreamscape → Cloudflare)
  → auto SSL            ← Infrastructure (invisible)
  → connected to Business Profile
  → CRM + Forms + Analytics + SEO + AI Visibility
```

| Concern | Design-now expectation |
|---------|------------------------|
| **Domains** | Purchase / attach via Infrastructure (Dreamscape reseller); Website asset owns the binding |
| **Hosting** | Infrastructure-managed deploy of Next.js Gen 2 renderer output |
| **DNS** | Infrastructure DNS so SSL and publish are automatic |
| **SSL** | Auto-provisioned on connect — no manual cert workflow for default path |
| **Profile link** | Published site stays wired to Business Profile (identity, NAP, brand) |
| **Connected stack** | Forms, CRM, Analytics, SEO App, AI Visibility App as first-class integrations on the Website asset |

This is what makes Website Builder a **platform surface**, not a standalone CMS clone. **Domains** ship as a real Infrastructure product surface (shared under `/apps/websites/domains` and `/apps/infrastructure/domains`). Hosting status and Make it live checklist are live for dogfood; deeper DG Hosting productization (CDN controls, staging slots) continues on the Infrastructure track.

---

## 6. Generative flow UX

Target happy path for most users (**AI Website** level):

```
“I want a website”
  → Business Profile already known
  → Recommend N-page site around growth objective
  → Generate Website
  → Full page set
  → Visual or NL edit
  → Publish (draft-by-default)
```

### Full page set (illustrative)

Home · About · Services · Service pages · Locations · Contact · FAQs · Nav · CTAs · Forms · SEO · Schema · Sitemap · AI-readable content

Planner chooses **N** and IA from Profile + growth objective (leads, bookings, appraisals, quotes — industry-aware). Generator emits the structured model for that set in one pass; Studio then supports visual or natural-language edit on the same model (§2, §9).

Do not require users to assemble pages from a blank canvas before they have a coherent site.

---

## 7. Connected business interface

A Website is a **connected interface** into the DigitalGate ecosystem — not a brochure silo.

| Path | Flow (target) |
|------|----------------|
| **Conversion** | Forms → Contact → Lead → CRM → Automation → AI qualification → Notification → Pipeline |
| **Measurement** | Analytics → BI → Dashboard |
| **Discoverability** | SEO App / SEO Score™ · AI Visibility App / Score™ |
| **Trust** | Reviews (testimonials, schema, request flows) |
| **Commerce** | Payments |
| **Scheduling** | Bookings / Calendar / Industry Apps |

Wire definitions at the **Website asset** and Form mapping layers so Core / CRM / Connectors work already underway stays forward-compatible. Reviews feed: [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md). Growth Apps placement: [PRODUCT-VISION.md](../PRODUCT-VISION.md).

---

## 8. Industry App–generated sites

Industry Apps can **generate and specialise** sites (schema + templates), not only consume a generic builder.

| Industry | Example site outcomes |
|----------|----------------------|
| **Real Estate** | Vendor appraisal sites; forms; suburb pages; funnels from vendors / buyers / properties |
| **Accommodation** | Booking sites with availability, payments, guests |
| **Services** | Quote / booking / lead sites |

Schema and templates are **per Industry App** (and Country Pack–aware — [GLOBAL-READINESS.md](./GLOBAL-READINESS.md)): which pages, components, forms, and CRM object mappings appear by default. Renderer and Studio stay shared; Apps own vertical specialisation.

Architect Industry App contracts so generated sites still land as first-class `Website` assets under Business Profile.

---

## 9. Three levels

| Level | Who | What |
|-------|-----|------|
| **1. AI Website** | Most users | Generate → Edit → Publish |
| **2. Visual Studio** | Operators who want layout control | Drag / drop + AI on the same structured model |
| **3. Developer Studio** | Agencies / developers | Code · Components · API · Database · Custom Functions (sandbox — §4) |

Progressive disclosure: start at level 1; unlock 2/3 without forking the site model. Level 3 never becomes arbitrary PHP on Platform Core.

---

## Country Packs & AU GTM

**Sell Australia first; keep the builder Country Pack–ready** ([GLOBAL-READINESS.md](./GLOBAL-READINESS.md)).

| Concern | Design-now expectation |
|---------|------------------------|
| Locale / copy | `en-AU` first; externalised strings |
| Address / NAP | Structured address + country |
| Local SEO | Suburb/area pages driven by Profile locations |
| Compliance | Privacy / cookie patterns expandable by Country Pack |
| Payments / forms | Stripe and CRM paths already Country Pack–aware |
| Templates | AU real-estate / services packs first; NZ/UK/US via packs later |

Do not hardcode AU-only component IDs or tax copy into the renderer core. Same posture as Network: design globally, ship AU first ([NETWORK-LAYER.md](./NETWORK-LAYER.md)).

---

## Migration from WordPress

**Yes — WordPress sites can migrate to the native DigitalGate builder once it exists.**

Existing WP sites remain on the **WordPress Connector** (health, content sync, forms) until cutover. Migration is **not** “export theme PHP into Gen 2.” Content and IA land in the **structured page/component model**; the Next.js renderer becomes source of truth.

### Phases

| Phase | What happens |
|-------|----------------|
| **1. Native builder ready** | Org can create / publish Gen 2 sites from Business Profile (this MVP). WP sites keep running on Connector. |
| **2. Import (WordPress Connector)** | Connector pulls pages/posts/media/menus → map into typed components + `WebsitePage` rows. Gaps become draft components or TODO blocks — never opaque HTML as SoT. |
| **3. Dual-run** | WP remains live; Gen 2 site on `/sites/[slug]` (then custom domain staging). Forms dual-write or Gen 2-only → CRM. Compare SEO, forms, CWV. |
| **4. DNS cutover** | Point domain to **DG Hosting / DG DNS**; auto SSL. WP becomes archive or read-only mirror. |
| **5. Decommission** | Optional: retire WP hosting; Connector health optional. |

### Explicitly later

- Theme / Elementor / Divi pixel-perfect recreation  
- Menus, widgets, WooCommerce, shortcode runtime parity  
- Automated media re-host to DG CDN at scale

Studio **Import from WordPress** (v0) pulls real pages via Connector `GET /site/content` (DG Platform plugin **10.70+**) or public WP REST fallback (`/wp/v2/pages`). HTML is flattened into Studio blocks (heading, paragraph, image, list, CTA, html). **Not** a theme/Elementor/pixel clone — review drafts in Studio after import. Media URLs are hotlinked in v0.

---

## MVP routes (shipped)

| Route | Purpose |
|-------|---------|
| `/apps/websites` | List sites · create from Business Profile + brief |
| `/apps/websites/studio/[id]` | Pages list · edit component props · NL assist |
| `/apps/websites` | Hub — site cards, create flow, Studio / Preview / Domains / Hosting links |
| `/apps/websites/domains` | DigitalGate Domains (shared with Infrastructure) |
| `/apps/websites/hosting` | Hosting status — published sites, linked domains, DNS/SSL summary |
| `/apps/websites/funnels` | Funnel Builder v0 — landing → form → CRM |
| `/apps/websites/studio/[id]` | Studio — NL assist, field editors, publish/unpublish, **Make it live**, page reorder/duplicate |
| `/sites/[slug]` | Public (or `?preview=1` draft) renderer |
| `/sites/[slug]/[pageSlug]` | Inner pages |
| `/sites/by-host` | Custom hostname entry (middleware rewrite) |
| `POST /api/v1/websites` | Create site or `{ kind: "funnel", funnelTemplate }` |
| `POST /api/v1/websites/[id]/pages` | Create / duplicate page |
| `PATCH /api/v1/websites/[id]/pages` | Reorder pages (`pageIds`) |
| `POST /api/v1/websites/public/[slug]/form` | Contact form → Contact + Lead |
| `POST /api/v1/infrastructure/go-live` | Connect domain → DNS → publish checklist |
| `POST /api/v1/websites/[id]/import-wordpress` | Import WP pages into Gen 2 site (replaces pages; draft) |

### Schema

- `Website` — org-scoped site, slug, theme JSON, status, brief, metadata  
- `WebsitePage` — slug, intent, `components` JSON (typed `{ id, type, props }[]`)  
- `InfrastructureDomain` — custom hostname inventory (linked to Website)  
- `DreamscapeCustomerLink` — Org ↔ provider contact/customer  

### Make it live

1. Publish or keep draft in Studio.  
2. Connect/register domain (Infrastructure Domains; `.au` needs ABN on Business Profile).  
3. Studio → **Make it live**: checklist (Domain / DNS / SSL / Published), bind domain, apply hosting DNS, optional Vercel attach, publish.  
4. Point DNS at `DG_WEBSITE_DNS_CNAME_TARGET` (default `cname.vercel-dns.com`).  
5. Custom host hits middleware → `/sites/by-host` → site renderer.  

Paid **register** requires org flag `infra.domain_register` + typed confirm (+ `confirmProduction` on live SOAP). See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md).

---

## Next after MVP

Shipped in post-MVP depth pass:

- Studio **SEO** tab (site + page title/description/OG; safe slug edits) → public `/sites/[slug]` meta  
- Industry starter packs (RE / Accommodation / generic) from Business Profile + create picker  
- **Content** overview (pages/components per site → Studio)  
- Native **Health** checklist (published, domain, DNS, SSL, form→CRM, SEO, last updated)  
- **Import from WordPress v0** — Connector `/site/content` or WP REST → Studio blocks (not theme clone)

Shipped in Funnel / Studio polish pass:

- **Funnel Builder v0** — landing templates (lead capture / appraisal / booking) → form → CRM (`website_funnel`)  
- Studio page list: reorder ↑↓, duplicate page, deep links `?tab=` / `?page=`  
- NL assist: heuristic-first reliability + “rewrite for AI visibility”  
- Publish / preview UX: Open live, custom domain link from Make it live + Studio  
- Health / Content actions: Fix SEO gaps, jump to Studio fields  

Still later:

- Domains / DG DNS / hosting / SSL productization polish (Infrastructure)  
- Visual drag-drop Studio (level 2)  
- Developer Studio sandbox (level 3)  
- Richer WP import (menus, media re-host, builder parity) — phases 3–5 above  

- Deeper SEO / AI Visibility Apps on publish  
- Multi-step funnel sequences / email follow-ups  

---

## Persistence (MVP shipped)

| Object | Status |
|--------|--------|
| `Website` | ✅ Prisma — org-scoped site + theme/seo/metadata |
| `WebsitePage` | ✅ Prisma — components JSON (typed tree) |
| `WebsiteVersion` | Later — published revision snapshots |
| `InfrastructureDomain` / hosting bindings | ✅ Prisma + go-live APIs |
| Forms → Contact/Lead | ✅ Public form API |

Theme tokens come from Business Profile at generate time. Draft-by-default; publish sets `status=published`.

### Still design-forward

| Concept | Why it matters later |
|---------|----------------------|
| **SEO + AI Visibility Score™ Apps** | Deeper wiring on publish |
| **DG DNS / Hosting / SSL product UI** | Infrastructure Core ([INFRASTRUCTURE.md](./INFRASTRUCTURE.md)) |
| **Visual + Developer Studio** | Levels 2–3 |
| **Richer WP importer** | Menus, media CDN, builder parity |
| **Industry App site contracts** | RE / Acc template packs |

---

## Explicit non-goals (now)

- ❌ Arbitrary PHP generation on Gen 2 Platform Core  
- ❌ Treating WordPress theme PHP as the native builder  
- ❌ Raw HTML as the source of truth for native sites  
- ❌ Replacing the WP Connector for customers who stay on WordPress  
- ❌ Full DG Hosting productization (CDN controls, staging) — Domains + go-live checklist are live  
- ❌ Visual drag-drop Studio / Developer sandbox this sprint  
- ❌ Theme/Elementor pixel clone or full media CDN remaps (content importer v0 shipped)  

---

## Roadmap placement

| When | What |
|------|------|
| **Now (pilot)** | Website Studio MVP, Funnel Builder v0, Content overview, Gen 2 Health, Domains go-live |
| **Later** | Visual Studio, schema library depth, DG Hosting productization polish |
| **Later** | **AI Brand Studio** entry (optional) — Core capability; have brand / create with AI / later — [BRAND-STUDIO.md](./BRAND-STUDIO.md) |
| **Later+** | Developer Studio sandbox, deeper Industry App site contracts, richer WP import, multi-step email funnels |

Operational module notes: [websites/WEBSITES-ARCHITECTURE.md](../websites/WEBSITES-ARCHITECTURE.md). Phase placement: [ROADMAP.md](../ROADMAP.md).

---

## Related

- [PRODUCT-VISION.md](../PRODUCT-VISION.md) — Growth Apps, AI Service, digital presence flywheel  
- [ROADMAP.md](../ROADMAP.md) — execution filter; Phase later  
- [NETWORK-LAYER.md](./NETWORK-LAYER.md) — same design-now / build-later posture  
- [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) — trust content feeds Testimonials  
- [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) — Country Packs + AU GTM  
- [BUSINESS-PROFILE.md](./BUSINESS-PROFILE.md) — generation source; parent of Website assets  
- [BRAND-STUDIO.md](./BRAND-STUDIO.md) — AI Brand Studio (Core); optional entry from Website create  
- [websites/WEBSITES-ARCHITECTURE.md](../websites/WEBSITES-ARCHITECTURE.md) — Studio / Health / Content / Funnels modules  
- [adr/0001-generation-2-nextjs-platform.md](../adr/0001-generation-2-nextjs-platform.md)  
- [adr/0002-wordpress-as-connector.md](../adr/0002-wordpress-as-connector.md)  
