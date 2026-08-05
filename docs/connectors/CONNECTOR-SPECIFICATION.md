# Connector Specification

**How external systems integrate with Platform Core**

Connectors are **not** the platform. They sync data in/out via **Platform API**.

---

## Connector contract

Every Connector must implement:

| Capability | Description |
|------------|-------------|
| **Identity** | Unique ID (`wordpress`, `stripe`, `google-gbp`) |
| **Auth** | API key, OAuth, or webhook signature |
| **Sync modes** | Push (webhook), pull (scheduled), or both |
| **Object mapping** | External record → Universal Object |
| **Health check** | Last sync, error count, status |
| **Events emitted** | e.g. `lead.created` after form submit |

---

## WordPress Connector (Gen 1 → Gen 2)

**Current state:** Gen 1 plugin (`dg-platform`) is full platform on WP sites.

**Target state:** Slim connector:

| Sync | Direction | Objects |
|------|-----------|---------|
| Forms / leads | WP → Platform | Lead, Contact, Activity |
| SEO scores | WP → Platform | Twin metrics |
| Site health | WP → Platform | Twin metrics |
| Portal user | Platform → WP (legacy) | Until Roe migrates |

**Bridge today:** `GET /digitalgate/v1/portal/me` with `DG_API_KEY`

---

## Stripe Connector

| Event | Platform action |
|-------|-----------------|
| `checkout.session.completed` | Create/update Contact, tags, org billing |
| Subscription updated | Update Subscription object |

Moves from WP webhook → Platform API (Phase 2).

---

## Google Connector (future)

- Business Profile, Analytics, Ads  
- Feeds Digital Identity + Twin  

---

## Rules

1. Connectors call **Platform API only** — no direct DB  
2. Idempotent sync (external ID stored on object metadata)  
3. Failures retried with backoff; dead-letter queue at scale  
4. Connector credentials encrypted per org  

---

## Manifest (future)

```typescript
interface ConnectorManifest {
  id: string;
  name: string;
  syncObjects: string[];
  webhookEvents?: string[];
  oauthScopes?: string[];
}
```

**Code location (future):** `packages/connectors/`
