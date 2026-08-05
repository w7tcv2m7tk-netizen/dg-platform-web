# DigitalGate Platform (Generation 2)

Cloud platform for the DigitalGate Business Operating System — multi-tenant SaaS built with Next.js.

**Production:** [app.digitalgate.com.au](https://app.digitalgate.com.au)  
**Deploy:** [DEPLOY.md](./DEPLOY.md)

---

## Platform generations

| Gen | Repo | Role |
|-----|------|------|
| **Gen 1** | `dg-platform` (WordPress) | Version 1 — production on Roe, CVH, digitalgate.com.au |
| **Gen 2** | `dg-platform-web` (this repo) | Version 2 — cloud platform, app.digitalgate.com.au |

We are **migrating** the platform, not replacing it from scratch.

---

## Documentation

Start at **[docs/README.md](./docs/README.md)** — full architecture IP index.

| Document | Purpose |
|----------|---------|
| [docs/PRODUCT-VISION.md](./docs/PRODUCT-VISION.md) | Gateway brand, five pillars |
| [docs/PLATFORM-PRINCIPLES.md](./docs/PLATFORM-PRINCIPLES.md) | Engineering constitution |
| [docs/PLATFORM-ARCHITECTURE.md](./docs/PLATFORM-ARCHITECTURE.md) | Twin, Graph, BI, Core |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Milestones |
| [docs/adr/](./docs/adr/) | Architecture Decision Records |

---

## Repository layout

```
dg-platform-web/
├── docs/                      # Vision, architecture, roadmap
├── packages/
│   ├── platform-core/         # Twin, Graph, BI, Features, Apps, Events
│   ├── database/              # Prisma schema + client
│   └── ui/                    # Design System (@dg/ui)
├── src/                       # Next.js app (apps/web)
│   ├── app/
│   ├── components/
│   └── lib/
└── DEPLOY.md
```

---

## Quick start

```bash
cd dg-platform-web
npm install
cp .env.example .env.local
# Clerk keys + optional DG_API_KEY + DATABASE_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Platform 1.0 — Postgres + CRM

1. Create a [Neon](https://neon.tech) project (Sydney region)
2. Add `DATABASE_URL` to `.env.local`
3. Push schema:

```bash
npm run db:push
```

4. Sign in locally — org auto-provisions on first visit to `/dashboard` or `/apps/crm/contacts`
5. Dev provision endpoint (signed in): `GET http://localhost:3000/api/webhooks/clerk`

**Production:** Add `DATABASE_URL` and `CLERK_WEBHOOK_SIGNING_SECRET` to Vercel. Configure Clerk webhook → `POST https://app.digitalgate.com.au/api/webhooks/clerk` (event: `user.created`).

---

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing |
| `/login`, `/signup/account` | Clerk auth |
| `/dashboard` | Overview + setup checklist |
| `/dashboard/apps` | App catalogue (Core / Business / Growth) |
| `/apps/crm/contacts` | CRM — list + create contacts (Postgres) |
| `/api/v1/contacts` | Platform API — contacts CRUD |
| `/api/webhooks/clerk` | Org provisioning webhook |

---

## Platform Core packages

Import in app code:

```typescript
import { platformApps, getPlatformNavigation, provisionOrganisation } from "@dg/platform-core";
import { prisma } from "@dg/database";
```

**App manifest example:** `packages/platform-core/src/apps/builtins/crm.ts`

---

## Environment

See `.env.example`. Key variables:

- **Clerk** — auth (required)
- **DG_API_KEY** — Gen 1 WordPress bridge (`/portal/me`)
- **DATABASE_URL** — Neon Postgres (Platform 1.0)
- **CLERK_WEBHOOK_SIGNING_SECRET** — Clerk webhook verification (production)

---

## Deploy

See [DEPLOY.md](./DEPLOY.md) for Vercel + Clerk + DNS.

---

## Platform 1.0 status

Implemented locally — deploy after Neon + Vercel env:

- ✅ Prisma schema (Organisation, Contact, Lead, Task, Activity, AuditLog)
- ✅ Org auto-provision on session
- ✅ `POST/GET /api/v1/contacts` with audit + events
- ✅ CRM contacts UI

Next: WordPress Connector sync, Roe RE pipeline.

---
