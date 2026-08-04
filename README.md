# DigitalGate Platform Web

Next.js client portal for the DigitalGate Business Platform — signup, login, dashboard, and API bridge to the WordPress plugin.

**Production URL:** [app.digitalgate.com.au](https://app.digitalgate.com.au)  
**Deploy guide:** [DEPLOY.md](./DEPLOY.md)

## Quick start

```bash
cd dg-platform-web
npm install
cp .env.example .env.local
# Add Clerk keys from https://dashboard.clerk.com
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Routes

| Path | Auth | Description |
|------|------|-------------|
| `/` | Public | Landing |
| `/login` | Public | Clerk sign-in |
| `/signup/account` | Public | Clerk sign-up (create portal login) |
| `/signup` | Public | Plan + industry app + add-on picker |
| `/dashboard` | **Required** | Client portal dashboard |
| `/onboarding` | **Required** | Onboarding hub |
| `/api/onboarding` | Public | Proxy → `digitalgate/v1/onboarding` |
| `/api/health` | Public | Health check |

## Environment

Copy `.env.example` to `.env.local`. Required for auth:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup/account
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

WordPress bridge (optional for plan submission):

```env
DG_API_BASE_URL=https://digitalgate.com.au/wp-json/digitalgate/v1
DG_ONBOARDING_URL=https://digitalgate.com.au/onboarding/
NEXT_PUBLIC_DG_ONBOARDING_URL=https://digitalgate.com.au/onboarding/
```

## Auth

Uses [Clerk](https://clerk.com) for sign-up, sign-in, password reset, and session management. Dashboard and onboarding routes are protected by `src/middleware.ts`.

## Deploy

See **[DEPLOY.md](./DEPLOY.md)** for Vercel + DNS + Clerk setup.

## Relation to WP plugin

```
dg-platform-web (this repo)     dg-platform (WordPress plugin)
─────────────────────────────   ─────────────────────────────
Signup / login / dashboard  →   REST API + CRM + modules
Plan picker (UI)            →   DG_Plan_Registry rules
/api/onboarding proxy       →   POST /digitalgate/v1/onboarding
```

## Next steps

1. **Stripe** — Checkout session after plan picker on `/signup`
2. **CRM link** — map Clerk user ID → WP contact (`dg_contact_id`)
3. **Dashboard** — live setup progress from CRM tags
4. **Onboarding** — port WP onboarding form into React stepper
