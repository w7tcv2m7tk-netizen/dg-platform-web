# PR #1025 — Next.js security update (26 October 2026)

This note records a narrowly scoped dependency correction against the pinned
release candidate `e9f6b865b098f44db4d0449c46d33a159fe83964`. It does not
authorize merge, deployment, migration, checkout opening or customer invitations.

## Next.js Server Actions advisory

The candidate's Next.js 16.2.12 was affected by
[GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r).
The advisory identifies App Router applications with at least one Server Action
as vulnerable to unauthenticated CPU denial of service and says upgrading is the
only workaround. It lists 16.4.1 as the first patched 16.x version. The candidate
contains App Router Server Actions, so the condition is present.

`next` is updated to 16.4.1. Its lockfile dependency closure is updated to the
matching `@next/env` and SWC packages, required `@swc/helpers`, Next's PostCSS
dependency, and optional image packages. `sharp` is 0.35.5. React and React DOM
are aligned at stable 19.3.1, with their type packages at 19.3.0 and the required
React DOM scheduler at 0.28.0. Next 16.4.1 accepts React 19.3.1 in its peer ranges.
Other direct dependency versions remain unchanged.

Next 16.4.1 no longer types or accepts `experimental.viewTransition`. The prior
build warned that this option was unrecognized and ignored. The obsolete config
entry was removed; the existing React `ViewTransition` component and CSS are
unchanged. This removes a config warning/type error without disabling a
recognized Next.js setting.

React 19.3 supplies the stable `ViewTransition` export used by the unchanged
authenticated `AppShellLayout`; React 19.2.4 did not export it. The React update
is therefore part of the compatibility correction, not an optional upgrade.

## Five recorded image-decoder advisories

| Advisory | Affected component | Candidate disposition |
|---|---|---|
| GHSA-2xp9-vwfh-vxw4 | Next image optimization / libheif AVIF | Next 16.4.1 is above its patched 16.3.3 threshold. Vercel also documents a platform-wide Image Optimization Service mitigation that disables AVIF optimization/resizing; this applies to requests using Vercel's managed `next/image` pipeline. |
| GHSA-2464-fhr4-w9xw | Next image optimization / librsvg SVG | Next 16.4.1 is the first patched 16.x release. The advisory also identifies sharp >=0.35.5 as a workaround; candidate sharp is 0.35.5. |
| GHSA-f88m-g3jw-g9cj | sharp / libvips | Candidate sharp 0.35.5 exceeds the patched 0.35.0 threshold. |
| GHSA-rgj7-g3m4-5g8c | sharp / libheif | Candidate sharp 0.35.5 exceeds the patched 0.35.4 threshold. |
| GHSA-wq5f-xc86-pv6w | sharp / librsvg | Candidate sharp 0.35.5 is the patched version. |

The Vercel mitigation is specific to its managed AVIF image service; it is not
treated as a general mitigation for SVG, arbitrary sharp use, or self-hosted
image optimization. The package update independently addresses the recorded
sharp versions. Vercel's platform statement is documented at
[Reproducing, disclosing, and fixing the libheif vulnerability](https://vercel.com/blog/reproducing-disclosing-and-fixing-the-libheif-vulnerability-with-hacktron-and-the-maintainers).

## Validation evidence

- `npm ci --ignore-scripts --no-audit --no-fund --fetch-retries=1 --fetch-timeout=30000`: passed in the detached candidate worktree using its checked-in lockfile.
- `npm run db:generate`: passed with Prisma 6.19.3; code generation only.
- `npm run test:checkout-release`: 389 passed, 0 failed.
- `npx tsc --noEmit`: passed after the Next config correction.
- `npm run build --ignore-scripts`: passed using the repository's declared production build script (`next build --webpack`); compilation and TypeScript passed and all 457 static pages were generated. `--ignore-scripts` skipped the unrelated package lifecycle `prebuild` suite; the build script's own 3 boundary/artifact tests passed.
- After React alignment: isolated `npm ci`, Prisma generation, TypeScript,
  389/389 checkout-release tests, `next.config.ts` lint and the complete
  `npm run build` including prebuild passed; all 457 pages were generated.
  Targeted AppShell lint reports the pre-existing `set-state-in-effect` error at
  line 69; AppShell source is unchanged.
- Authenticated runtime acceptance, 26 October: the established synthetic launcher
  used an existing Clerk Development pair and an owned disposable localhost
  PostgreSQL cluster. The retained synthetic test user received a local owner
  membership and explicit test-only exemption. The real server-authorised
  AppShell rendered `/dashboard`; link navigation completed through
  `/dashboard/business`, `/dashboard/brain`, `/apps/crm/contacts` and back to
  `/dashboard`. A hard reload of CRM hydrated and navigation continued.
  Browser error logs contained zero errors, zero hydration errors and zero React
  runtime/ViewTransition errors. Shell attention/notification APIs returned 200.
  This tests shell compatibility, not live paid access or customer checkout.
  Source credential files were read-only; no secret values were recorded.
- `git diff --check`: passed.
- `npm audit --omit=dev`: 13 production-tree findings remain (3 moderate, 9 high, 1 critical). The audit listed no `next` or `sharp` finding after this update. It still exits nonzero for the remaining existing advisories; no unrelated dependency upgrades were made. A fresh audit request first encountered sandbox DNS failure; the successful read was run through the approved registry access path.

Build warnings included the pre-existing middleware-to-proxy deprecation, custom
static asset Cache-Control warning, and dynamic server usage diagnostics for
authenticated pages. The build completed successfully. No checkout, onboarding,
Stripe, entitlement or database behavior code was changed.

## Release status and operational limits

The dependency correction is scoped to the existing draft PR #1025. The resulting
candidate must receive exact-head CI and independent review. Current deployment identity is
confirmed below; this evidence does not establish the effective function duration,
termination of old webhook invocations, acceptable snapshot recovery point,
current live Stripe catalogue/event configuration, or completion of the signed
legacy-purchase reconciliation. Production rollout remains on HOLD until those
existing runbook gates are freshly satisfied and separately approved.

Read-only provider metadata checked 26 October: Production Vercel deployment
`dpl_BTMeff7CDD4pRtWJyDKeGVZ8dgoC` is READY on main
`8b01687fc235d16db6467a91551247e3f69444f9`, with `app.digitalgate.com.au` among
its aliases; project runtime metadata says Node 24.x. The available deployment
and project responses do not report an effective function hard-duration limit,
per-route override, or terminal evidence for old invocations. The prior
dashboard-observed 300-second project default does not independently prove the
effective limit for this deployment. Old-handler termination therefore remains
unverified and the webhook hold must not be activated on this evidence.

Neon metadata still lists snapshot `snap-sweet-grass-a7pwcypq` from protected
Production branch `br-old-shadow-a7ffezls`, created 23 October. Inventory omits
expiry/retention and protected-root restore-finalisation details. Snapshot
presence is verified; acceptable recovery-point age, retention and restore
readiness remain operator/provider checks before cutover.
