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

### Why it cannot simply be rotated or removed

Confirmed against the plugin source (`dg-platform`, v10.70.0):

- Each WordPress install stores **exactly one** Dev API key, `dg_dev_api_key`
  (`includes/class-dev-api.php`). Inbound REST calls are verified against it with
  `hash_equals`, and the accommodation, real-estate and growth sync classes all
  fall back to the same option as their **outbound** webhook secret. The plugin
  has no concept of a per-purpose key, so outbound keys cannot be separated by
  purpose without a plugin change — only by host, which Gen 2 already does
  (`DG_WP_CONNECTOR_API_KEY`, `DG_WP_ACCOMMODATION_API_KEY`, per-org keys).
- The plugin calls Gen 2's `POST /api/v1/addresses/resolve` presenting that same
  key (`includes/services/class-address-resolver.php`). So Gen 2 must keep
  accepting a WordPress install's Dev API key on that route.
  `DG_ADDRESS_RESOLVE_API_KEY` can only replace it if it is set to the calling
  install's key value — it is not a key Gen 2 gets to choose.
- The plugin does **not** call `POST /api/indexnow`. That route's `DG_API_KEY`
  fallback therefore has no WordPress dependency at all: its only callers are
  operator and cron. Dropping the fallback there needs `INDEXNOW_API_KEY` set
  first, and nothing else.

Cutover order that follows from this: IndexNow first (no external coordination),
then the portal bridge via `DG_PORTAL_API_KEY`, and address resolve last —
because that one is gated on what a WordPress install presents, not on us.
