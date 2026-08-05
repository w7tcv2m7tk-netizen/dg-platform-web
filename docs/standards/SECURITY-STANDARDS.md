# Security Standards

**Security by Default — see [PLATFORM-PRINCIPLES.md](../PLATFORM-PRINCIPLES.md)**

---

## Tenant isolation

- Every row has `organisation_id`  
- Repositories enforce scope — no optional org filter  
- Integration tests must include cross-tenant denial cases  

---

## Authentication & authorization

- Production auth via **Clerk**  
- Authorization via **Feature Registry** (`crm.contacts.read`)  
- **Least privilege** — default deny; grant features via role templates  

---

## Secrets

| Secret | Storage |
|--------|---------|
| `CLERK_SECRET_KEY` | Vercel env (server only) |
| `DG_API_KEY` | Vercel env (server only) — digitalgate.com.au |
| `DG_WP_CONNECTOR_API_KEY` | Vercel env (server only) — roerealty.com.au vendor sync |
| `DATABASE_URL` | Vercel env (server only) |
| Stripe keys | Platform Core billing service |

Never commit secrets. Never prefix secrets with `NEXT_PUBLIC_`.

---

## Audit

Log on every write:

- Actor (user ID or connector ID)  
- Organisation ID  
- Action + entity type + entity ID  
- Timestamp  
- Before/after snapshot (where practical)  

---

## Data protection

- TLS everywhere (Vercel, Clerk, Cloudflare)  
- Encrypt sensitive connector credentials at rest (Phase 2)  
- PII minimisation in logs  

---

## Webhooks

- Verify signatures (Clerk, Stripe)  
- Reject replayed events where provider supports it  
- Clerk webhook route: `/api/webhooks/clerk` (public, verified)  

---

## Gen 1 bridge

`DG_API_KEY` grants server-to-server access to WP `/portal/me` — rotate via WP Admin if exposed.
