# DigitalGate — Partner & Delivery Commercial Model

**Status: LOCKED / CEO DECISION (Aug 2026)**

Canonical implementation:
- Rates: `packages/platform-core/src/partners/commercial-model.ts`
- Amounts: `packages/platform-core/src/partners/calculate-commission.ts`
- Partner configs: `packages/platform-core/src/partners/types.ts` (`PARTNER_COMMISSION_CONFIG`)

UI pages and marketing copy must consume these modules — do not hard-code percentages.

## Final locked structure

| Ladder | Rate |
|--------|------|
| Founding customer referral | **20% / 15% / 10%** |
| Core partner economics | **25%** |
| Channel management override | **+5%** (additive — not deducted from partner 25%) |

## Three economic engines

| Engine | Owner | Partners earn from |
|--------|-------|-------------------|
| **Platform Revenue** | DigitalGate | — (not shared with partners by default) |
| **Acquisition Revenue** | Direct referrers, Acquisition Partners, Acquisition Channel Managers | Qualifying Platform + App subscriptions (12 months) |
| **Service Revenue** | Delivery Partners, Delivery Channel Managers | Professional Services + Support & Success |

## Non-negotiable rules

1. Partners do **not** automatically receive a percentage of Platform subscription fees unless a future CEO decision explicitly changes this.
2. Delivery Partners earn from **services only**, not platform subscriptions.
3. Direct Founding Customer referrals and Acquisition Partner commission are **separate programmes**. Do not describe the Acquisition Partner rate as the Founding 10 referral rate.
4. Channel Manager **5% override is additional** — it does not reduce the partner’s 25%.
5. Primary terminology is **Acquisition Partner**, not Reseller. (DB enum `RESELLER` may remain for compatibility.)

## Founding Customer Referral Programme (not a partner type)

| Cohort | Direct referral rate | Period | Qualifying revenue |
|--------|---------------------|--------|-------------------|
| **Founding 10** | **20%** | First 12 months | Platform + Apps actually collected |
| **Founding 100** | **15%** | First 12 months | Platform + Apps actually collected |
| **Founding 1,000+** | **10%** | First 12 months | Platform + Apps actually collected |

Founding 10 is a **customer programme/cohort**, not a partner type.

## Acquisition Partners

| Role | Rate | Period | Qualifying revenue |
|------|------|--------|-------------------|
| **Acquisition Partner / Founding Acquisition Partner** | **25%** | First 12 months | Platform + Apps actually collected |
| **Acquisition Channel Manager** (own customers) | **25%** | First 12 months | Platform + Apps actually collected |
| **Acquisition Channel Manager** (managed partners) | **+5% override** | First 12 months | Platform + Apps from managed Acquisition Partners |

Example on **$500/month** qualifying revenue (partner + channel manager):

| Party | Amount |
|-------|--------|
| Acquisition Partner | $125/month |
| Channel Manager | $25/month |
| DigitalGate | $350/month |

## Delivery Partners

| Role | Rate | Qualifying revenue |
|------|------|-------------------|
| **Delivery Partner** | **25%** | Professional Services + Support & Success |
| **Delivery Channel Manager** (own) | **25%** | Service revenue they deliver |
| **Delivery Channel Manager** (managed) | **+5% override** | Service revenue from managed Delivery Partners |

**No** Platform + App subscription commission under the standard Delivery Partner model.

Example on **$2,000** qualifying service revenue (partner + channel manager):

| Party | Amount |
|-------|--------|
| Delivery Partner | $500 |
| Channel Manager | $100 |
| DigitalGate | $1,400 |

After month 12: acquisition commission = **$0** unless a future programme changes this. The 12-month clock is system-controlled.

## Official terminology

**Partners:** Acquisition Partners · Delivery Partners · Technology Partners · Strategic Partners

**Management:** Acquisition Channel Manager · Delivery Channel Manager

**Customer programmes:** Founding 10 / 100 / 1,000+ Referral (not partner types)

## Net collected revenue

All commissions are calculated from **qualifying revenue actually received** by DigitalGate — not catalogue pricing, forecast MRR, quotes, unpaid invoices, GST, pass-through costs, or refunds.

## Attribution (ledger must track)

Customer · Partner · Partner type · Referral source · Acquisition Partner · Channel Manager · Delivery Partner · Delivery Channel Manager · Revenue source · Qualifying revenue · Commission % · Commission amount · Commission start/end · Status · Payment status · Invoice/payment reference

## Locked verification examples

Run `assertLockedCommissionExamples()` from `calculate-commission.ts`:

- Founding 10: $500 × 20% × 12 = **$1,200**
- Founding 100: $500 × 15% × 12 = **$900**
- Founding 1,000+: $500 × 10% × 12 = **$600**
- Acquisition Partner: $500 × 25% × 12 = **$1,500**
- + Channel Manager: $500 × 5% × 12 = **$300**
- Delivery Partner: $2,000 × 25% = **$500**
- + Delivery CM: $2,000 × 5% = **$100**

## Customer relationship

DigitalGate owns the platform, product, methodology, customer account, billing and support. Acquisition Partners introduce — they do not own or manage the customer. DigitalGate handles discovery, demo, proposal, closing, contracting, billing, implementation and customer success.
