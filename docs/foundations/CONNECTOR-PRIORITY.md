# Connector / API Priority Stack

**Status:** Architecture locked · August 2026  
**Canonical for:** which connectors we build, in what order, and what we refuse to chase  
**Parent:** [CONNECTOR-ENGINE.md](./CONNECTOR-ENGINE.md)  
**Operational summary:** [../connectors/CONNECTOR-SPECIFICATION.md](../connectors/CONNECTOR-SPECIFICATION.md)  
**Gen 2 north-star (§3 Universal Connector):** [../architecture/GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md) — detail lives here; brief does not re-list DG15

---

## Principle

**APIs are not the product.** DigitalGate is the intelligent layer.

Connectors feed facts into Universal Objects. AI, scoring, automation, Command Centre, and BI create the value. Do **not** ship fifty disconnected “integrations.” Ship a **Connector Layer** that plugs into Platform Core.

```
DIGITALGATE
    │
PLATFORM CORE
    │
CONNECTOR LAYER
    ├── Business   (identity, registries, presence, infra)
    ├── Growth     (ads, social, reviews, communications, AI providers)
    └── Industry   (RE portals, property intelligence, vertical PMS/OTAs)
    │
UNIVERSAL OBJECTS
    │
AI SERVICE  (Model Router → providers)
    │
SCORING
    │
AUTOMATION
    │
COMMAND CENTRE
    │
BUSINESS INTELLIGENCE
```

Aligns with: Connector Framework · Reputation (Growth App + Core Universal Review) · Business Services / Setup · [AI Architecture / Model Router](../ai/AI-ARCHITECTURE.md).

---

## Anti-priorities (do not get distracted)

| Distraction | Why wrong |
|-------------|-----------|
| Building 50 one-off integrations | No shared framework → unmaintainable; Twin/scoring never compound |
| “Google Reviews App” / “ASIC App” / “Xero App” | Capabilities + connectors, not SKU-per-vendor |
| Building a payment processor or crypto chain | Stripe Commerce + provider (e.g. Coinbase Commerce) — own UX, not rails |
| Hard-coding LLM providers in Apps | **Model Router** only: DigitalGate → Model Router → Provider |
| Hard-coding email/SMS/voice vendors in product logic | **AI Communications Core** — provider-neutral |
| Chasing Tier 6–10 before DigitalGate 15 / immediate programme | Sequencing > completeness |
| Inventing `enabled: true` for unbuilt connectors | Honest status only (live / scaffold / stub / planned) |

**Feature filter still applies:** Core or Real Estate first ([ROADMAP.md](../ROADMAP.md)).

---

## Tier framing (strategic stack)

Tiers are **capability families**, not a strict build order inside each tier. Execution order is **DigitalGate 15** + **Immediate programme** below.

### Tier 1 — Critical infrastructure

Must exist for Gen 2 Platform Core to feel real.

| Connector | Notes |
|-----------|--------|
| **Stripe** | Billing + Commerce Payment Engine |
| **ABR** | Approved / **now** — verify & enrich only |
| **ASIC** | **Apply now** — DSP approval gate; stub until then |
| **Google** | Family entry point (GBP first; see Tier 2) |
| **Dreamscape** | Domains / hosting / SSL / mailbox (Infrastructure) |
| **WordPress** | Gen 1 bridge → Gen 2 connector |
| **Domain** | AU listing syndication |
| **REA** | AU listing syndication |
| **Meta** | High priority — social + Lead Ads |
| **OpenAI** | Primary LLM via Model Router |

### Tier 2 — Google family + Model Router

| Surface | Role |
|---------|------|
| **GBP, GSC, GA, Ads, Reviews, Maps/Places, Gmail, Calendar, YouTube** | Google as a family — one auth/strategy mindset, multiple capabilities |
| **Model Router** | OpenAI primary · Anthropic · Gemini |

```
DigitalGate → Model Router → Provider (OpenAI | Anthropic | Gemini)
```

Apps never call providers directly. Spec: [AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) · [AI-GOVERNANCE.md](./AI-GOVERNANCE.md).

### Tier 3 — Communications (provider-neutral)

**AI Communications Core** owns the experience; providers are swappable.

| Channel | Providers (examples) |
|---------|----------------------|
| Email | SES · SendGrid · Postmark · **Resend** (transactional today) |
| SMS | Twilio · MessageMedia |
| WhatsApp | Meta |
| Voice | ElevenLabs · Twilio |

### Tier 4 — Payments / Commerce

- **Stripe Commerce** — primary rails  
- **Crypto** via provider (e.g. Coinbase Commerce) — **not** build a processor  

### Tier 5 — Real Estate

REA · Domain · RP Data / CoreLogic (Cotality) · Google (GBP / Maps / …)  
Detail: [PROPERTY-SYNDICATION.md](./PROPERTY-SYNDICATION.md) · RE connector notes in Connector Engine.

### Tier 6 — Accounting

**Accounting Connector Interface** — Xero first · MYOB · QuickBooks later.

### Tier 7 — E-commerce

**Shopify first** · WooCommerce / Square later.

### Tier 8 — Reviews

**Universal Review** (Reputation — Core plumbing + Growth App UI) + connectors — **GBP first**.  
Not a “Google Reviews App.” Spec: [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md).

### Tier 9 — Social

**Meta + LinkedIn first** (other networks later).

### Tier 10 — Infra

**Dreamscape + Cloudflare** (CDN / edge / DNS adjacent to Infrastructure Core).

---

## DigitalGate 15 (Gen 2 focus)

The fifteen connectors / provider seats that define Gen 2 focus. Rank = programme attention, not “only these forever.”

| # | Connector | Tier | Honest status (code / ops) |
|---|-----------|------|----------------------------|
| 1 | **Stripe** | 1 / 4 | **Live** — platform billing + Commerce |
| 2 | **ABR** ✅ | 1 | **Live** (GUID-gated) — verify / enrich |
| 3 | **ASIC** | 1 | **Stub** — apply DSP now; no production submit |
| 4 | **Google** | 1 / 2 | **GBP OAuth + locations/profile sync**; reviews best-effort into Reputation |
| 5 | **Dreamscape** | 1 / 10 | Infra adapter — **sandbox-first** until automated tests pass |
| 6 | **WordPress** | 1 | **Live** production connector |
| 7 | **Domain** | 1 / 5 | OAuth + Listing Hub path (sandbox → prod) |
| 8 | **REA** | 1 / 5 | Planned / not full Gen 2 adapter yet |
| 9 | **RP Data / CoreLogic** | 5 | Cotality sandbox (OAuth + Address Match) |
| 10 | **Meta** | 1 / 9 | Planned (high) — not full connector yet |
| 11 | **OpenAI** | 1 / 2 | **Live** via Model Router when `OPENAI_API_KEY` set |
| 12 | **ElevenLabs** | 3 | Planned under AI Communications |
| 13 | **Xero** | 6 | Manifest planned — adapter not built |
| 14 | **Twilio / comms** | 3 | Planned — Resend transactional email already in path |
| 15 | **Cloudflare** | 10 | Planned infra seat |

---

## Immediate programme

Build / unlock **now** (parallel where ops-gated):

1. **ABR** — keep live path solid (GUID, smoke, profile persist)  
2. **ASIC** — DSP application + test-env readiness (no fake UI)  
3. **Dreamscape** — sandbox reseller → DigitalGate Domains/Hosting/Email UX  
4. **Google** — GBP (and Google family sequencing)  
5. **Stripe** — billing + Commerce reliability  
6. **REA** — Listing Hub syndication  
7. **Domain** — Listing Hub syndication  
8. **RP Data / CoreLogic** — Cotality enrichment path  

Everything else waits behind this list unless it unblocks Core / RE.

---

## How this maps to Connector Engine categories

| Engine category | Priority tiers primarily |
|-----------------|--------------------------|
| **Business** | 1 (ABR, ASIC, Google), 8 (reviews via GBP), 9 (social) |
| **Property / Industry** | 1 + 5 (REA, Domain, CoreLogic) |
| **Marketing / Growth** | 2 (Google Ads…), 3 (comms), 9 (Meta, LinkedIn) |
| **Commerce / ops** | 1 (Stripe, WP), 4, 6, 7, 10 |

Manifest field (optional): `priorityTier` / `dg15Rank` on planned manifests — **not** a claim of production readiness.

---

## Related

- [GEN-2-ARCHITECTURE-BRIEF.md](../architecture/GEN-2-ARCHITECTURE-BRIEF.md) — Gen 2 north-star (§3 Connector Layer)
- [CONNECTOR-ENGINE.md](./CONNECTOR-ENGINE.md) — framework, categories, Listing Hub  
- [BUSINESS-SETUP.md](./BUSINESS-SETUP.md) — Business Services connectors  
- [CAPABILITY-MODEL.md](../CAPABILITY-MODEL.md) — own UX, integrate infrastructure  
- [ROADMAP.md](../ROADMAP.md) — execution filter + workstreams  
- [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) — Reputation Growth App + Core plumbing  
- [AI-ARCHITECTURE.md](../ai/AI-ARCHITECTURE.md) — Model Router  
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — Dreamscape / Cloudflare seating  
- Code manifests: `packages/platform-core/src/connectors/framework/types.ts`
