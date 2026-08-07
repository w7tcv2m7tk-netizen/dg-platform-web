# Global Readiness

**Build globally. Sell Australia first.**

Those are two different decisions. Platform 1.0 must not hardcode AU assumptions — even while every early customer is Australian.

**Internal principle:** Every business deserves a single intelligent operating system that connects every digital tool, every customer interaction, and every business insight into one place.

That works for a plumber in Brisbane, a real estate agency in London, or a consultancy in Toronto — without changing the core product.

---

## Decision split

| Decision | Choice |
|----------|--------|
| **Architecture** | International from day one — currencies, locales, tax, time zones, address/phone, regional connectors, payment gateways |
| **Go-to-market** | Australia first — Roe Realty, DigitalGate, AU agencies, AU SMEs, AU partners |
| **Category** | Not “another CRM” — the OS where you **run the business** |

---

## Stack model — Country Packs

Industry Apps must not bake in one country’s portals and tax rules.

```
Core Platform
    ↓
Country Pack          ← regional law, payments, formats, local connectors
    Australia | New Zealand | UK | USA | Canada | …
    ↓
Industry App          ← domain workflows (same app, country-adapted)
    Real Estate | Finance | Accommodation | Services | …
    ↓
Premium / Growth Apps
    AI Visibility | SEO | Voice AI | Automation | …
```

**Rule:** The Real Estate App is one product. Australian RE and US RE are the **same Industry App** + different **Country Pack** (and connector set).

### Australia pack (example)

| Capability | Example |
|------------|---------|
| Listings portals | REA, Domain |
| Address | AU structured address + G-NAF / Google AU |
| Tax | GST |
| Formats | `en-AU`, `Australia/*` TZ, `+61` phones |
| Contracts | AU agency / contract templates |
| Payments | Stripe AU / AUD |

### USA pack (example)

| Capability | Example |
|------------|---------|
| Listings portals | Zillow, MLS feeds |
| Address | USPS-style address |
| Tax | Sales tax (and Stripe Tax later) |
| Formats | `en-US`, US time zones, `+1` phones |
| Workflows | NAR-oriented listing / agency patterns |
| Payments | Stripe US / USD |

Country Packs are **installable / assigned per Organisation** (default from `organisation.country`), not forks of Industry Apps.

---

## Build globally — Platform 1.0 checklist

Architect so nothing needs a rebuild for NZ / UK / US:

| Area | Platform 1.0 expectation |
|------|--------------------------|
| Currencies | Integer cents + ISO 4217 on money objects |
| Languages | Externalised strings; ship `en-AU` first |
| Tax | Org `taxProfile` hook; GST note for AU now |
| Time zones | UTC storage; display in org TZ |
| Date formats | `Intl` via org `locale` |
| Compliance | Privacy Act (AU) patterns; expandable `dataRegion` |
| Addresses | Structured + `country` |
| Phones | E.164 storage |
| AI models | Provider/routing keyed by region later |
| Payments | Stripe (org currency); gateway interface for others |
| Connectors | Manifests declare `countries[]` / Country Pack deps |

### Organisation regional settings

Every Organisation stores:

| Field | Example | Used by |
|-------|---------|---------|
| `locale` | `en-AU`, `en-NZ`, `en-US` | UI strings, date/number format |
| `timezone` | `Australia/Brisbane` | Tasks, bookings, reports, SLA |
| `currency` | `AUD`, `NZD`, `USD` | Invoices, opportunities, dashboards |
| `country` | `AU` | Address validation, tax, **default Country Pack** |
| `taxProfile` | JSON | GST, VAT, sales tax (Phase 2) |
| `countryPackId` | `au`, `nz`, `uk`, `us` | Active regional pack (optional override) |

**Platform 1.0 defaults:** `en-AU`, `Australia/Brisbane`, `AUD`, `AU`.

---

## Currency

| Rule | Detail |
|------|--------|
| Storage | Amounts as **integer cents** + ISO 4217 `currency` field |
| Display | Format via `Intl.NumberFormat(org.locale, { currency })` |
| Conversion | Not automatic — report in org currency; FX table Phase 3+ |
| Stripe | Charge in org billing currency |

Never store floats for money.

---

## Time zones

| Rule | Detail |
|------|--------|
| Storage | UTC in database |
| Display | Convert to org timezone in UI and reports |
| Scheduling | Automations, SLA timers use org timezone |
| API | Accept ISO 8601 with offset; return UTC + org-local in metadata |

---

## Languages (i18n)

| Phase | Scope |
|-------|-------|
| **1.0** | English only; strings externalised (`messages/en-AU.json`) |
| **1.5** | Locale switcher; date/number formatting |
| **2.0** | Additional locales (en-NZ, en-GB, en-US) |
| **3.0** | App manifest `locales[]` for third-party Apps |

**Rule:** Prefer i18n keys over hard-coded user-facing strings in new UI.

---

## Tax systems

| Phase | Scope |
|-------|-------|
| **1.0** | `taxCents` on Invoice; GST note for AU |
| **1.5** | Stripe Tax integration |
| **2.0** | `taxProfile` per org — rate, inclusive/exclusive, registration number |

Tax logic in Platform Core billing — not per App. Country Pack supplies defaults.

---

## Regional compliance

| Region | Consideration |
|--------|---------------|
| AU | Privacy Act, APPs — see [DATA-GOVERNANCE.md](./DATA-GOVERNANCE.md) |
| NZ | Privacy Act 2020 — similar patterns |
| UK / EU | GDPR — data residency, DPA (later stages) |
| US / CA | State / PIPEDA considerations as Country Packs land |

`dataRegion` on Organisation (future): e.g. `ap-southeast-2`, `eu-west-1` for residency.

---

## Address & phone

| Field | Approach |
|-------|----------|
| Address | Structured fields + `country`; validate per Country Pack |
| Phone | E.164 storage; display with country code |
| Postcode | Country-specific validation |

Property object already uses structured address — reuse everywhere.

---

## Sell locally first — GTM

First customers (feedback before expansion):

1. **Roe Realty** — live RE proving ground  
2. **DigitalGate** — dogfood Command Centre + platform  
3. Australian real estate agencies  
4. Australian SMEs  
5. Australian partner businesses  

### Geographic / vertical stages

| Stage | Focus |
|-------|--------|
| **1** | Australia · Real Estate |
| **2** | Australia · Multi-industry |
| **3** | New Zealand |
| **4** | United Kingdom |
| **5** | North America |
| **6** | Europe |

Each stage adds scale **without** forking Core. New stages = Country Pack + connectors + compliance, not a new platform.

---

## Biggest opportunity (category)

DigitalGate is not competing as “another CRM.”

When someone buys DigitalGate they should think:

> **This is where I run my business.**

The OS that connects every digital service a business uses — tools, customer interactions, and insights — in one place.

Brand line remains **The Gateway to Your Digital World™**, reinforced by the operating-system principle above.

---

## Implementation notes (current codebase)

| Already leaning global | Still AU-default / harden |
|------------------------|---------------------------|
| Property `country` / `currency` (often AU/AUD) | Org-level `locale` / `timezone` / `countryPackId` |
| Commerce currency types | Avoid hard-coded `AUD` in overview/intelligence formatters |
| Connectors as first-class | Declare Country Pack / `countries[]` on connector manifests |
| Industry App manifests | Bind REA/Domain (etc.) behind AU pack, not into core RE schema |

**Near-term tickets (when ready):**

1. Organisation regional fields + defaults (`AU`)  
2. Country Pack registry (`au` first) + org assignment  
3. Connector manifests: `countries` / `requiresCountryPack`  
4. RE App: move AU portal assumptions behind AU pack adapters  
5. Money/date formatting always via org locale/currency helpers  

Do **not** block Roe / AU GTM on full multi-country UI — ship AU pack defaults, keep schemas clean.

---

## Related

- [PRODUCT-VISION.md](../PRODUCT-VISION.md) — Gateway brand + OS category  
- [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md) — Organisation fields  
- [APP-MARKETPLACE.md](./APP-MARKETPLACE.md) — install / license  
- [CONNECTOR-SPECIFICATION.md](../connectors/CONNECTOR-SPECIFICATION.md) — connectors  
- [WHITE-LABELLING.md](./WHITE-LABELLING.md) — regional branding  
- [WP-DETACH-BACKLOG.md](../WP-DETACH-BACKLOG.md) — Gen 2 SoT path (AU proving ground first)  
