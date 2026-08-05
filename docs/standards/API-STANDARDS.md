# API Standards

**Platform API conventions — all Apps and Connectors must follow**

---

## Principles

See [PLATFORM-PRINCIPLES.md](../PLATFORM-PRINCIPLES.md): **API First**, **API Versioning**, **Multi-Tenant**.

---

## Base URL

| Environment | Base |
|-------------|------|
| Production | `https://app.digitalgate.com.au/api` |
| Platform REST (future) | `https://api.digitalgate.com.au/v1` |
| Gen 1 bridge (transition) | `https://digitalgate.com.au/wp-json/digitalgate/v1` |

---

## Versioning

- Public APIs prefixed: `/v1/`, `/v2/`  
- Breaking changes → new version; old version deprecated with documented sunset  
- Connectors declare supported API version in manifest  

---

## Authentication

| Consumer | Method |
|----------|--------|
| Browser (user) | Clerk session cookie |
| Server (Connector) | `X-API-Key` or `Authorization: Bearer` |
| Webhook | Signed payload (Clerk, Stripe) |

Never expose secrets in client bundles.

---

## Tenant scoping

Every request resolves `organisationId` from session or API key mapping.  
All responses filtered to that org. Cross-tenant access returns 403.

Headers (server-to-server):

- `X-API-Key` — connector / dev key  
- `X-Portal-Email` — identity hint (bridge)  
- `X-Clerk-User-Id` — Clerk user linkage  

---

## Response format

```json
{
  "data": { },
  "meta": { "page": 1, "total": 42 }
}
```

Errors:

```json
{
  "error": {
    "code": "contact_not_found",
    "message": "Human-readable message"
  }
}
```

---

## Rules

1. **No direct DB access from route handlers** — use Core services / repositories  
2. **Idempotent webhooks** where possible  
3. **Audit log** on every write  
4. **Publish event** after successful write  

---

## Code

- Next.js routes: `src/app/api/`  
- Gen 1 bridge: `src/lib/dg-api.ts`  
