# Platform subscription lifecycle (foundation)

**Status:** Locked · August 2026  
**Related:** [STRIPE-SETUP.md](./STRIPE-SETUP.md) · Settings → Billing

## Principle

**Billing state ≠ entitlement access.**

A failed card must never immediately wipe a customer’s operating system. Stripe is the payment source of truth; DigitalGate projects a commercial state, then resolves entitlements separately.

```
Stripe webhook → verified + idempotent receipt
  → Billing Service (PlatformSubscription + timeline)
  → Entitlement Resolver
  → Apps / AI / Automation / global banner
```

## Commercial states

`TRIALING` · `ACTIVE` · `PAYMENT_FAILED` · `PAST_DUE` · `RESTRICTED` · `SUSPENDED` · `CANCEL_AT_PERIOD_END` · `CANCELLED`

## Entitlement levels

| Level | Access |
|-------|--------|
| FULL | Normal |
| FULL_WITH_WARNING | Full + payment banner |
| MOSTLY_FULL | Block new paid apps / AI overage paths |
| READ_ONLY | View / export / billing only |
| NONE | No operational access; data retained |

## Dunning ladder (from `paymentFailedAt`)

| Day | State | Entitlement |
|-----|-------|-------------|
| 0–6 | PAYMENT_FAILED | FULL_WITH_WARNING |
| 7–13 | PAST_DUE | MOSTLY_FULL |
| 14–20 | RESTRICTED | MOSTLY_FULL |
| 21+ | SUSPENDED | READ_ONLY |

Cron: `/api/cron/billing-dunning` (daily). Reminder flags (`day3ReminderAt`, `day7ReminderAt`) are set for a later Communications email pass — **no sends in this foundation**.

## Trial

- Standard: **14-day card-required** Stripe trial (`trial_period_days: 14`, `payment_method_collection: always`).
- **Founding** / **platformExempt**: bypass trial + dunning rules (FULL entitlement).

## Persistence

- `PlatformSubscription` — first-class SaaS seat projection
- `PlatformSubscriptionEvent` — commercial timeline
- `StripeWebhookReceipt` — idempotent event ids
- Thin mirror remains on `Organisation.settings.billing` during cutover

## Explicitly out of foundation

- Billing / trial email sends via Communications
- Staff Billing Health UI + timeline screens
- Hard deletion after retention
