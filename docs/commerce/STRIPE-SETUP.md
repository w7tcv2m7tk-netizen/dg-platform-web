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

The script creates:

- **URL:** `https://app.digitalgate.com.au/api/webhooks/stripe`
- **Events:** `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `payment_intent.payment_failed`

Copy the printed `whsec_…` into Vercel as `STRIPE_WEBHOOK_SECRET`.

## 4. Manual (Stripe Dashboard)

1. [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. **Add endpoint**
3. URL: `https://app.digitalgate.com.au/api/webhooks/stripe`
4. Select events listed above
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

## Note: two Stripe webhooks

| Endpoint | Purpose |
|----------|---------|
| `digitalgate.com.au/.../billing/webhook` | DigitalGate **sales** (onboarding purchases) — existing WP |
| `app.digitalgate.com.au/api/webhooks/stripe` | **Commerce** (Roe vendor fees, etc.) — Gen 2 platform |

Use the same Stripe account; create a **separate** webhook endpoint for the app URL.
