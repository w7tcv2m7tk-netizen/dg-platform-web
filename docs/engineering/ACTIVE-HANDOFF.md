# DigitalGate active engineering handoff
Updated: 2026-10-23
Status: release preparation; Production NO-GO

## Priority
Finish independent release-readiness verification for checkout + verified entitlements. Preserve existing AIM Financial and My Venue Clean organisations and onboarding progress.

## Authoritative release candidate
- Repository: w7tcv2m7tk-netizen/dg-platform-web
- Draft PR: #1025 — Release: Checkout Coordinator and Verified Entitlements
- Branch: finish/checkout-entitlements
- Head: d71be3b9b13a2aeb4fe0fb02e0dfbb6a77c17048
- Base main at review: 8b01687fc235d16db6467a91551247e3f69444f9
- Reported locally: 930 tests passed and build passed after Prisma regeneration. These are prior local results, not GitHub CI certification.
- GitHub reports PR mergeable and draft, 177 changed files and 2 checkout-related migration files.
- No checks/runs reported for this release branch. Referenced Final Security Certification workflow path on main returned 404; do not infer GitHub CI passed.

## Release blockers and dependencies
- Production checkout is intentionally fail-closed; 2026-10-21 AIM attempt reported 'Subscription checkout is temporarily unavailable'.
- Historical read-only Production evidence: creation gate and checkout attempt tables absent, 15 migrations finished, initial legacy baseline ledger entry absent. Must refresh before acting.
- Initial 20260805_legacy_schema_baseline recovery requires exact approved operator-side execution. Do not retry credential embedding or execute unrestricted migrations.
- Historical immutable Stripe webhook invocation termination and routing isolation remain unverified; receipt drain alone is insufficient.
- Guard/hold, migration, Stripe event configuration, coordinator and entitlement cutover must follow approved runbook sequence.
- Authenticated end-to-end acceptance has not been certified in an approved isolated environment.
- No Production release, Stripe event changes, checkout opening or customer invitations authorised.

## Customer acceptance
- AIM Financial: existing organisation and progress preserved; Growth AUD 249/month + Finance app AUD 149/month = AUD 398/month, 14-day trial; verify actual Checkout basket, signed webhook, canonical subscription, selected/purchased app entitlements, beta access and authenticated dashboard.
- My Venue Clean: preserve existing organisation and saved onboarding; verify selected offer and Services entitlement from actual purchase evidence. Do not invent pricing or issue a live session.
- Never create customer-specific manual payment links as a workaround.

## Next Codex assignment (safe, independent)
1. Verify working directory and git branch, remote refs, and PR #1025 metadata; read existing certification and frozen migration/recovery documents.
2. Review exact changed code and migration dependencies; identify concrete defects vs stale notes.
3. Create an isolated working branch/worktree from the verified release candidate, without mutating the original PR.
4. Add scoped checkout CI if useful, run local/disposable DB tests, and record commands and evidence.
5. Prepare an approval-ready Production migration and webhook cutover evidence checklist without Production mutations.
6. Produce a focused draft PR with fixes and a phase-by-phase report; stop at owner approval boundaries.

## Milestones
- Development/integration: complete (prior evidence).
- Local tests: 930 passed (prior evidence).
- Local build: passed (prior evidence).
- Release PR: draft #1025 (verified).
- Independent review/CI: in progress.
- Production DB readiness: blocked.
- Stripe webhook clearance: blocked.
- Controlled Production deployment: pending approval.
- Customer activation: pending release acceptance and approval.

## Handoff rules
Update this document in the appropriate PR when facts change. Cite exact commits, test commands, date/time and evidence. Never silently mark historical evidence as current or claim Production readiness from local tests.
