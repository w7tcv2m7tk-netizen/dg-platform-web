# Pricing & Packaging

**Status:** Commercial lock · staff SSOT  
**Audience:** DigitalGate staff  
**Depth lock:** [COMMERCIAL-MODEL.md](../foundations/COMMERCIAL-MODEL.md)  
**Industry packaging:** [INDUSTRY-PLATFORM.md](../foundations/INDUSTRY-PLATFORM.md)  
**Cohorts:** [FOUNDING-COHORTS.md](../strategy/FOUNDING-COHORTS.md)  
**Code:** `INDUSTRY_COMMERCIAL_LOCK` · `industryCheckoutLines()` in `packages/platform-core/src/industry/platform.ts`

This page is the Platform Docs entry for **how DigitalGate is sold**. Product UI (`/pricing`, Founding application) must match this lock. Live invoices and CRM deals belong in Commerce / CRM, not here.

## Public lock

| Layer | Rule |
|-------|------|
| **Platform** | Starter **$99/mo** · Growth **$249/mo** · Scale **$499/mo** · Enterprise custom |
| **Industry App** | **$99/mo** — major vertical capability and infrastructure |
| **Industry Template** | **1 included** with each Industry App (primary business model); **+$29/mo** each additional |
| **Growth Apps** | Optional · billed separately. **Prospecting & Opportunity Engine $99** · AI Visibility $99 · SEO $99 · Automation $49 · Analytics $49 · Social $79 · **Reputation Free** |
| **Platform / Core add-ons** | Extra Users · White Label · **Advanced AI Communications / AI Voice Agents (`voice_ai`) $99** — under Core Communications, not a Growth App |
| **Professional Services** | Optional people work — never required. Includes **Website Migration & DigitalGate Setup** (From $1,497) and **Website Build** (From $1,997). One-off charges, separate from recurring Platform / Apps / Templates / Success |
| **Customer Success plans** | Standard included; Priority / Success Partner optional |
| **AI / Twin / Intelligence** | Across the platform — not sold as separate Apps |

### Growth Apps (optional · billed separately)

| App | Price |
|-----|-------|
| Prospecting & Opportunity Engine | **$99/mo** |
| AI Visibility | **$99/mo** |
| SEO | **$99/mo** |
| Automation | **$49/mo** |
| Analytics | **$49/mo** |
| Social | **$79/mo** |
| Reputation | **Free** |

### Advanced Communications add-on (Core · not a Growth App)

| Capability | Price | SKU |
|------------|-------|-----|
| AI Voice Agents / Advanced AI Communications | **$99/mo** | `voice_ai` |

Voice Agents, AI Outreach, and Advanced Call Centre share one commercial key — they are capabilities under Core Communications, not a separate Growth App.

Not included in platform tier pricing unless an agreement says otherwise. Prospecting & Opportunity Engine is one App (Discovery / scoring / pipeline are capabilities inside it — not separate SKUs).

### Terminology (explicit)

| Term | Meaning |
|------|---------|
| **Industry App** | The major vertical capability and infrastructure the customer buys |
| **Industry Template** | A specialised workflow configuration within that Industry App |

A customer has **one primary Template included** with each Industry App. Additional Templates are optional paid expansions — not separate Industry products.

### Worked examples

| Stack | List | Notes |
|-------|------|-------|
| Property + Real Estate | **$99/mo** | Template included |
| Property + Real Estate + PM | **$128/mo** | $99 + $29 |
| Services + Cleaning + Maintenance | **$128/mo** | Same expansion math |
| Starter + Property + RE + PM | **$227/mo** | Platform + Industry + extra Template |

Do not publish “1 Industry App included” in the **platform** tier, “Unlimited Industry Apps,” “all Property apps for $99,” or Real Estate / Accommodation as separate Industry SKUs.

## Website services (Professional Services + platform capability)

| Requirement | What you buy | Public from-price |
|-------------|--------------|-------------------|
| I already have a website and want it on DigitalGate | **Website Migration & DigitalGate Setup** — existing site ends up running/managed on DigitalGate Infrastructure | **From $1,497 one-time** |
| I want a new website built | **Website Build** — new design/build on DigitalGate | **From $1,997 one-time** |
| I want to build/manage it myself | **Website Builder** — platform software capability (by tier) | Included progressively with Platform / Infrastructure |
| I want ongoing improvement | Professional Services / Success Plans / Growth Apps | Separate |

### Website Migration & DigitalGate Setup

End result: the customer’s **existing** website is connected to and running within DigitalGate Infrastructure (files/content, structure, media, DNS, domain, hosting, SSL, forms, basic integrations, redirects, testing, launch).

**Does not include** redesign or redevelopment. Quote Website Build for a new site.

### Website Build

Public: **From $1,997 one-time** only — do **not** publish Launch / Growth / Business / Custom package tables.

### Website Builder

Software capability inside DigitalGate (create/manage by platform tier) — not a Professional Service product.

### Internal Website Build quoting bands (staff only — not public)

| Band | From | Use when |
|------|------|----------|
| Entry | $1,997+ | Straightforward SME site |
| Growth | $3,497+ | Default lead-gen site connected to DigitalGate |
| Business | $5,497+ | Larger conversion architecture, more content / integrations |
| Custom | $7,500+ | Complex builds, migrations of content into a new design, bespoke requirements |

Founding programme benefits (access / influence) **do not** automatically include Website Migration or Website Build unless expressly written into the Founding offer.

## Founding 10 (active cohort)

- Founding customers pay **standard published** Platform + Industry Apps + Template pricing.
- Benefits are **exclusivity, early access, priority onboarding, founder relationship and roadmap influence** — **not** a recurring percentage discount.
- **Try DigitalGate free for 14 days** (see `BILLING_COMMERCIAL_CONFIG.trialDays`; may become 21 or 28).
- **Annual billing** ≈ **10 months** of monthly pricing (save ~2 months) — see `BILLING_COMMERCIAL_CONFIG.annualMonthsEquivalent`.
- **Founding referral commissions** remain separate: Founding 10 **20%** · Founding 100 **15%** · Founding 1,000+ **10%** on qualifying fees actually received for 12 months per referred customer (eligibility window — credited on revenue received, including annual in full when paid).
- Exact programme terms in the offer/agreement — not a second public price list.
- Customer cohort status and Acquisition Partner commission are **separate**. Commission is a % of **qualifying collected** Platform + App (+ Template) fees — not list price.

## Acquisition Partner packaging (not customer pricing)

Founding Acquisition Partner is **invitation-only**. Commission rules: [REFERRAL-AND-COMMISSION-RULES.md](../partners/REFERRAL-AND-COMMISSION-RULES.md).

**Qualifying App fees include** Industry App subscriptions and additional Industry Template fees. Do not describe the programme as an affiliate programme or as automatic with Founding 10.

## Where this is not

| Surface | Role |
|---------|------|
| Platform Docs | What we sell and how it is packaged |
| Product UI | Checkout, applications, partner terms acceptance |
| CRM | Actual quotes, seats, and pipeline |
| Platform Intelligence | Retrieves this lock with citations — does not invent prices |
