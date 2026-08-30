# Billing source of truth (H-6)

**`PlatformSubscription` is the authoritative record of an organisation's
commercial standing with DigitalGate.** `Organisation.settings.billing` and
`Organisation.settings.apps.entitlementsSuspended` are a **derived projection**
kept for UI and legacy consumers. They are not billing truth and must not be
read to make an access decision.

## Why this document exists

Two representations existed with no stated precedence. Checkout wrote the JSON
first and then synced the table inside a `try/catch` that only logged, so a
failed sync left an organisation that looked subscribed in the UI while
entitlement resolution saw no subscription at all. `getOrganisationBillingStatus`
OR-ed the two together, so a stale JSON flag could contradict the table.

## Authoritative fields

Read these from `PlatformSubscription` only.

| Concept | Column | Notes |
|---|---|---|
| Commercial status | `status` | `TRIALING` … `CANCELLED`; drives the dunning ladder |
| Entitlement level | `entitlement` | `FULL` … `NONE`; drives the write gate |
| Plan | `planTier` | |
| Stripe identifiers | `stripeCustomerId`, `stripeSubscriptionId`, `stripeStatus` | Also used to classify Stripe events (H-8) |
| Dunning timestamps | `paymentFailedAt`, `gracePeriodEndsAt`, `restrictedAt`, `suspendedAt` | |
| Exemptions | `foundingCustomer`, `platformExempt` | Override entitlement to `FULL` |

`Organisation.billingCustomerId` remains the organisation-level Stripe customer
pointer and is written alongside the table.

## Projection fields

`settings.billing` and `settings.apps` may hold copies of `subscriptionStatus`,
`entitlementsSuspended`, `suspendedAt` and `stripeSubscriptionId`. These are
mirrors. They exist because older UI and the WordPress portal profile read
them, and removing them would break those consumers without warning.

Fields that live **only** in JSON and have no table equivalent — these are
legitimate reads:

- `apps.planPreview` — pre-checkout plan selection
- `apps.enabled` — enabled app ids
- `profile.platformTier`, `profile.purchaseLabel`, `profile.purchasedApps`
- `billing.lastCheckoutSessionId`, `billing.lastCheckoutAt` — checkout audit trail
- `billing.programme`, `billing.foundingCohort` — legacy founding metadata, read
  by the referral commission fallback

## Rules

1. **Entitlement decisions read the table only.** `resolveEntitlement` already
   does; do not add a JSON fallback. A failed lookup fails closed to
   `READ_ONLY` rather than granting access.
2. **Write the table first.** `provisionFromPlatformCheckout` now syncs
   `PlatformSubscription` before updating the JSON, and a sync failure is fatal
   rather than logged. If the authoritative write fails, nothing downstream
   should believe the organisation is subscribed.
3. **Derive, then fall back.** `getOrganisationBillingStatus` reads the table
   when a row exists and only consults JSON when there is none — which is a real
   state for organisations that have not reached checkout.
4. **Do not add new JSON billing fields.** Anything new belongs on
   `PlatformSubscription`.

## Known remaining gap

The table write and the JSON mirror are still two statements, not one
transaction. Prisma cannot span them atomically without restructuring
`mirrorToOrganisation`, and the failure mode is now benign in the important
direction: the authoritative write happens first, so a mirror failure leaves
stale *display* data rather than an unenforced entitlement. Making the pair
transactional is a candidate for a later pass.

`billing.platformExempt` is still written directly by Wantd organisation
provisioning (`packages/platform-core/src/wantd/org.ts`) before any
subscription row exists. That is read as an input when the row is first created,
which is why the JSON fallback in step 3 must remain until Wantd writes the
table instead.
