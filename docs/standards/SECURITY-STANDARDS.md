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

### Final consumer inventory

Every runtime read of `DG_API_KEY`. Direction is from Gen 2's point of view:
**in** means we verify a caller's key, **out** means we present it to WordPress.

| Consumer | Dir | Legacy | Customer-facing | WP depends | Replacement | Prerequisite to remove | Risk if removed early |
|---|---|---|---|---|---|---|---|
| `api/indexnow/route.ts` | in | yes | no — operator/cron | **no** | `INDEXNOW_API_KEY` (already preferred) | set the var in Vercel; update the cron caller | 401 on every submission, so search engines stop being pinged. Silent. |
| `lib/platform-api.ts` (`isValidLegacyConnectorKey`, address resolve) | in | yes | indirectly — Roe property meta | **yes** | `DG_ADDRESS_RESOLVE_API_KEY` | the WordPress install must stop calling `/api/v1/addresses/resolve`, or the var must be set to that install's Dev API key | address resolve 401s for the plugin; Roe property records stop being enriched |
| `lib/dg-api.ts` `apiHeaders` (portal bridge) | out | yes | yes — purchase/onboarding identity | **yes** | `DG_PORTAL_API_KEY` (already preferred) | set the var to the hub install's Dev API key | `/portal/me` 401s; unlinked profile returned. Mostly dormant while `getApiBase()` nulls apex |
| `lib/dg-api.ts` `resolveWpApiKeyForBaseUrl` | out | yes | yes — connector reads/writes | **yes** | `DG_WP_CONNECTOR_API_KEY` (already preferred) + per-org keys | every non-apex org needs a per-org or host key | connector calls fail with `missing_api_key` for orgs relying on the hub fallback |
| `connectors/wordpress/org-connector.ts` `envWpApiKey` | out | yes | yes | **yes** | as above | as above | as above |
| `lib/wordpress-sync.ts` (`connectorHasKey`) | — | yes | no | no | none needed | — | diagnostic only: sync would report "missing key" incorrectly |
| `lib/overview-connectors.ts` | — | yes | no | no | none needed | — | diagnostic only: overview shows connector unconfigured |
| `api/v1/connectors/wordpress/status/route.ts` | — | yes | no — operator | no | none needed | — | diagnostic boolean reads false |
| `connectors/framework/health.ts` | — | yes | no — operator | no | none needed | — | connector catalogue shows not-configured |
| `scripts/verify-env.mjs` | — | — | no | — | — | flip `required` to false only once no runtime consumer needs it | deployment checks pass while a live integration is broken |

The four diagnostics never authenticate anything; they only report whether a key
is present. They can keep reading `DG_API_KEY` indefinitely at no risk, and they
are not worth touching.

**Safest removal sequence.** IndexNow is the only one that can be finished
without WordPress: set `INDEXNOW_API_KEY`, update the caller, then drop the
fallback from that route. The portal bridge is next and needs only the var set to
the existing value — no WordPress change, because the value is unchanged. The
connector fallback needs per-org keys provisioned first. Address resolve is last
and cannot be finished at all until the plugin stops calling it, since the key it
presents is chosen by WordPress rather than by us.

Nothing here should be rotated for tidiness. Each outbound entry must match a
value stored in a WordPress install, so rotating unilaterally breaks a live
integration for no security gain.
