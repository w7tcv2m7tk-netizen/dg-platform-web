# Unified acquisition — isolated Phase 1

This branch extends the existing Prospecting engine. The migration is prepared for review and disposable local testing only. No remote migration, merge or deployment is authorised by this implementation.

## Identity and reconciliation

Canonical identity is the checksum-valid, whitespace-normalised 11-digit ABN on GrowthProspect and CRM Company, scoped by owning organisation. Verification provenance retains the ABR method, retrieved timestamp and identity snapshot. Client-supplied metadata cannot assert verification. Name search returns candidates; saving a selected ABN performs a new server-side verification. Manual entry without ABN remains unverified.

Inspected historical sources: discovery writes `metadata.providerRefs.abn`; organisation profiles store `settings.profile.abn`; BusinessIdentity snapshots expose `identifiers.abn`. The compatibility reader also recognises `metadata.abn`, `metadata.businessIdentity.identifiers.abn` and `metadata.identity.identifiers.abn`. Organisation-profile identity is not automatically copied into a tenant's prospect book.

Migration `20261020090000_unified_acquisition_identity` adds nullable columns and tenant/ABN unique indexes to previously empty columns. It does not rewrite or merge legacy rows, assign orphan ownership, or manufacture verification. PostgreSQL permits multiple null ABNs and null owners. Existing metadata and CRM association IDs remain unchanged.

Deterministic reconciliation on verified intake/conversion:

1. Use an existing canonical tenant/ABN record; preserve its fields and links. Archived prospect identities require explicit restoration.
2. If no canonical record exists, inspect all legacy metadata claims in that tenant (not a 200-record sample).
3. Exactly one record with one consistent ABN claim can adopt the freshly verified identity; its ID, status and history remain unchanged.
4. Multiple matching records or conflicting claims produce `reconciliation_required`. Leave every record intact. An operator must explicitly resolve the conflicting relationship before retrying; no name/domain-based automatic merging occurs.
5. Invalid legacy ABNs remain unverified metadata. Unknown ownership stays null. No tenant access or membership follows from an ABN match.

Before a future remote rollout, run a separately authorised read-only inventory of real legacy claims and review the conflicts. No live customer-data inventory was performed here.

## Existing relationships

The identity and relationship POST endpoints live beneath `/api/v1/prospecting/prospects/:id/`. The relationship form selects explicit existing CRM records and customer organisations. CRM records must belong to the prospect-book tenant. Explicit cross-tenant customer links require current active owner/admin membership in both source and destination. Linking grants no membership and invokes no customer transition, onboarding or commercial mutation.

Repeated identical links create one `relationship_linked` engagement. Conflicting links or contact/company associations return 409. Contacts are never reassigned, including unassigned contacts. Existing conversion services remain in use; a tenant-scoped advisory lock serialises conversion retries, and existing metadata checkpoints allow partial service failures to resume. This does not make the existing multi-service conversion fully transactional.

## Workflow and priorities

The landing route renders Today's Priorities; `/today` remains available. Overview is preserved at `/overview` and `?view=overview`. Shared navigation retains other routes and legacy aliases.

Existing stages map to Discover, Research, Opportunity, Contact, Follow-up and Consultation. Qualify, Score, Call Brief and Next Action remain workflow capabilities. Won/onboarding alone never establish Trial/Customer. Those labels require an authorised read of an existing platform subscription with an external subscription reference and authoritative commercial status. There are no commercial writes.

Priorities reuse existing scoring and saved audits. Due follow-ups precede other work; contactable, sufficiently researched relationships precede research work; score and prospect ID break ties. Future scheduled follow-ups are excluded. Consultations remain eligible. Scores are labelled Contact priority or Research priority, never qualification or business-health scores. Call briefs require evidence and a contact route. Missing decision-maker names are not invented. Property-specific descriptions require a property/real-estate industry.

## Validation

- `npm run db:generate`
- `npx tsc --noEmit --incremental false`
- `node scripts/run-unified-acquisition-local-db.mjs /opt/homebrew/opt/postgresql@18/bin`
- Regression scripts and production compilation results are recorded in the delivery report.

The local runner removes inherited database URLs, binds only loopback on a random non-default port, materialises a pinned pre-change schema, applies the exact migration, tests synthetic ABR responses and fixtures, then stops and removes its owned cluster. ABR HTTP is intercepted in the test loader; no registry or customer service receives fixture requests. Event dispatch is stubbed to avoid external integrations; canonical CRM services and PostgreSQL queries run locally.

This evidence does not establish Production readiness. Live ABR credentials, authenticated browser integration and a separately authorised legacy-data reconciliation rehearsal remain rollout gates.

## Recorded isolated validation — 20 October 2026

- Prisma Client generation: passed (6.19.3).
- TypeScript `--noEmit --incremental false`: passed.
- Disposable PostgreSQL migration/integration suite: 15 tests passed. Includes pre-migration duplicate metadata and orphan rows, 12 concurrent intake requests, a single creation event, synthetic ABR name/ABN lookup and outages, CRM retries, contact conflicts, customer status/membership/subscription/entitlement/history preservation, lifecycle mapping, Top 3 and rendered evidence/industry safeguards.
- Existing regression suites: 85 tests passed across Prospecting navigation/report/mobile, Growth ownership/mutation/isolation, contact-company isolation, customer lifecycle, Growth suite consistency and discovery relevance. Navigation/mobile source assertions were updated for the approved landing experience and actual existing refresh behavior.
- Optimized `npx next build`: passed. Build ran without a configured remote database. Initial sandbox-only compiler port binding failure was resolved by allowing local build subprocesses.
- ESLint: no findings in the new identity, linking, lifecycle, form and priorities modules. Whole changed-file lint retains two pre-existing `react-hooks/set-state-in-effect` errors in SidebarNav and three existing unused-variable warnings in navigation.ts. The two SidebarNav errors were reproduced against its unchanged baseline source; unrelated badge behavior was preserved.
- `git diff --check`: passed.

Outstanding validation: live ABR credentials/provider integration, authenticated browser interactions, and separately authorised legacy-data inventory/reconciliation in an isolated environment. The relationship selectors currently load up to 200 CRM companies and contacts; larger books need search/pagination in a subsequent UI pass. No Production readiness claim is made.

## Files created

- `docs/unified-acquisition-phase1.md`
- `packages/database/prisma/migrations/20261020090000_unified_acquisition_identity/migration.sql`
- `packages/platform-core/src/prospecting-engine/identity.ts`
- `packages/platform-core/src/prospecting-engine/lifecycle.ts`
- `packages/platform-core/src/prospecting-engine/relationship-linking.ts`
- `scripts/fixtures/unified-acquisition-legacy.sql`
- `scripts/run-unified-acquisition-local-db.mjs`
- `scripts/test-unified-acquisition-local-db.mjs`
- `src/app/(shell)/apps/prospecting/overview/page.tsx`
- `src/app/api/v1/prospecting/prospects/[id]/identity/route.ts`
- `src/app/api/v1/prospecting/prospects/[id]/relationships/route.ts`
- `src/components/prospecting/ProspectRelationshipForm.tsx`
- `src/components/prospecting/ProspectingOverview.tsx`
