# White Labelling

**Can agencies brand this as their own platform?**

**Answer today:** Not yet — DigitalGate brand on customer-facing surfaces.  
**Answer architecturally:** Yes — design for it now, enable in Platform 2.0+.

---

## White-label levels

| Level | What changes | When |
|-------|--------------|------|
| **L1 — Logo & colours** | Header logo, primary colour, favicon | Platform 1.5 |
| **L2 — Custom domain** | `app.roerealty.com.au` instead of `app.digitalgate.com.au` | Platform 2.0 |
| **L3 — Email from domain** | Transactional email from agency domain | Platform 2.0 |
| **L4 — Full rebrand** | Hide "DigitalGate" in UI; "Powered by" footer optional | Enterprise |
| **L5 — Reseller / franchise** | Parent org manages child orgs with inherited branding | Platform 3.0 |

---

## Data model (prepare now)

Organisation `settings.branding`:

```json
{
  "brandName": "Roe Realty Platform",
  "logoAssetId": "asset_xxx",
  "iconAssetId": "asset_yyy",
  "primaryColour": "#1a5632",
  "customDomain": null,
  "hideDigitalGateBrand": false,
  "emailFromName": "Roe Realty",
  "emailFromDomain": null
}
```

**Asset Library** stores logo/icon — see [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md) Asset object.

---

## Technical requirements

| Area | Design |
|------|--------|
| **Design tokens** | `@dg/ui` reads org branding CSS variables at runtime |
| **Clerk** | Custom domain support for auth (Enterprise) |
| **Vercel** | Wildcard or per-tenant domain routing |
| **Emails** | Template engine with branding injection |
| **PDF reports** | Growth Report uses org logo |
| **Mobile** | (future) App icon per org |

---

## What stays DigitalGate

Even at L4 Enterprise:

- Platform API hostname may remain `api.digitalgate.com.au` (internal)  
- Billing relationship with DigitalGate (reseller model excepted)  
- Command Centre always DigitalGate-branded  
- AI model usage governed by [AI-GOVERNANCE.md](./AI-GOVERNANCE.md)  

---

## Commercial

White-label typically **Enterprise tier** — see [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md).

| Tier | Branding |
|------|----------|
| Starter / Pro | DigitalGate brand |
| Agency | Logo + colours (L1) |
| Enterprise | Custom domain + full rebrand (L2–L4) |

---

## Scalability

- Branding config cached per org — CDN for logo assets  
- No per-tenant code deploys — all runtime theming  
- Tenant count does not multiply Vercel projects (wildcard SSL)  

---

## Related

- [design/DESIGN-SYSTEM.md](../design/DESIGN-SYSTEM.md) — token architecture  
- [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) — locale per org  
