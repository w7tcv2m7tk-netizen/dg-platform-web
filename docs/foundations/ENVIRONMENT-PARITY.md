# Environment parity

**Permanent DigitalGate engineering principle. Locked.**

> **Local, Preview and Production run the same application architecture and the same
> business logic. Only configuration, credentials, external-service modes and data differ.**

`main` is the source of truth. There is no environment-specific business logic. Any genuine
production-only behaviour requires explicit architectural justification (documented in the
PR and, if durable, here).

## 1. `main` is the source of truth

- Local, Vercel Preview and Production run the **same code and code paths**.
- Differences are limited to **configuration, credentials, external-service modes, and data**.
- Permitted environment-conditional code is restricted to non-business-logic concerns:
  cookie `secure` flags, observability sampling, service-worker/PWA registration, webhook
  signature enforcement, and log verbosity. These do not change what the application *does*.
- Regression guard: `scripts/test-organisation-lifecycle.mjs` locks the tenancy invariant;
  no environment may branch business logic on `NODE_ENV`/`VERCEL_ENV`.

## 2. Production changes flow through Git

Preferred path:

```
local → typecheck / build / unit tests → PR → Vercel Preview → verification → merge main → Production deploy
```

Avoid manual production-only fixes. A necessary out-of-band data fix (e.g. a one-off
database correction) is a **data** exception, not a code exception, and must not introduce
code that only exists in production. Schema/config drift is reconciled back through Git.

## 3. Database parity (Neon)

| Environment | Neon branch/context |
|---|---|
| **Production** | The project's **primary production branch** |
| **Preview** | An **isolated** Neon branch/context (per-PR ephemeral or a shared preview branch), forked from the production schema. Prefer schema + seed/anonymised data — never live PII |
| **Local / development** | An **isolated** per-developer Neon branch/context, forked from production so the schema matches |

- **Schema changes are tracked and reproducible** via Prisma migrations in
  `packages/database/prisma/migrations/`. Apply per branch; production is applied through a
  controlled `migrate deploy` gated in the Git flow — never ad-hoc.
- **Credentials never live in Git.** Each environment's `DATABASE_URL` is supplied out of
  band (Vercel env / `.env.local` / secrets). This document defines the *relationship*
  between branches, not the values.

## 4. Clerk ↔ Neon environment pairing (Option C)

**Canonical implementation:** `scripts/env-pairing.mjs`
**Wired into:** `scripts/verify-env.mjs` and `src/instrumentation.ts` (Node runtime, fail closed)
**Tests:** `scripts/test-env-pairing.mjs`, `scripts/test-verify-env.mjs`

Pairing is determined centrally — do **not** scatter ad-hoc `NODE_ENV` / host checks across the app.

### How Neon environment is classified

1. Parse the **hostname** from `DATABASE_URL` (never log the URL or credentials).
2. Match the Neon compute endpoint id (`ep-…`) against the **central non-secret allowlist** in
   `scripts/env-pairing.mjs` (`NEON_ENDPOINT_ALLOWLIST`), including optional
   `DG_NEON_PREVIEW_ENDPOINTS` (comma-separated `ep-…` ids for ephemeral preview computes).
3. Result: `production` | `development` | `preview` | **`unknown`**.
4. **Do not use the database name.** Backup and other non-allowlisted hosts are **`unknown`**.
5. **`DG_NEON_ENV`** (`development` | `preview` | `production`) is an **explicit declaration**.
   It is **not** trusted alone: it must **agree** with the host classification. Disagreement → **BLOCK**.
6. Unknown host → **BLOCK** (no guessing).

### How Clerk environment is classified

- `pk_test_` / `sk_test_` → **development**
- `pk_live_` / `sk_live_` → **production**
- Missing, unrecognised, or publishable/secret mismatch → **unknown** → **BLOCK**

### Approved pairing matrix

| Clerk | Neon (after declaration ≡ host) | Result |
|---|---|---|
| Development | Development | **ALLOW** |
| Development | Preview | **ALLOW** |
| Production | Production | **ALLOW** |
| Production | Development | **BLOCK** |
| Production | Preview | **BLOCK** |
| Production | unknown / non-prod | **BLOCK** |
| Development | Production | **BLOCK** |
| Development | unknown / backup / other | **BLOCK** |

### Operator checklist

| Deploy target | Clerk keys | `DG_NEON_ENV` | `DATABASE_URL` host |
|---|---|---|---|
| Local | test (`pk_test_` / `sk_test_`) | `development` | development allowlisted `ep-…` |
| Vercel Preview | test | `preview` | preview allowlisted `ep-…` (or listed in `DG_NEON_PREVIEW_ENDPOINTS`) |
| Production | live (`pk_live_` / `sk_live_`) | `production` | production allowlisted `ep-…` |

When adding a new durable Neon endpoint, update `NEON_ENDPOINT_ALLOWLIST` in Git (non-secret ids only).
Ephemeral preview endpoints: set `DG_NEON_PREVIEW_ENDPOINTS` in that environment — still must match `DG_NEON_ENV=preview`.

## 5. Configuration parity

Every environment must have **equivalent required configuration**; only values/credentials
and external-service modes differ. Enforced by `scripts/verify-env.mjs`
(`node scripts/verify-env.mjs --production` for the production gate). The verifier prints
variable **names and presence only — never secret values**.

### Required in every environment
`DATABASE_URL`, `DG_NEON_ENV`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`CLERK_WEBHOOK_SIGNING_SECRET`, `NEXT_PUBLIC_APP_URL`.

### Additionally required in Production
`DG_SETTINGS_ENCRYPTION_KEY` (connector secret encryption at rest, H-4),
`DG_COMMAND_CENTRE_ORG_IDS` (platform-operator recognition, C-2),
`CRON_SECRET` (cron authorisation, H-5), and — **when the associated feature is enabled** —
its webhook secret (e.g. `STRIPE_WEBHOOK_SECRET` when `STRIPE_SECRET_KEY` is set;
connector webhook secrets for enabled connectors).

### Optional / feature-gated
Stripe, connectors (Google/Gmail/LinkedIn/Domain/REA/CoreLogic/Dreamscape), AI providers,
Resend, ElevenLabs, Cloudflare, Vercel DNS, Sentry, Blob storage (required on Vercel,
optional locally). `DG_NEON_PREVIEW_ENDPOINTS` for ephemeral preview Neon computes.

### Local-only
Test keys (`pk_test_`/`sk_test_`), sandbox connector modes, `DG_ALLOW_PLAINTEXT_SECRETS`.

### Preview-only
Preview Neon branch `DATABASE_URL`, `DG_NEON_ENV=preview`, preview app URL; otherwise mirrors
production config with test/sandbox external modes as appropriate.

### Production-only
Live keys (`pk_live_`/`sk_live_`), live connector endpoints, Clerk PWA proxy
(`CLERK_FAPI_URL`/`CLERK_PROXY_URL`), `BLOB_READ_WRITE_TOKEN`, production Neon `DATABASE_URL`,
`DG_NEON_ENV=production`.

### MUST NEVER be present in Production
`DG_ALLOW_PLAINTEXT_SECRETS`, any `pk_test_`/`sk_test_` keys, sandbox connector modes
(e.g. `DREAMSCAPE_SOAP_ENV=sandbox`, `DOMAIN_API_PATH_PREFIX=/sandbox`), and any other
explicitly development-only setting. The verifier fails the production gate if these appear.
Production must never pair with development/preview/unknown Neon hosts.

## 6. Verifier & runtime guard

- `scripts/verify-env.mjs` — pure `evaluateEnv(env, { production })` + CLI; includes pairing.
- `src/instrumentation.ts` — asserts pairing on Node startup (skips when Clerk and `DATABASE_URL`
  are both absent, e.g. incomplete build context).
- Coverage: `scripts/test-verify-env.mjs`, `scripts/test-env-pairing.mjs`.
- Never prints secret values — only names, presence, and safe mode indicators
  (`test`/`live`/`sandbox`/`production`, Clerk class, Neon host class, `DG_NEON_ENV`).

See also: `docs/foundations/ORGANISATION-LIFECYCLE.md`, `.cursor/rules/environment-parity.mdc`,
`.env.example`.

## Owned local synthetic development (21 October 2026)

For `platform.auth` and authenticated `growth.pipeline` acceptance, use:

```sh
npm run dev:synthetic -- /absolute/postgresql/bin /absolute/existing-test-credentials.env
```

The credential file is read only. Only `CLERK_SECRET_KEY` and
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are taken from it; both must be test keys.
Never put secrets in chat, commits, command arguments or the launcher context.
The launcher rejects worktree dotenv files, starts its own PostgreSQL cluster on
literal 127.0.0.1 and a random non-default port, creates a fresh
`dg_synthetic_prospecting` database, installs the current schema into that empty
local database, and binds Next development to verified localhost. It prints the local
origin and an owner-only context file containing only local connection details.
Its environment allowlist excludes Stripe, mail, messaging, AI, Vercel, CI,
Production authentication and all inherited database variables. Stop with Ctrl-C;
the owned cluster is stopped and removed. No remote migration or webhook is
created. This schema bootstrap does not replace migration regression tests.

`DG_LOCAL_SYNTHETIC=1` enables a separate fail-closed pairing check. It requires
NODE_ENV=development, DG_NEON_ENV=development, both Clerk test keys, an HTTP
loopback app origin, and disposable database names on literal loopback with an
explicit non-default port. All optional direct/shadow/reconciliation database
URLs must obey the same rule; routing override URL parameters are rejected.
The existing Neon classifications and Production matrix remain unchanged.
Production, test runtime, Vercel and CI refuse local mode. The normal Clerk
middleware, session checks and organisation permissions remain intact.

No webhook signing secret is invented. Ordinary browser authentication does not
exercise invitation webhooks. Test invitation delivery separately only with a
verified isolated endpoint and its actual development signing secret. Do not
re-enable either disabled Clerk endpoint as part of this launcher setup.

Runtime verification: real Clerk development email-code sign-in succeeded and
reached `/post-login`; the authenticated dashboard and its attention/notification
APIs returned HTTP 200. The original refresh loop was resolved by matching the
Next bind hostname to the localhost app origin. The launcher checks that every
localhost DNS result is loopback before binding. No middleware/auth exception
was retained. Four shared-shell imports now refer directly to existing client-safe
modules, avoiding server-only Node dependencies in development browser bundles.

Synthetic local fixtures used a real test Clerk user, a normal owner membership,
two disposable organisations and explicitly exempt test-only subscriptions.
No paid state or Stripe object was manufactured remotely. The reserved
`+clerk_test` address uses Clerk test-mode OTP; no real email code was delivered.
The synthetic Clerk development user is retained for subsequent local tests.
All owned PostgreSQL clusters and local servers were stopped and removed.

Full Prospecting workflow and authenticated tenant-isolation certification is
still outstanding: browser navigation stalled/timeouts occurred, and the direct
cross-tenant API browser navigation was blocked by the browser client; the server
subsequently recorded HTTP 405 because that detail endpoint has no GET handler.
That response does not establish a tenant-isolation result. Do not
claim those checks passed, or equate the successful login/shell smoke with
release certification. No Production, Neon or Vercel configuration changed.
