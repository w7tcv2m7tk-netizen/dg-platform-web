# DigitalGate — Partner & Delivery Commercial Model

**Status: LOCKED / CEO DECISION**

Canonical implementation: `packages/platform-core/src/partners/commercial-model.ts`

## Three economic engines

| Engine | Owner | Partners earn from |
|--------|-------|-------------------|
| **Platform Revenue** | DigitalGate | — (not shared with partners by default) |
| **Acquisition Revenue** | Resellers, Channel Managers | Qualifying Platform + App subscriptions (12 months) |
| **Service Revenue** | Delivery Partners, Delivery Channel Managers | Professional Services + Support & Success |

## Non-negotiable rule

Partners do **not** automatically receive a percentage of Platform subscription fees unless a future CEO decision explicitly changes this.

Delivery Partners earn from **services only**, not platform subscriptions.

## Rates (first 12 months)

| Role | Rate | Qualifying revenue |
|------|------|-------------------|
| **Founding 10 Referral** | **15%** | Platform + Apps (simple introduction) |
| **Reseller** | **25%** | Platform + Apps |
| **Channel Manager** (own) | **25%** | Platform + Apps |
| **Channel Manager** (override) | **5%** | Platform + Apps from managed Resellers |
| **Delivery Partner** | **25%** | Professional Services + Support & Success |
| **Delivery Channel Manager** (own) | **25%** | Service revenue they deliver |
| **Delivery Channel Manager** (override) | **5%** | Service revenue from managed Delivery Partners |

After month 12: acquisition commission = **$0** unless a future programme changes this.

## Net collected revenue

All commissions are calculated from **qualifying revenue actually received** by DigitalGate — not quotes, unpaid invoices, GST, pass-through costs, or refunds.

## Architecture objects

| Object | Job |
|--------|-----|
| **Implementation Project** | Container for customer go-live |
| **Implementation Plan** | Scope (Launch / Growth / Enterprise + lifecycle) |
| **Tasks** | Work items |
| **Training** | Enablement |
| **Commission Event / Ledger** | Auditable financial subsystem (Phase 2+) |
| **Customer Commercial Attribution** | Historical acquisition + delivery chain |

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
6. **QA** — scenarios in CEO doc §30

Do not display invented commissions — show **$0** when no real revenue exists.
