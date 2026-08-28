# DigitalGate — Partner & Delivery Commercial Model

**Status: LOCKED / CEO DECISION (Aug 2026)**

Canonical implementation: `packages/platform-core/src/partners/commercial-model.ts`

## Three economic engines

| Engine | Owner | Partners earn from |
|--------|-------|-------------------|
| **Platform Revenue** | DigitalGate | — (not shared with partners by default) |
| **Acquisition Revenue** | Direct referrers, Resellers, Acquisition Channel Managers | Qualifying Platform + App subscriptions (12 months) |
| **Service Revenue** | Delivery Partners, Delivery Channel Managers | Professional Services + Support & Success |

## Non-negotiable rule

Partners do **not** automatically receive a percentage of Platform subscription fees unless a future CEO decision explicitly changes this.

Delivery Partners earn from **services only**, not platform subscriptions.

**Direct Founding Customer referrals and Reseller commission are separate programmes.** Do not describe the Reseller rate as the Founding 10 referral rate.

## Founding Customer direct referral (by cohort)

| Cohort | Direct referral rate | Period | Qualifying revenue |
|--------|---------------------|--------|-------------------|
| **Founding 10** | **20%** | First 12 months | Platform + Apps actually collected |
| **Founding 100** | **15%** | First 12 months | Platform + Apps actually collected |
| **Founding 1,000+** | **10%** | First 12 months | Platform + Apps actually collected |

Decreasing percentage reflects increasing maturity and scale of the programme. Cohort membership is fixed at acceptance — customers do not automatically move between tiers.

## Acquisition channel (separate from direct referral)

| Role | Rate | Period | Qualifying revenue |
|------|------|--------|-------------------|
| **Reseller / Founding Acquisition Partner** | **25%** | First 12 months | Platform + Apps actually collected |
| **Acquisition Channel Manager** (own) | **25%** | First 12 months | Platform + Apps actually collected |
| **Acquisition Channel Manager** (override) | **5%** | First 12 months | Platform + Apps from managed Resellers |

Combined acquisition channel economics when both apply: **25% + 5% = 30%** — not a single “30% Reseller commission”.

## Delivery channel (separate from acquisition)

| Role | Rate | Qualifying revenue |
|------|------|-------------------|
| **Delivery Partner** | **25%** | Professional Services + Support & Success |
| **Delivery Channel Manager** (own) | **25%** | Service revenue they deliver |
| **Delivery Channel Manager** (override) | **5%** | Service revenue from managed Delivery Partners |

After month 12: acquisition commission = **$0** unless a future programme changes this.

## Net collected revenue

All commissions are calculated from **qualifying revenue actually received** by DigitalGate — not catalogue pricing, forecast MRR, quotes, unpaid invoices, GST, pass-through costs, or refunds.

If Stripe/payment attribution is unavailable, show commission as **pending/unattributed** — do not invent values.

## Architecture objects

| Object | Job |
|--------|-----|
| **Implementation Project** | Container for customer go-live |
| **Implementation Plan** | Scope (Launch / Growth / Enterprise + lifecycle) |
| **Tasks** | Work items |
| **Training** | Enablement |
| **Commission Event / Ledger** | Auditable financial subsystem |
| **Customer Commercial Attribution** | Programme, role, rate snapshot, period |

## Partner role combinations

A partner may hold multiple roles (e.g. Reseller + Delivery Partner). Each role is **separately attributed** and commissioned.

## Customer relationship

DigitalGate owns the platform, product, methodology, customer account, billing and support. Partners extend DigitalGate — they do not own the customer relationship.

## Development phases

1. **Commercial rules** — constants, role model, revenue separation (`commercial-model.ts`, `types.ts`)
2. **Attribution** — hierarchy, historical snapshots, ledger schema
3. **Platform** — dashboards, admin, customer commercial record
4. **Website** — audit copy, ecosystem page, SEO pages
5. **Legal** — Partner / Reseller / Delivery / Channel Manager terms
6. **QA** — commission scenarios

Do not display invented commissions — show **$0** when no real revenue exists.

## Flagged for CEO / legal (not invented here)

- Multiple referrers / attribution disputes resolution process
- Chargeback handling beyond “no commission on reversed revenue”
- Programme changes for existing vs future customers
- Whether Founding 100 / 1,000+ Reseller invitation rules differ from Founding 10
