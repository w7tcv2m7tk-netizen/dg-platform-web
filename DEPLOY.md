# Deploy app.digitalgate.com.au

Get the Next.js client portal live with real login (Clerk) on Vercel.

## 1. Clerk (auth)

See also **[docs/CLERK-AUTH-SETTINGS.md](./docs/CLERK-AUTH-SETTINGS.md)** for session length, Client Trust (2FA on new devices only), and same-window login.

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) → **Add application** → name it e.g. `DigitalGate Platform`.
2. **API Keys** — copy Publishable key and Secret key.
3. **Configure → Paths** (optional if using env vars below):
   - Sign-in URL: `/login`
   - Sign-up URL: `/signup/account`
   - After sign-in: `/dashboard`
   - After sign-up: `/dashboard`
4. **Configure → Domains** — add:
   - `app.digitalgate.com.au` (production)
   - `localhost:3000` (local dev — usually allowed by default)

## 2. Local test

```bash
cd dg-platform-web
cp .env.example .env.local
# Paste Clerk keys into .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000):

- **Create account** → `/signup/account` → Clerk sign-up
- **Log in** → `/login`
- **Dashboard** → `/dashboard` (protected; redirects to login if signed out)

## 3. Vercel deploy

1. Push `dg-platform-web` to GitHub (or import folder in Vercel).
2. [vercel.com](https://vercel.com) → **Add New Project** → import repo.
3. **Root directory:** `dg-platform-web` (if monorepo) or repo root.
4. **Environment variables** — add all from `.env.example`:

   | Variable | Value |
   |----------|--------|
   | `NEXT_PUBLIC_APP_URL` | `https://app.digitalgate.com.au` |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | from Clerk |
   | `CLERK_SECRET_KEY` | from Clerk |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/signup/account` |
   | `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
   | `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` | `/dashboard` |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` | `/dashboard` |
   | `NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL` | `/login` |
   | `DG_API_BASE_URL` | `https://digitalgate.com.au/wp-json/digitalgate/v1` |
   | `DG_ONBOARDING_URL` | `https://digitalgate.com.au/onboarding/` |
   | `NEXT_PUBLIC_DG_ONBOARDING_URL` | `https://digitalgate.com.au/onboarding/` |
   | `DG_API_KEY` | Dev API key from **digitalgate.com.au** → API Settings (portal/CRM bridge) |
   | `DG_WP_CONNECTOR_API_KEY` | Dev API key from **roerealty.com.au** → API Settings (vendor lead sync) |
   | `DG_WP_CONNECTOR_BASE_URL` | `https://roerealty.com.au/wp-json/digitalgate/v1` |
   | **`DATABASE_URL`** | **Neon pooled connection string (Platform 1.0)** |
   | **`CLERK_WEBHOOK_SIGNING_SECRET`** | **From Clerk webhook endpoint (`whsec_…`)** |

   Use **Production** Clerk keys (`pk_live_` / `sk_live_`) in Vercel — not test keys.

   For Neon, prefer the **Pooled** connection string (serverless-friendly).

5. Deploy. Note the `*.vercel.app` URL for DNS step.

## 4. DNS (app.digitalgate.com.au)

In your DNS host (Cloudflare, cPanel, etc.) for `digitalgate.com.au`:

| Type | Name | Value |
|------|------|--------|
| `CNAME` | `app` | `cname.vercel-dns.com` |

If using Cloudflare, set proxy to **DNS only** (grey cloud) initially if SSL issues occur; Vercel provides its own cert once DNS propagates.

In Vercel → Project → **Settings → Domains** → add `app.digitalgate.com.au`.

## 5. Clerk production domain

After DNS works, in Clerk → **Domains** → add `app.digitalgate.com.au` and switch to production keys if you created separate prod/test apps.

## 5. Clerk production webhook (Platform 1.0)

Provision Postgres org when users sign up in production:

1. [Clerk Dashboard](https://dashboard.clerk.com) → **Webhooks** → **Add endpoint**
2. **Endpoint URL:** `https://app.digitalgate.com.au/api/webhooks/clerk`
3. **Subscribe to events:** `user.created`
4. Copy **Signing secret** (`whsec_…`) → Vercel env `CLERK_WEBHOOK_SIGNING_SECRET`
5. **Redeploy** Vercel after adding the secret

> Existing users who signed up before the webhook: org is created on first visit to `/dashboard` or `/apps/crm/contacts` (session provisioning).

## 6. Smoke test

- [ ] `https://app.digitalgate.com.au` loads
- [ ] `/login` shows Clerk sign-in
- [ ] `/signup/account` creates account
- [ ] `/dashboard` requires login and shows welcome name
- [ ] Dashboard shows live Business Health when `DATABASE_URL` is set
- [ ] `/apps/crm/contacts` — add a contact (stored in Neon)
- [ ] Sign out via sidebar user menu → returns to home
- [ ] `/onboarding` requires login

**Env check (local):** `npm run verify:env`

**WordPress plugin deploy:** [DEPLOY-WP-PLUGIN.md](./docs/DEPLOY-WP-PLUGIN.md)

## Routes

| Path | Auth | Purpose |
|------|------|---------|
| `/` | Public | Landing |
| `/login` | Public | Clerk sign-in |
| `/signup/account` | Public | Clerk sign-up |
| `/signup` | Public | Plan & app picker |
| `/dashboard` | Protected | Client portal home |
| `/onboarding` | Protected | Onboarding hub |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Clerk "Invalid publishable key" | Check env vars in Vercel; redeploy after adding keys |
| Redirect loop | Ensure `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login` matches actual path |
| Dashboard 404 after login | Check `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard` |
| Build fails on Vercel | Both Clerk keys must be set; run `npm run db:generate` works via `postinstall` |
| CRM shows “DATABASE_URL not configured” | Add `DATABASE_URL` to Vercel Production env; redeploy |
| Webhook 400 | Check `CLERK_WEBHOOK_SIGNING_SECRET` matches Clerk endpoint |
| Contacts API 503 | `DATABASE_URL` missing or wrong on Vercel |
| Domain not verified | Wait for DNS propagation (up to 48h; often minutes) |

## Next steps (not in this deploy)

- Stripe checkout on `/signup`
- Link Clerk user → WP CRM contact (`dg_contact_id`)
- Live setup progress from CRM tags on dashboard
