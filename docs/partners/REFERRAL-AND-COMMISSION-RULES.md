# Referral & Commission Rules

**Status: LOCKED** — canonical rates in `packages/platform-core/src/partners/commercial-model.ts`  
Amounts: `packages/platform-core/src/partners/calculate-commission.ts`

See also [COMMERCIAL-MODEL-LOCK.md](./COMMERCIAL-MODEL-LOCK.md).

## Commercial proposition (keep this simple)

**25% of qualifying DigitalGate revenue actually received**, for the first **12 months** of eligibility (Acquisition Partner).

- Customer pays DigitalGate → qualifying revenue is calculated → partner commission is credited.
- **Not** list price, **not** forecast MRR, **not** perpetual.
- The 12-month window is **eligibility**, not a monthly payout schedule.
- Annual payments: commission on the qualifying annual amount is **credited immediately** when DigitalGate receives the payment.
- Partners may **withdraw available** earnings at any time once settlement/clearing rules allow.

## Three economic engines

1. **Platform Revenue** — DigitalGate (not shared with partners by default)
2. **Acquisition Revenue** — Founding Customer referrals, Acquisition Partners, Acquisition Channel Managers (Platform + App subscriptions, 12-month eligibility)
3. **Service Revenue** — Delivery Partners + Delivery Channel Managers (Professional Services + Support & Success)

## Founding Customer direct referral (by cohort)

These are **customer referral** rates — not Acquisition Partner rates. Founding 10 is a **customer cohort**, not a discounted pricing tier and not a partner type.

| Cohort | Rate | Eligibility |
|--------|------|-------------|
| Founding 10 | **20%** | First 12 months of each referred customer |
| Founding 100 | **15%** | First 12 months |
| Founding 1,000+ | **10%** | First 12 months |

Qualifying revenue: Platform + App subscription fees **actually collected**. Professional Services, Implementation, Support & Success and other service revenue are excluded unless specifically designated.

**Founding customers pay published Platform + App pricing.** There is no ongoing Founding Customer discount. Acquisition incentives are trial (configurable, initially 14 days) and optional annual payment (≈ 10 months’ pricing).

## Acquisition Partner commission (separate programme)

**25%** of qualifying **Platform + App subscription revenue actually received** from customers the Acquisition Partner **directly** introduced, for the **first 12 months** of that customer’s subscription eligibility.

This is **not** the Founding 10 direct referral rate (20%).

After the eligibility window: **$0** unless a future programme changes this.

### Monthly example

Customer pays **$500** → DigitalGate receives **$500** → Acquisition Partner earns **$125** (credited on receipt).

### Annual example

Customer pays **$5,000** upfront → DigitalGate receives **$5,000** → Acquisition Partner earns **$1,250 immediately**. Do **not** spread $1,250 across 12 months.

## Acquisition Channel Manager

- **25%** on own qualifying customer acquisition (first 12 months eligibility)
- **5% override** on qualifying revenue from Acquisition Partners they directly manage (same eligibility window)
- Combined when both apply: **30%** total channel economics — always label as **25% Acquisition Partner + 5% Channel Manager override**, not “30% partner”
- Override is **additive** — not deducted from the partner’s 25%
- Same immediate-on-receipt rule for annual payments

Example: annual $5,000 received → Partner **$1,250** + Channel Manager **$250** · DigitalGate retains **$3,500**.

## Delivery Partner

**25%** of qualifying **Professional Services + Support & Success** revenue they deliver.

**No** Platform + App subscription commission under the standard Delivery Partner model.

## Delivery Channel Manager

- **25%** on own qualifying delivery work
- **5% override** on qualifying service revenue from Delivery Partners they directly manage

Separate from acquisition channel economics. Override is additive.

## Qualifying revenue (acquisition)

**Includes:** Platform subscription, Industry Apps, Growth Apps — **actually collected**.

**Excludes:** Professional Services, Support & Success Plans, GST, refunds, chargebacks, pass-through costs, unpaid invoices, catalogue/forecast MRR.

## Qualifying revenue (delivery)

**Includes:** Professional Services, Support & Success Plans — **actually collected**.

**Excludes:** Platform subscription, Industry Apps, Growth Apps, GST, refunds, pass-through costs.

## Refunds / chargebacks

Commission tracks **retained** qualifying revenue. Refunds, partial refunds and chargebacks reverse or adjust commission proportionally with an auditable ledger entry.

## Withdrawals

Ledger states: **Pending** (settlement/clearing) → **Available** (withdrawable) → **Paid** (withdrawn).

Do not force month-end or quarter-end payout cycles as the commercial promise. Partners withdraw available balances subject to operational payment rules.

## Attribution

Track customer, partner, partner type, referral source, Acquisition Partner, Channel Manager, Delivery Partner, Delivery Channel Manager, revenue source, qualifying revenue, commission %, amount, eligibility start/end, status, payment status, invoice/payment reference.

## Terminology

Official roles: **Acquisition Partner**, **Founding Acquisition Partner**, **Acquisition Channel Manager**, **Delivery Partner**, **Delivery Channel Manager**. Prefer these over “Reseller” in current-facing docs and UI.
