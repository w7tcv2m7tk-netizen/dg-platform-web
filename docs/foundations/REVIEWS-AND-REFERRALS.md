# Reviews & Referrals

**Design now. Build later — after Core, CRM, Connectors, AI, and Intelligence.**

Reviews and Referrals are a **major ecosystem piece** that sits on the Network / Marketplace layer. They are **not** the same product, and they must not become a pile of disconnected features ahead of the platform spine.

**Do not implement this product surface yet.** Architect so Organisation, CRM, Connectors, AI, and consent can support it without a rebuild.

---

## Separation of concerns (non-negotiable)

| Surface | Purpose | Primary outcome |
|---------|---------|-----------------|
| **DigitalGate Reviews** | Reputation & trust | Monitor, request, respond, score, theme-intelligence |
| **Referral Engine** | Customer / partner introductions | Referral Profile → lead in recipient CRM |
| **Referral Network** | B2B network effect | Verified businesses refer each other; tracked transactions |
| **Marketplace** | Discovery & facilitation | Software · Services · Professionals · Partners · Integrations |

**Reviews ≠ Referrals.** Reviews build trust and visibility. Referrals create tracked introductions and (optionally) disclosed commercial outcomes. Marketplace facilitates; CRM records.

### Flywheel (long-term)

```
Join DigitalGate
  → Connect digital world (Connectors)
  → Build reputation (Reviews)
  → Run CRM + AI
  → Join communities / find partners (Network)
  → Refer and receive referrals
  → More reviews → more visibility → more business
  → DigitalGate earns subscription + App + transaction / referral revenue
```

Immediate execution remains:

```
Core → Universal Objects → CRM → Connectors → AI → Industry Apps → Intelligence
→ then Network (Community + Reviews/Referrals product + Marketplace)
```

See [NETWORK-LAYER.md](./NETWORK-LAYER.md), [PRODUCT-VISION.md](../PRODUCT-VISION.md), [ROADMAP.md](../ROADMAP.md).

---

## 1. DigitalGate Reviews (Reviews & Reputation App)

A **Growth App** concept for reputation management — not a social feed.

Businesses can (when built):

| Capability | Notes |
|------------|-------|
| Connect review sources | Google Business Profile and other review platforms via Connectors |
| Monitor in one dashboard | Unified inbox / timeline of reviews |
| Auto-request after jobs/deals | Triggered from CRM / deal / project completion |
| SMS / email review requests | Via Communications + Automation |
| Track response rates | Requested → submitted → responded |
| AI-draft responses | Shared AI Service; human approve where required |
| Negative sentiment alerts | Risk / reputation health signal |
| Competitor monitoring | Opt-in / public-source where lawful |
| **Reputation Score™** | Platform score concept (Scoring Engine) |
| Review growth over time | Trends, not only snapshot star rating |
| Impact on visibility & leads | Correlate reviews → AI Visibility / pipeline (Intelligence) |
| **AI theme extraction** | e.g. “praise communication, but 18% of negatives mention delays” — more valuable than a raw 4.8★ |

### Product concepts (not implementation)

- **Reputation Score™** — derived trust signal; feeds dashboards, Referral Profiles, and (later) Network discoverability. Exact formula deferred; reserve Scoring Engine slot.
- **Theme intelligence** — LLM / NLP over review text → themes, sentiment mix, actionable coaching. Prefer consented org data; competitor themes only from permitted sources.

### Dependencies (build order)

Connectors (GBP etc.) · CRM / deal completion events · Automation · AI Service · Scoring Engine · Growth App shell.

---

## 2. Referral Engine

Every DigitalGate business eventually gets a **Referral Profile** (illustrative):

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

Do not schema-spam before Network phase.

---

## 3. DigitalGate referral network (B2B)

Network effect example (real estate):

Agency refers a vendor to mortgage broker · conveyancer · removalist · inspector · cleaner · stager · photographer · property manager — **verified businesses in the DigitalGate network**.

```
Agency sends referral
  → Provider receives lead (CRM)
  → Interaction / transaction tracked
  → DigitalGate may earn a disclosed referral fee
```

This is a **different revenue stream from SaaS subscription** — transaction / referral economics, not seat pricing. See [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md).

Depends on critical mass + [NETWORK-LAYER.md](./NETWORK-LAYER.md) Community / partner graph. **Not before Phase 5 product work.**

---

## 4. Referral fee transparency + Referral CRM

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
| **Referrals** | Transactions |
| **Marketplace** | Facilitates discovery & listing |
| **CRM** | Records leads, pipeline, revenue |

App install marketplace remains [APP-MARKETPLACE.md](./APP-MARKETPLACE.md). Broader services / opportunities marketplace is [NETWORK-LAYER.md](./NETWORK-LAYER.md).

---

## Design-now requirements (no product UI yet)

| Concept | Why it matters later |
|---------|----------------------|
| **Organisation** | Referral Profile node; Verified DG Business |
| **Contact / Lead / Opportunity** | Referral lands in recipient CRM |
| **Deal / Project completion events** | Trigger review requests |
| **Connectors** | GBP and other review sources |
| **Consent / discoverability** | Network + competitor monitoring boundaries |
| **Country Pack + industry pack** | Compliance gate for Paid / Commission referrals |
| **Scoring Engine slot** | Reputation Score™ |
| **Audit / disclosure fields** | Fee type, terms acknowledged, settlement status |

Prefer reserved settings and events over premature tables until Network phase.

---

## Explicit non-goals (now)

- ❌ Shipping Reviews or Referrals product UI before Core / CRM / Connectors maturity  
- ❌ Treating Reviews and Referrals as one blended feature  
- ❌ Invisible or undisclosed referral commissions  
- ❌ Enabling Paid / Commission referrals in regulated industries without a compliance pack  
- ❌ Building Marketplace / Network flywheel ahead of Intelligence and critical mass  

---

## Roadmap placement

| When | What |
|------|------|
| **Now – Phase 4** | Design constraints above; Connector hooks for reviews; CRM events for post-job triggers; disclosure / compliance requirements documented |
| **Phase 5 — Network** | Community + partner graph; Reviews App v1 concepts; Referral Engine / Profiles (non-financial first) |
| **Phase 5+** | Paid / Commission referrals behind compliance packs; Marketplace opportunities lane; DG referral fee settlement |

Detail for Network surface: [NETWORK-LAYER.md](./NETWORK-LAYER.md). Execution priority: [ROADMAP.md](../ROADMAP.md).

---

## Related

- [NETWORK-LAYER.md](./NETWORK-LAYER.md) — Community, B2B network, Marketplace  
- [PRODUCT-VISION.md](../PRODUCT-VISION.md) — four layers + Growth Apps (Reviews)  
- [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) — Country Packs / jurisdiction gates  
- [APP-MARKETPLACE.md](./APP-MARKETPLACE.md) — installable Apps contract  
- [DIGITALGATE-INTELLIGENCE.md](./DIGITALGATE-INTELLIGENCE.md) — cohort signals vs Network discovery  
- [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md) — subscription vs transaction / referral revenue  
- [AI-GOVERNANCE.md](./AI-GOVERNANCE.md) — AI draft responses, theme extraction boundaries  
