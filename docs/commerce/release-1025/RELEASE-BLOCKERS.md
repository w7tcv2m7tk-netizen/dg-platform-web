# Release blockers — PR #1025

## VERIFIED — local corrections completed

- Coordinator standalone DB runner failed Prisma parity because it pinned 92bb0851
  and omitted current acquisition identity, entitlement and hold schema. It now
  reuses one owned disposable runner pinned to reviewed main 8b01687f, rebuilds
  the gate from certified SQL including singleton CHECK, applies attempt/app/hold
  SQL once and checks complete Prisma parity. Guard standalone runner reused the
  same correction. No application behaviour changed.
- No GitHub check runs existed. Added a dedicated credential-free PR workflow,
  read-only GitHub permissions, pinned checkout/setup actions, Node24, lockfile
  install, explicit Prisma generation, local PostgreSQL suites, TypeScript, full
  build and browser-boundary checks. No Neon/Vercel provisioning actions/secrets.
  PostgreSQL sharedir resolves through pg_config for Linux/macOS portability.
- New package replaces stale 13/22-count instructions with fresh 25/25 evidence.
  No Production migration remains to execute. Frozen recovery package unchanged.

## BLOCKED — ordered operational prerequisites

1. Publish/review improvements through the existing release process without
   rewriting #1025. GitHub CI must run and pass, or owner explicitly accepts
   equivalent recorded local evidence. New branch publication must first preserve
   Preview/provisioning suppression; no push was attempted during this work.
2. Verify actual serving guard-capable source, all aliases, webhook destination,
   effective old/new execution limits and provider invocation completion. Neither
   current main nor receipt drain alone establishes this.
3. Approve hold/drain, live Stripe event selection and billing-evidence read-only
   reconciliation. Resolve all legitimate paid legacy customers before serving
   the new entitlement gates; signed exact-plan approval required for writes.
4. Approve full deployment, retry/replay/catch-up and smoke tests, then approve
   opening checkout and only afterwards customer invitations.

## NOT VERIFIED — external assumptions

- Current live Price IDs, endpoint event subscriptions/signing configuration,
  deployed env mappings and WordPress billing separation were not changed or
  recertified. Historical observations require window-specific confirmation.
- Original local recovery Git object af85b034 is unreadable, although all 37
  preserved runner files match their checksum inventory and all 25 Production SQL
  checksums match. The frozen on-disk manifest remains untouched. Recover immutable
  Git/archive provenance before any future migration write; do not recreate history.
- Snapshot metadata is present but protected-root direct restore finalisation,
  retention and acceptable RPO require operator/provider confirmation; approved
  candidate-restore cutover is the fallback, not an automatic action.
- Production exemption count is six. Identity-specific unchanged values require
  private operator comparison; no customer records were retrieved in this audit.
- The 26 October targeted Next.js security correction is recorded in
  `NEXT-SECURITY-UPDATE-20261026.md`. Next 16.4.1 and sharp 0.35.5 remove the
  reviewed Next Server Actions and five image-decoder advisory versions from the
  production dependency tree. A fresh `npm audit --omit=dev` still reports 13
  other findings (3 moderate, 9 high, 1 critical); those were not upgraded in
  this scoped correction and remain subject to the existing security disposition.
- No newly approved isolated hosted environment was used. Reused 22/22 provider
  evidence predates integrated head; deployed end-to-end smoke is outstanding.

## REQUIRES OWNER APPROVAL

All Production writes, holds, live provider configuration, deployments/merges,
reconciliation writes, restore operations, checkout opening and invitations.
No optional Finance or cleaning integration is a standard-checkout blocker.
