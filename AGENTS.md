<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Roadmap governance

Every development task must reference its existing Roadmap requirement ID in
`docs/ROADMAP.md` and the existing catalogue under
`packages/platform-core/src/roadmap/`. The Roadmap is the authoritative development
register; do not create a competing task register in Business Brain or Platform Docs.

Implement only previously approved requirements. A planned capability or proposed
architecture is not implementation approval. Present new ideas to the operator;
record them as awaiting approval until approval evidence is recorded. Preserve
existing requirements and implementation history when reconciling statuses.

Before closing any task, update its Roadmap entry with:
- Implementation reference (files, branch/commit and issue/PR where available).
- Test commands, actual results, date and tested revision; disclose skips/failures.
- Verification status and environment, distinguishing mocks, disposable integration,
  hosted test mode and production verification.
- Remaining work and exact next action.
- Blockers and approvals required, or an explicit statement that none remain.

Use the six verification states defined in `docs/ROADMAP.md`. Passing tests, merged
code or published agents do not automatically establish production readiness.
Business Brain holds explicitly approved business knowledge/rules/strategy;
Platform Docs describe supported technical architecture and verified behaviour.
Neither is a second approved development backlog.

Current delivery order: P0 commercial launch; P1 prospecting; P1 Aida and Business
Brain; P1 Daily Business Briefings; P1 AI Voice. Historical #1006-only release
instructions are superseded by the owner-approved P0 consolidation of 5 November 2026.
The current integration branch is `integration/p0-release-reconciliation-20261105`,
based on preserved #1036 head `d747148f`; the missing `c025378d` is not reconstructed
or certified. Existing PRs remain preserved until owner-approved disposition.
Production releases, configuration,
migrations, Stripe changes, Payment Link deactivation and checkout activation
require explicit operator approval. Preserve the current Core products: Starter
AUD $99/month, Growth $249/month and Scale $499/month, all with a 14-day trial.

Automatic Vercel Preview deployments are disabled by owner instruction (20 October
2026). Do not create Neon preview branches, restore Preview database URL variables,
or enable automatic previews. Use owned disposable local PostgreSQL with synthetic
fixtures for database tests. Run the complete `npm run build` (including prebuild)
before publishing a release branch; `next build` alone is not equivalent evidence.
The existing Development Register remains authoritative for local workspace
ownership, preservation and retirement; the Roadmap governs product requirements.

## Mandatory source-of-truth preflight and reporting

Applies to every agent (including Codex and DeepSeek), before development,
review, summaries, commercial decisions, recommendations and reports:
1. Read this existing `AGENTS.md` at the current repository revision.
2. Read `docs/ROADMAP.md` and identify applicable existing requirement IDs in
   `packages/platform-core/src/roadmap/`; record scope and approval evidence.
3. Check relevant approved, current Business Brain rules with provenance and
   approval/supersession status. Repository seeds defaulting to proposed are not
   approved knowledge. If live Brain is unavailable, explicitly say so; do not
   access Production or promote seed records merely to complete this check.
4. Read `docs/commercial/PRICING-AND-PACKAGING.md`, its linked
   `docs/foundations/COMMERCIAL-MODEL.md` and applicable linked commercial locks.
5. Inspect current catalogue, public pricing, onboarding, billing/Stripe mappings,
   trials and server entitlement code, plus dated reports and test evidence.

Conversation memory, cached summaries, old checkouts and tests are not substitutes
for current authority. Record consulted paths/revision and unavailable sources.
This reference order does not silently resolve contradictory commercial rules.
Report both conflicting values, paths/lines, affected requirement IDs, impact,
missing approval and the owner's next decision; stop dependent commercial changes.
Never alter prices, Stripe products/prices, billing, permissions, migrations or
Production to make a reconciliation test pass. Preserve the owner release HOLD
and disabled Vercel Preview until separately and explicitly authorised.

Every substantive assessment must distinguish **approved** (scope authorised),
**implemented** (exists in code), **tested** (named checks and actual results),
**verified** (acceptance checked in a named environment) and **production-ready**
(all applicable release gates and owner release approval satisfied). Use these
claims alongside, not instead of, the Roadmap's six verification states. Include
requirement IDs, approval/source evidence, exact tested commit, commands/counts,
failures/skips, environment, remaining blockers and next action. Missing evidence
means unverified; mocks/local tests do not establish hosted or Production success.

Run `npm run test:commercial-contract` before reporting commercial consistency.
It is read-only and deliberately fails on discrepancies or missing source evidence;
report its failures separately from safeguard self-test results. Never suppress or
baseline an unresolved conflict as approval. Live Stripe IDs, product state and
approved live Brain coverage remain unverified without separately authorised
read-only evidence. Do not claim this repository check certifies the live website,
provider configuration or customer journeys.
