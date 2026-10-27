# Checkout security P1 correction — review evidence

Baseline: PR #1032, `fb7a9594bd398cf66d735585c3d68e7f179d9cbd`.
Branch: `fix/checkout-security-p1-20261027`. The correction is stacked on #1032;
it does not change existing PR heads, main, dependencies or migration SQL.

## Security correction

- Validate every effective SELECT/INSERT/UPDATE/REFERENCES column privilege and
  grant option on both permitted and excluded relations, including PUBLIC.
- Validate the manifest's table/column, exclusion, role, function and sequence
  security fields against reviewed source policy. Source analysis handles exact
  INSERT columns and rejects unscoped operations when only columns are permitted.
- Provisioning receipts: SELECT; INSERT(nonce,fingerprint,window_id,operation,outcome);
  UPDATE(outcome,worker_id,deployment_id,completed_at). No runtime identity edits.
- Read-only identity diagnostics detect column authority, not just table grants.
- Selectively recover #1015's exact unpaid onboarding state-save exemption,
  canonical billing completion checks, ordered/supersedable save queue and tests.
  No pricing, trial, entitlement enforcement, Stripe, coordinator or webhook
  business logic was changed. Existing custom offers and customer choices remain.

## Reproductions and negative controls

Disposable PostgreSQL tests reproduce the original admission-column INSERT,
PUBLIC audit-column INSERT, excluded-ledger column SELECT and provisioning
identity UPDATE cases. Unsafe ACLs are rejected by the verifier before acceptance;
clean runtime authority cannot forge admissions/audit, read excluded columns or
rewrite replay/budget identity. Direct/PUBLIC column operations and allowed-column
grant options are covered. The real local provisioning service inserts/completes
successfully and rejects replay under the restricted role. No external service is
contacted, and synthetic worker credentials are not logged.

## Actual local validation

- Focused manifest/deployment/onboarding: 58/58.
- Security certification: 84/84 + manifest 34/34 + deployment boundaries 8/8.
- Checkout release: 450/450.
- Disposable PostgreSQL permissions: 48/48; coordinator: 44/44.
- Disposable admission/compatibility/reconciliation/guard/operator SQL: 57/57,
  128/128, 27/27, 6/6, 3/3. Owned clusters stopped and destroyed.
- Prisma validation/generation and owned-DB datamodel parity: passed, 6.19.3.
- TypeScript: passed. Canonical full npm build: exit 0, 457/457 static pages.
- New-code ESLint: passed. Full onboarding-component ESLint: two pre-existing
  set-state-in-effect errors, reproduced at #1032 with the exact same effect
  bodies. No rule suppression or unrelated React refactor was introduced.
- Git diff checks: passed. No dependency/lockfile or historical migration changes.

The first build attempt stopped in an old source-shape assertion expecting
parallel autosaves. Recovering #1015's matching UX assertion plus behavioral
save-queue tests fixed the test contract; the complete build was then rerun and
passed. No build command or safety check was bypassed.

## Publication and remaining gates

The first commit pushed must include the repair branch's explicit
`git.deploymentEnabled=false` rule in vercel.json. Existing suppression entries
and main behavior remain unchanged. A draft PR targets #1032's integration branch;
exact-head CI must pass before acceptance. No force push or merge is authorised.

Local/CI results do not establish the actual Production runtime role, safe Neon
integration synchronization, existing Live session containment or a real Live
subscription lifecycle. The owner-pinned AI provisioning API configuration guard
is unchanged; DB-level service tests are not approval to enable that endpoint
under a different Production identity. Production remains on HOLD pending separate
Stage 0 identity evidence, role/credential approvals, controlled release and pilot.
