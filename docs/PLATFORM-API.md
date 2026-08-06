# Platform API

**REST API for Gen 2** — org-scoped, audited, API-first.

**Base URL:** `https://app.digitalgate.com.au/api/v1`  
**Settings UI:** `/dashboard/settings/api`  
**Catalog:** `GET /api/v1/platform`

---

## Authentication

| Method | Use case |
|--------|----------|
| **Clerk session** | Browser UI (cookie) |
| **API key** | Server integrations, Zapier, custom scripts |

### API keys

1. Go to **Settings → Platform API**
2. Create a key (prefix `dg_live_…`)
3. Copy the secret immediately — shown once

```bash
curl -s "https://app.digitalgate.com.au/api/v1/contacts?limit=5" \
  -H "X-API-Key: dg_live_YOUR_SECRET"
```

Or:

```http
Authorization: Bearer dg_live_YOUR_SECRET
```

Keys are scoped to your organisation. Revoke anytime from Settings.

---

## Response format

Success:

```json
{
  "data": { },
  "meta": { "total": 42, "limit": 100, "offset": 0 }
}
```

Error:

```json
{
  "error": {
    "code": "contact_not_found",
    "message": "Human-readable message"
  }
}
```

---

## Core endpoints (v1)

| Resource | Methods |
|----------|---------|
| Contacts | GET, POST `/contacts` · GET, PATCH `/contacts/{id}` |
| Companies | GET, POST `/companies` · GET, PATCH `/companies/{id}` |
| Leads | GET, POST, PATCH `/leads` |
| Properties | GET, POST `/properties` · GET, PATCH `/properties/{id}` |
| Activities | GET, POST `/activities` |
| Commerce | GET `/commerce/financial-snapshot`, quotes, invoices |
| Org | GET, PATCH `/org/profile` |
| Audit | GET `/audit` |
| Websites | GET `/websites/health` |

Full list: `GET /api/v1/platform`

---

## Rules

1. Route handlers call **platform-core services** — no direct Prisma in routes
2. Every write is **audit logged**
3. **Multi-tenant:** keys and sessions resolve `organisationId`; cross-tenant access returns 403
4. Command Centre and support chat routes require **Clerk session** (no API keys)

---

## Legacy bridge keys

Environment keys (`DG_API_KEY`, `DG_WP_CONNECTOR_API_KEY`) remain for Gen 1 WordPress bridge endpoints. Organisation API keys (`dg_live_…`) are the supported path for new integrations.

---

## Related

- [standards/API-STANDARDS.md](./standards/API-STANDARDS.md)
- [foundations/CORE-OBJECT-SPECIFICATION.md](./foundations/CORE-OBJECT-SPECIFICATION.md)
