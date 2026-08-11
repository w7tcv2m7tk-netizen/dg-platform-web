# Reviews & Referrals

**Three distinct surfaces — do not blend them.**

| Surface | Layer / timing | Purpose |
|---------|----------------|---------|
| **Platform Referral Programme** (SaaS Refer & Earn) | **Core-adjacent — earlier** (with billing / commercial launch) | Customers & partners refer *DigitalGate subscriptions* |
| **DigitalGate Reputation** | **Core platform capability** | Reputation & trust (Universal Review Object) |
| **Business Referral Network** | Network — Phase 5+ | Verified businesses refer *each other* (leads, disclosed fees) |

**Reputation ≠ Platform Referrals ≠ Business Referrals.** Design all three now. Ship Platform Refer & Earn with (or soon after) subscription billing; Core Reputation beta ships with Connectors maturity; Business Referral Network remains Phase 5+.

Architect so Organisation, billing, CRM, Connectors, AI, and consent can support all three without a rebuild.

See [NETWORK-LAYER.md](./NETWORK-LAYER.md), [PRODUCT-VISION.md](../PRODUCT-VISION.md), [ROADMAP.md](../ROADMAP.md), [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md).

---

## Separation of concerns (non-negotiable)

| Surface | Purpose | Primary outcome |
|---------|---------|-----------------|
| **Platform Referral Programme** | Grow SaaS via Refer & Earn | Referred org pays subscription → referrer earns credit / cash |
| **DigitalGate Reputation** | Reputation & trust (Core) | Monitor, request, respond, score — via Connectors |
| **Referral Engine** (Business) | Customer / partner introductions | Referral Profile → lead in recipient CRM |
| **Business Referral Network** | B2B network effect | Verified businesses refer each other; tracked transactions |
| **Marketplace** | Discovery & facilitation | Software · Services · Professionals · Partners · Integrations |

### Flywheel (long-term)

```
Join DigitalGate (often via Refer & Earn link)
  → Connect digital world (Connectors)
  → Build reputation (Core Reputation via Connectors)
  → Run CRM + AI
  → Join communities / find partners (Network)
  → Refer businesses to each other (Business Referral Network)
  → More reviews → more visibility → more business
  → DigitalGate earns subscription + App + transaction / referral revenue
```

Immediate execution remains:

```
Core → Universal Objects → CRM → Connectors → AI → Industry Apps → Intelligence
→ Platform Refer & Earn (with billing / commercial launch — Core-adjacent)
→ then Network (Community + Reviews + Business Referral Network + Marketplace)
```

---

## 0. Platform Referral Programme (SaaS Refer & Earn) — Core-adjacent

**Grow DigitalGate itself** — not B2B introductions between customers. This is a **first-party growth loop** tied to Stripe subscriptions and Organisation billing. It ships **earlier than Phase 5 Network**, alongside (or shortly after) public SaaS billing.

### Economics

| Rule | Detail |
|------|--------|
| **Customer referrer** | **20%** of the referred organisation’s **subscription** revenue for **12 months** |
| **Partner referrer** | **25–30%** of referred subscription (partner agreement) |
| **Reseller / White Label** | **Custom** commercial terms (enterprise / WL contracts) |
| **Payout form** | **Platform credit by default**; **cash** once accrued balance reaches ~**$100** (threshold configurable) |
| **What earns** | Qualifying **paid subscription** only (plan / App add-ons per policy) — not Marketplace or B2B referral fees |

Commission is **single-level only**: the person (or partner org) whose link/code signed up the new paying org. See hard rule below.

### Hard rule — no multi-level / MLM

- ❌ **No multi-level marketing**, downlines, or “earn on your referrals’ referrals”
- ❌ No cascading tiers that pay more than one hop away from the signup
- ✅ One referrer attribution per new Organisation (last-touch / first-touch policy TBD; document before ship)
- ✅ Transparent terms in-product and in partner agreements

### Product surface

| Piece | Notes |
|-------|-------|
| **Refer & Earn link** | Personal / org share URL, e.g. `/r/benroe` (slug from User or Organisation) |
| **Dashboard metrics** | Invites sent · signups · trials · paid · retained · credits earned · cash available |
| **Share channels** | Copy link, email, SMS, social — via Communications where available |
| **Attribution** | Cookie / signup param → Organisation `referredBy` (or equivalent) on create |

### Lifecycle

```
Invite → Signup → Trial → Paid → Retained → Reward
```

| Stage | Meaning |
|-------|---------|
| **Invite** | Referrer shares `/r/{slug}` or invite |
| **Signup** | New org / user attributed to referrer |
| **Trial** | Trial started (if plan has trial) — no reward yet |
| **Paid** | First qualifying subscription payment |
| **Retained** | Continues paying within the 12-month window |
| **Reward** | Credit accrued monthly (or per invoice); cash-out at ~$100 |

Rewards stop after 12 months from first paid period (or per partner/WL contract). Churn / refunds reverse or pause accrual per billing policy.

### Suggested future objects (document only)

- `ReferralCode` / share slug (user- or org-scoped)  
- `PlatformReferral` (referrer → referred Organisation, status along lifecycle)  
- `ReferralLedger` (credits, cash-outs, Stripe linkage)  

Prefer billing + Organisation fields over premature Network tables.

### MVP shipped (Aug 2026) + Stripe stubs

| Piece | Status |
|-------|--------|
| `/r/{code}` + cookie attribution | ✅ |
| `PlatformReferral` + ledger | ✅ |
| Settings → Refer & Earn dashboard | ✅ |
| Share link + email invite | ✅ (Resend when `RESEND_API_KEY`; else branded Activity queue) |
| First-paid 20% credit on Stripe checkout | ✅ |
| Monthly accrual on `invoice.paid` | ✅ (subscription_cycle renewals; idempotent on invoice id) |
| Cash payout at ~$100 | ✅ Stripe Connect Express + transfer; platform credit remains default. Graceful UI when `STRIPE_CONNECT_ENABLED` unset |
| Partner 25–30% / Reseller rates | ✅ Org `settings.referralProgramme.tier` (customer 20% / partner 25% / reseller 30%) |

**Ops (Ben):** Stripe webhook for `https://app.digitalgate.com.au/api/webhooks/stripe` must include **`invoice.paid`** plus Connect events (`account.updated`, `transfer.failed`, `transfer.reversed`). Re-run `STRIPE_SECRET_KEY=… node scripts/setup-stripe-webhook.mjs`. Vercel: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (same mode) and `STRIPE_CONNECT_ENABLED=true` for cash payouts. Details: [STRIPE-SETUP.md](../commerce/STRIPE-SETUP.md) § Refer & Earn / Connect.

### Timing vs Network

| | Platform Referral Programme | Business Referral Network |
|--|----------------------------|---------------------------|
| **What is referred** | DigitalGate SaaS | Another business’s services / leads |
| **When** | Core-adjacent — commercial launch / billing | Phase 5+ Network |
| **Revenue** | Subscription share to referrer (CAC / growth cost) | Disclosed B2B fees; DG may take a cut |
| **Depends on** | Plans, Stripe, Organisation | Community, CRM, compliance packs |

Do **not** bury Platform Refer & Earn inside Phase 5 Network planning.

---

## 1. Reputation (Core platform capability)

**Core owns** the Universal Review Object, Reputation Service, aggregation, Connector-backed sources, author matching, sentiment/star/response fields, history, notifications/events, timeline/AI availability, and **Reputation Score™ only when real connected data exists** (never decorative stand-ins).

**Not a Growth App product** for closed beta. Optional later: Growth → **Reputation Pro** (campaigns, AI respond UX, competitor analysis, request-more-reviews product surface) — roadmap only.

**Five pillars:** Connect · Centralise · Understand · Automate · Grow

| Capability | Beta floor | Roadmap / Reputation Pro |
|------------|------------|--------------------------|
| Connect sources via Connector Framework | Acc WordPress feed when connected; other slots planned | GBP, Meta, ProductReview, Trustpilot, TripAdvisor, Yelp, … |
| Unified inbox / monitor | Live Acc feed or honest empty state | Multi-source merge + response status |
| Request after job/stay/settlement | Queue Activity on Contact timeline (no SMS invent) | Communications delivery + Automation recipes |
| AI draft / themes | LLM when keyed; keyword stub otherwise | Full respond UX, campaigns |
| Reputation Score™ | From connected rated reviews only; `—` when empty | Scoring Engine™ ownership |
| Competitor analysis | — | Reputation Pro |

### Deep links (honest hooks)

```
Contact → Deal / Service Job / Invoice → Review
Services JobCompleted → Automation → review request Activity → Reputation inbox / score
```

Email/SMS delivery wires via Communications later — beta only persists timeline Activity + events.

### Dependencies

Connector Framework · CRM / Universal Timeline · Automation · AI Service · Scoring Engine · (later) Communications.

---

## 1b. Growth — Reputation Pro (deferred)

Do **not** ship a vapor Growth “Reviews App” flagship. When Core floor is solid, Reputation Pro may add:

* Review request campaigns and sequencing  
* Advanced AI respond / approve workflows  
* Competitor monitoring (lawful sources)  
* Sentiment product dashboards beyond Core themes  

Until then, keep Growth nav free of fake Reviews product claims.

## 2. Referral Engine (Business introductions)

Every DigitalGate business eventually gets a **Referral Profile** (illustrative) — **Network timing**, not Platform Refer & Earn:

| Field | Example |
|-------|---------|
| Business | ABC Electrical |
| Reputation Score™ | Linked from Reviews |
| Location | Suburb / region / Country Pack |
| Services | What they offer |
| Badge | Verified DG Business |
| CTA | Refer this business |

**Referring party** may receive points, credits, discounts, rewards, or partner benefits — **only when disclosed and jurisdiction-allowed**.

**Referred business** receives a **lead / opportunity in their CRM** (Universal Objects + timeline). Referral is a first-class event, not a lost email.

### Suggested future objects (document only)

- `ReferralProfile` (org-scoped public/semi-public card)  
- `Referral` (from → to, type, disclosure, status)  
- `ReferralReward` (optional; policy-gated)  

Do not schema-spam before Network phase. These are **not** the Platform Referral Programme ledger objects.

---

## 3. Business Referral Network (B2B)

Network effect example (real estate):

Agency refers a vendor to mortgage broker · conveyancer · removalist · inspector · cleaner · stager · photographer · property manager — **verified businesses in the DigitalGate network**.

```
Agency sends referral
  → Provider receives lead (CRM)
  → Interaction / transaction tracked
  → DigitalGate may earn a disclosed referral fee
```

This is a **different revenue stream from SaaS subscription** — and **different from Platform Refer & Earn** (which shares subscription revenue with the person who brought a new DG customer). See [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md).

Depends on critical mass + [NETWORK-LAYER.md](./NETWORK-LAYER.md) Community / partner graph. **Not before Phase 5 product work.**

---

## 4. Referral fee transparency + Referral CRM (Business Network)

Applies to **Business Referral Network** Paid / Commission types — not to Platform Refer & Earn subscription credits (those are first-party growth terms).

### Referral types (clearly disclosed)

| Type | Meaning |
|------|---------|
| **Free** | No fee; goodwill / network value |
| **Reciprocal** | Refer-for-refer agreement |
| **Paid** | Fixed fee for a qualified / accepted referral |
| **Commission-based** | % of resulting revenue — **must be visible to all parties** |

**Invisible commissions are not allowed.** Referral fees and commercial terms must be **disclosed** in-product (and in any customer-facing referral materials).

### Funnel (track in CRM / Referral CRM views)

```
Referral → Accepted → Contacted → Converted → Revenue
```

Each stage emits domain events for Automation, Intelligence, and (later) marketplace settlement.

### Compliance (regulated industries)

Real estate, finance, insurance, and similar regulated verticals require **jurisdiction-specific compliance packs** (Country Pack + industry rules) **before** enabling financial incentives or commissions.

| Rule | Implication |
|------|-------------|
| AU first GTM | Design globally; enforce Country Pack + industry pack gates |
| No silent kickbacks | Disclosure UI + audit trail mandatory for Paid / Commission |
| Opt-in commercial terms | Both referrer and recipient acknowledge fee type |
| Disable by default | Financial incentives off until compliance pack enabled for org |

See [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) and industry App governance.

---

## 5. Marketplace connection

Marketplace lanes (Phase 5+): **Software · Services · Professionals · Partners · Integrations**.

| Piece | Role in flywheel |
|-------|------------------|
| **Reviews** | Trust |
| **Community** | Relationships |
| **Business Referrals** | Transactions between businesses |
| **Platform Refer & Earn** | New DigitalGate customers (earlier loop) |
| **Marketplace** | Facilitates discovery & listing |
| **CRM** | Records leads, pipeline, revenue |

App install marketplace remains [APP-MARKETPLACE.md](./APP-MARKETPLACE.md). Broader services / opportunities marketplace is [NETWORK-LAYER.md](./NETWORK-LAYER.md).

---

## Design-now requirements (no product UI yet)

| Concept | Why it matters later |
|---------|----------------------|
| **Organisation** | Referral Profile node; Verified DG Business; `referredBy` for Platform Refer & Earn |
| **Billing / Plan / Stripe** | Platform referral ledger + credit / cash-out |
| **Contact / Lead / Opportunity** | Business referral lands in recipient CRM |
| **Deal / Project completion events** | Trigger review requests |
| **Connectors** | GBP and other review sources |
| **Consent / discoverability** | Network + competitor monitoring boundaries |
| **Country Pack + industry pack** | Compliance gate for Paid / Commission *business* referrals |
| **Scoring Engine slot** | Reputation Score™ |
| **Audit / disclosure fields** | Fee type, terms acknowledged, settlement status |

Prefer reserved settings and events over premature tables until the relevant phase (billing for Platform Refer & Earn; Network for Reviews / B2B).

---

## Explicit non-goals (now)

- ❌ Shipping Reviews or **Business** Referral Network UI before Core / CRM / Connectors maturity  
- ❌ Treating Reviews, Platform Refer & Earn, and Business Referrals as one blended feature  
- ❌ Burying Platform Refer & Earn only in Phase 5 Network (it is **Core-adjacent**)  
- ❌ Multi-level / MLM structures on Platform Refer & Earn  
- ❌ Invisible or undisclosed *business* referral commissions  
- ❌ Enabling Paid / Commission business referrals in regulated industries without a compliance pack  
- ❌ Building Marketplace / Network flywheel ahead of Intelligence and critical mass  

---

## Roadmap placement

| When | What |
|------|------|
| **Now – design** | All constraints above; Platform Refer & Earn attribution + ledger concepts; Connector hooks for reviews; CRM events; disclosure / compliance for B2B |
| **Commercial launch / billing (Core-adjacent)** | **Platform Referral Programme** — Refer & Earn links, dashboard, credit / cash at ~$100, 20% / partner / WL tiers, single-level only |
| **Phase 5 — Network** | Community + partner graph; Reviews App v1 concepts; Business Referral Engine / Profiles (non-financial first) |
| **Phase 5+** | Paid / Commission *business* referrals behind compliance packs; Marketplace opportunities lane; DG B2B referral fee settlement |

Detail for Network surface: [NETWORK-LAYER.md](./NETWORK-LAYER.md). Execution priority: [ROADMAP.md](../ROADMAP.md).

---

## Related

- [NETWORK-LAYER.md](./NETWORK-LAYER.md) — Community, B2B network, Marketplace  
- [PRODUCT-VISION.md](../PRODUCT-VISION.md) — four layers + Growth Apps (Reviews)  
- [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) — Country Packs / jurisdiction gates  
- [APP-MARKETPLACE.md](./APP-MARKETPLACE.md) — installable Apps contract  
- [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) — cohort signals vs Network discovery  
- [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md) — subscription vs Platform Refer & Earn vs B2B referral revenue  
- [AI-GOVERNANCE.md](./AI-GOVERNANCE.md) — AI draft responses, theme extraction boundaries  
