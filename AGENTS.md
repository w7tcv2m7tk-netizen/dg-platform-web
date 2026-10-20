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
Brain; P1 Daily Business Briefings; P1 AI Voice. PR #1006 is the sole checkout release
candidate; #1008 compatibility was merged into main. Production releases, configuration,
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
