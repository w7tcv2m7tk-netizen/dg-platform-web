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

Every read of `DG_API_KEY` in the repository. **Dir** is from Gen 2's point of
view: `in` = we verify a caller's key, `out` = we present it to WordPress,
`—` = neither, the value is only tested for presence.

The current credential is `DG_API_KEY` in every row; the replacement column names
what should carry it instead.

#### Runtime consumers — these authenticate something

| # | File | Purpose | Dir | Customer-facing | Replacement | WP dependency | Safe to migrate now? | Prerequisite to remove | Risk of removing early |
|---|---|---|---|---|---|---|---|---|
| 1 | `src/app/api/indexnow/route.ts` | Verifies the caller submitting URLs to IndexNow | in | No — operator/cron only | `INDEXNOW_API_KEY` (already preferred in code) | **None.** The plugin never calls this route | **Yes** — code is done, needs the var set | Set `INDEXNOW_API_KEY` in Vercel and update the cron/operator caller | 401 on every submission. Search engines silently stop being pinged; no user-visible error |
| 2 | `src/lib/platform-api.ts` `isValidLegacyConnectorKey` | Verifies inbound callers on address-resolve and CoreLogic address-match | in | Indirectly — enriches Roe property records | `DG_ADDRESS_RESOLVE_API_KEY` (accepted in parallel, not preferred) | **Yes.** `class-address-resolver.php` presents the install's Dev API key here | **No** | Either the plugin stops calling `/api/v1/addresses/resolve`, or the var is set to that install's Dev API key value | Address resolve 401s for the plugin; Roe property meta stops being enriched |
| 3 | `src/lib/dg-api.ts` `apiHeaders` | Presents a key to the WordPress portal bridge (`/portal/me`) | out | Yes — purchase and onboarding identity | `DG_PORTAL_API_KEY` (already preferred in code) | **Yes.** Value must match the hub install's Dev API key | **Yes, as a rename** — set the new var to the same value | Set `DG_PORTAL_API_KEY` | `/portal/me` 401s and an unlinked profile is returned. Largely dormant while `getApiBase()` returns null for apex |
| 4 | `src/lib/dg-api.ts` `resolveWpApiKeyForBaseUrl` | Host-matched fallback key for outbound connector calls | out | Yes — connector reads and writes | `DG_WP_CONNECTOR_API_KEY` (already preferred) plus per-org keys | **Yes.** Value must match each install | **No** | Every non-apex org needs a per-org or host-specific key provisioned | Connector calls fail `missing_api_key` for any org relying on the hub fallback |
| 5 | `packages/platform-core/src/connectors/wordpress/org-connector.ts` `envWpApiKey` | Same fallback, resolved in platform-core | out | Yes | As row 4 | **Yes** | **No** | As row 4 | As row 4 |

#### Diagnostic consumers — presence checks only, never authentication

| # | File | Purpose | Customer-facing | Safe to migrate now? | Risk of removing early |
|---|---|---|---|---|---|
| 6 | `src/lib/wordpress-sync.ts` `connectorHasKey` | Decides whether a sync is worth attempting | No | Yes, but pointless | Sync incorrectly reports "missing key" |
| 7 | `src/lib/overview-connectors.ts` | "Connector configured" heuristic on the overview | No | Yes, but pointless | Overview shows the connector as unconfigured |
| 8 | `src/app/api/v1/connectors/wordpress/status/route.ts` | Reports key presence as a boolean | No — operator | Yes, but pointless | Diagnostic boolean reads false |
| 9 | `packages/platform-core/src/connectors/framework/health.ts` | Connector catalogue "configured" flag | No — operator | Yes, but pointless | Catalogue shows not-configured |
| 10 | `scripts/verify-env.mjs` | Deployment env validation, currently `required: true` | No | Only once rows 1–5 are done | Deployment checks pass while a live integration is broken |

Rows 6–9 authenticate nothing. They can keep reading `DG_API_KEY` indefinitely at
no risk and are not worth touching — changing them would be exactly the
architectural tidying this inventory exists to avoid.

#### Recommended migration sequence

1. **IndexNow (row 1).** The only one finishable without WordPress. Set
   `INDEXNOW_API_KEY`, update the caller, then drop the fallback from that route.
2. **Portal bridge (row 3).** Set `DG_PORTAL_API_KEY` to the value already in use.
   A rename, not a rotation, so no WordPress change is required.
3. **Connector fallback (rows 4–5).** Provision per-org or host keys first, then
   the env fallback becomes unreachable and can be dropped.
4. **Address resolve (row 2). Last.** Cannot be completed from this side at all:
   the key the plugin presents is chosen by WordPress. Either the plugin stops
   calling the route, or the dedicated var is set to that install's Dev API key.
5. **`verify-env.mjs` (row 10).** Flip `required` to false only after 1–4.

Nothing here should be rotated for tidiness. Every `out` row must match a value
stored inside a WordPress install, so rotating unilaterally breaks a live
integration for no security gain. The genuinely dangerous property — one secret
serving both inbound verification and outbound presentation — is mitigated by
each consumer now preferring a dedicated variable, and is fully resolved only
when rows 1–4 are complete.
