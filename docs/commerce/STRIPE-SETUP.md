# Commerce — Stripe setup

## 1. Database

Commerce tables are applied via:

```bash
npm run db:push
```

## 2. Vercel environment variables

| Variable | Source |
|----------|--------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys (`sk_test_` or `sk_live_`) — same key as WP **API Settings → Stripe Secret Key** on digitalgate.com.au |
| `STRIPE_WEBHOOK_SECRET` | Created in step 3 (`whsec_…`) |
| `NEXT_PUBLIC_APP_URL` | `https://app.digitalgate.com.au` (production) |

Redeploy after adding env vars.

## 3. Register webhook (automated)

```bash
STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-webhook.mjs
```

The script creates **or updates** the endpoint:

- **URL:** `https://app.digitalgate.com.au/api/webhooks/stripe`
- **Events:** `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, **`invoice.paid`**, **`invoice.payment_failed`**, **`invoice.payment_action_required`**, **`customer.subscription.created`**, **`customer.subscription.deleted`**, **`customer.subscription.updated`**, **`customer.updated`**, **`account.updated`**, **`transfer.failed`**, **`transfer.reversed`**

`invoice.paid` is required for Platform **Refer & Earn** months 2–12 (subscription renewals) and payment-failure recovery. `invoice.payment_failed` starts the dunning ladder without immediate hard suspend. Subscription lifecycle updates `PlatformSubscription` commercial state + entitlement. See [SUBSCRIPTION-LIFECYCLE.md](./SUBSCRIPTION-LIFECYCLE.md). Connect events power cash payouts. Re-run the script on an existing endpoint to add any missing events (signing secret unchanged).

Optional env Price IDs (`STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL` / `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_BUSINESS` / `STRIPE_PRICE_SCALE`) — when unset, platform checkout uses inline `price_data`.

Copy the printed `whsec_…` into Vercel as `STRIPE_WEBHOOK_SECRET` (only shown on **create**).

## 4. Manual (Stripe Dashboard)

1. [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. **Add endpoint** (or edit the existing Gen 2 URL)
3. URL: `https://app.digitalgate.com.au/api/webhooks/stripe`
4. Select events listed above — **include `invoice.paid`**
5. Copy **Signing secret** → Vercel `STRIPE_WEBHOOK_SECRET`

## 5. Verify

```bash
curl https://app.digitalgate.com.au/api/webhooks/stripe
# {"status":"ok","endpoint":"/api/webhooks/stripe","configured":true}
```

Test payment flow:

1. Vendor lead → **Request marketing contribution**
2. Pay with test card `4242 4242 4242 4242`
3. Webhook marks payment request as **paid**

## Refer & Earn (`invoice.paid`) — ops checklist

Gen 2 route: `POST /api/webhooks/stripe` → `accrueMonthlyReferralCreditFromInvoice`.

| Check | Detail |
|-------|--------|
| Endpoint events | Stripe webhook for app URL must include **`invoice.paid`** |
| Env | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` on Vercel (same mode) |
| First month | Credited on `checkout.session.completed` (platform checkout), not `invoice.paid` |
| Months 2–12 | Only `billing_reason=subscription_cycle`; idempotent on Stripe invoice id |
| Org linkage | Invoice/sub metadata `organisation_id` **or** org `billingCustomerId` = Stripe customer |

Verify GET: `curl https://app.digitalgate.com.au/api/webhooks/stripe` → `configured: true`.

## Refer & Earn cash payouts — Stripe Connect Express

Platform credit is the **default** reward. Cash-out is optional at ~**A$100** ledger balance via **Stripe Connect Express** (AU).

| Variable / setting | Detail |
|--------------------|--------|
| `STRIPE_SECRET_KEY` | Platform Stripe account (same key as commerce) — must have **Connect** enabled |
| `STRIPE_CONNECT_ENABLED` | Set to `true` to expose Connect onboarding + cash payout in Settings → Refer & Earn. Without it, UI shows a clear “not enabled” state (no stub debits). |
| `STRIPE_WEBHOOK_SECRET` | Same Gen 2 endpoint; must include Connect events below |
| Account type | **Express** (recommended). This codebase creates Express + `transfers` capability. |
| Country | `AU` on account create |
| Funding | Transfers pull from the **platform Stripe balance** → connected Express account. Ensure sufficient balance (or use test mode). |

Webhook events for Connect:

| Event | Handler |
|-------|---------|
| `account.updated` | Syncs org `stripeConnectStatus` / `stripeConnectPayoutsEnabled` (enable Connected-account events in Dashboard, or rely on in-app sync after onboarding return) |
| `transfer.failed` / `transfer.reversed` | Credits ledger back (`cash_payout_reversal`) if a `cash_payout` row exists for that transfer |

```bash
# After enabling Connect in Stripe Dashboard → Settings → Connect
STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-webhook.mjs
```

Vercel:

```
STRIPE_CONNECT_ENABLED=true
```

Then redeploy. Owners/admins complete Express onboarding from **Settings → Refer & Earn**.

## Note: two Stripe webhooks

| Endpoint | Purpose |
|----------|---------|
| `digitalgate.com.au/.../billing/webhook` | DigitalGate **sales** (onboarding purchases) — existing WP |
| `app.digitalgate.com.au/api/webhooks/stripe` | **Commerce** + **Refer & Earn** renewals — Gen 2 platform |

Use the same Stripe account; create a **separate** webhook endpoint for the app URL.

## Test vs live mode

Stripe **test** and **live** modes use different API keys (`sk_test_` vs `sk_live_`) and **different webhook signing secrets** (`whsec_…`).

Vercel production can only hold one `STRIPE_WEBHOOK_SECRET` at a time. Pick one mode per environment:

| Environment | `STRIPE_SECRET_KEY` | Webhook endpoint mode |
|-------------|---------------------|------------------------|
| Production (pre-launch) | `sk_test_…` | Test mode webhook → same `whsec_…` |
| Production (go-live) | `sk_live_…` | Live mode webhook → live `whsec_…` |

**Do not mix:** checkout sessions created with `sk_live_` will not reconcile if Vercel has `sk_test_` + test webhook secret. Check session IDs: `cs_test_…` vs `cs_live_…`.

If a payment succeeded but status stayed `checkout_open`, open the Stripe success URL again (includes `session_id`) or re-send the webhook from Stripe Dashboard.

Run diagnostics:

```bash
node scripts/commerce-diagnose.mjs [leadId]
node scripts/roe-flow-diagnose.mjs [leadId]
```
