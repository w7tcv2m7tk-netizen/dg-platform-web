# DigitalGate Website Builder

**Design now. Build later.**

AI-native web presence for DigitalGate organisations — not another generic page builder, and **not** arbitrary PHP on the main platform.

The native builder targets **Next.js Generation 2**. Existing WordPress sites stay on the **WordPress Connector**. Advanced code edits happen only in a **controlled sandbox**.

**Do not implement this product surface yet.** Immediate execution remains Core → CRM → Connectors → Real Estate beta. Architect so Business Profile, SEO/AI Visibility context, Forms → CRM, Domains/Hosting, and Country Packs can support Website Builder without a rebuild.

See [PRODUCT-VISION.md](../PRODUCT-VISION.md), [ROADMAP.md](../ROADMAP.md), [GLOBAL-READINESS.md](./GLOBAL-READINESS.md), [NETWORK-LAYER.md](./NETWORK-LAYER.md), [BUSINESS-PROFILE.md](./BUSINESS-PROFILE.md), [websites/WEBSITES-ARCHITECTURE.md](../websites/WEBSITES-ARCHITECTURE.md), [ADR 0001](../adr/0001-generation-2-nextjs-platform.md), [ADR 0002](../adr/0002-wordpress-as-connector.md).

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

Primary product surface for create → edit → publish. Natural-language and structured editing share the **same model**.

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

For power users and edge cases: HTML · CSS · JS · React · Next.js · API · schema · custom blocks — only inside a **controlled sandbox**.

| Rule | Detail |
|------|--------|
| **Native builder runtime** | **Next.js Gen 2** — structured model + renderer |
| **No arbitrary AI PHP on main platform** | Gen 2 is not WordPress; do not generate PHP into Platform Core |
| **WordPress sites** | Via **WordPress Connector** (health, content sync, forms) — see ADR 0002 |
| **AI Developer** | NL → code/schema diff → preview → **human review** → deploy |
| **Sandbox** | Isolated preview/deploy; no unrestricted write into tenant data or core |

Sandbox may emit custom components that still register against the schema system where possible, so Studio and SEO tooling remain coherent.

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

Do not hardcode AU-only component IDs or tax copy into the renderer core.

---

## Design-now requirements (no product UI yet)

| Concept | Why it matters later |
|---------|----------------------|
| **Business Profile completeness** | Source of truth for generation |
| **Document / site config objects** | Persist structured site model (see catalogues) |
| **Forms → Contact/Lead** | Conversion path into CRM |
| **SEO + AI Visibility fields** | Planner/generator context |
| **Infrastructure hooks** | Domains, SSL, deploy |
| **WP Connector boundary** | Existing sites ≠ native builder |
| **Country Pack hooks** | Locality, compliance, template packs |
| **AI governance** | Draft-by-default, review for code deploy ([AI-GOVERNANCE.md](./AI-GOVERNANCE.md)) |

### Suggested future objects (document only)

- `Website` / `WebsiteVersion` (org-scoped site + published revision)  
- `WebsitePage` (slug, intent, composition)  
- `ComponentInstance` (type + typed props)  
- `WebsiteTheme` (tokens from brand)  
- `WebsiteForm` (definition → CRM mapping)  
- `WebsiteDomain` / deploy records  

Prefer Profile + optional JSON site draft over premature tables until Core / RE beta priorities clear.

---

## Explicit non-goals (now)

- ❌ Shipping Website Studio UI before Core / CRM / Connectors / RE beta maturity  
- ❌ Arbitrary PHP generation on Gen 2 Platform Core  
- ❌ Treating WordPress theme PHP as the native builder  
- ❌ Raw HTML as the source of truth for native sites  
- ❌ Replacing the WP Connector for customers who stay on WordPress  

---

## Roadmap placement

| When | What |
|------|------|
| **Now** | Architecture in this doc; keep Profile / Forms / Connectors / SEO context compatible |
| **After Core + CRM + Connectors + RE beta** | Website Studio v0 — Profile → structured model → preview |
| **Later** | Full Studio nav, schema library depth, Hosting/Domains polish |
| **Later+** | AI Developer sandbox, Funnel Builder, proactive Website Health |

Immediate priority remains:

```
Core → CRM → Connectors → AI → Industry Apps (RE beta) → Intelligence
→ then Website Builder (native Next.js Gen 2)
```

Operational module notes and phased tickets: [websites/WEBSITES-ARCHITECTURE.md](../websites/WEBSITES-ARCHITECTURE.md).

---

## Related

- [PRODUCT-VISION.md](../PRODUCT-VISION.md) — Websites as Growth / digital presence  
- [ROADMAP.md](../ROADMAP.md) — execution filter; Phase later  
- [NETWORK-LAYER.md](./NETWORK-LAYER.md) — same design-now / build-later posture  
- [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) — trust content feeds Testimonials  
- [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) — Country Packs + AU GTM  
- [BUSINESS-PROFILE.md](./BUSINESS-PROFILE.md) — generation source  
- [websites/WEBSITES-ARCHITECTURE.md](../websites/WEBSITES-ARCHITECTURE.md) — Studio / Health / Content / Funnels modules  
- [adr/0001-generation-2-nextjs-platform.md](../adr/0001-generation-2-nextjs-platform.md)  
- [adr/0002-wordpress-as-connector.md](../adr/0002-wordpress-as-connector.md)  
