# Referral & Commission Rules

**Status:** Commercial lock for product + approved copy · solicitor review before binding  
**Code:** `packages/platform-core/src/partners/programme.ts`

Commission is **30% of qualifying recurring Platform + App subscription fees actually received** for the **first 12 months** of each new customer the reseller **directly** referred. Not list price. Not the whole invoice. Not perpetual.

## Includes

- Recurring Platform subscription fees actually received
- Recurring App subscription fees actually received
- Qualifying recurring upgrades during the original 12-month window

## Excludes

GST and other taxes; refunds, chargebacks, reversals, write-offs, failed payments; processing fees; Professional Services and training; separately charged support plans; one-off fees; hardware, third-party software, ads/media; domain/hosting pass-through; the reseller's own account (unless DigitalGate approves in writing).

## Rules that must not drift in copy

- Founding **customer** discount does not change the commission **percentage**; it reduces the amount received.
- Example: $500 list with 30% founding discount → $350 received → 30% × $350 = $105/month.
- 12-month clock starts at first paid subscription and does **not** restart on upgrades.
- Cancellation stops commission when qualifying revenue stops.
- Attribution is recorded permanently; commission is not forever.
- Normally **one** reseller paid per customer; CRM is the primary attribution record.
- Existing customers are not commissionable merely because a reseller later introduces another App.
- Customer Founding Discount and reseller commission may both apply to the same customer.

## Approved vs forbidden messaging

Use `APPROVED_PARTNER_MESSAGING` in `programme.ts`. Do **not** say “Make $180,000 a year referring DigitalGate.” Large annual figures are annualised run-rate if the base stays commissionable — not year-one cash.

Staff payouts: `/command/partners/payouts`. Partner view: `/partner` commissions.
