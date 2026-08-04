# Deploy app.digitalgate.com.au

Get the Next.js client portal live with real login (Clerk) on Vercel.

## 1. Clerk (auth)

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
   | `DG_API_BASE_URL` | `https://digitalgate.com.au/wp-json/digitalgate/v1` |
   | `DG_ONBOARDING_URL` | `https://digitalgate.com.au/onboarding/` |
   | `NEXT_PUBLIC_DG_ONBOARDING_URL` | `https://digitalgate.com.au/onboarding/` |

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

## 6. Smoke test

- [ ] `https://app.digitalgate.com.au` loads
- [ ] `/login` shows Clerk sign-in
- [ ] `/signup/account` creates account
- [ ] `/dashboard` requires login and shows welcome name
- [ ] Sign out via sidebar user menu → returns to home
- [ ] `/onboarding` requires login

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
| Build fails on Vercel | Both Clerk keys must be set before first deploy |
| Domain not verified | Wait for DNS propagation (up to 48h; often minutes) |

## Next steps (not in this deploy)

- Stripe checkout on `/signup`
- Link Clerk user → WP CRM contact (`dg_contact_id`)
- Live setup progress from CRM tags on dashboard
