# Build investigation recorded before application edits

HEAD: 13205f181e274e155ac9a94c8a50c1f1df7d4517; Next.js 16.2.12.
Unchanged-HEAD credential-free Webpack baseline exit 1; full log retained in
991-BUILD-BASELINE-FAILURE.log. Error: UnhandledSchemeError for five Node APIs.

Complete reported import traces (read client-to-server):

1. EnabledAppsProvider.tsx -> platform-core/src/index.ts -> api-keys/index.ts -> node:crypto
2. EnabledAppsProvider.tsx -> platform-core/src/index.ts -> accommodation/ical-import.ts -> command-centre/growth-engine/ssrf-guard.ts -> node:dns/promises
3. EnabledAppsProvider.tsx -> platform-core/src/index.ts -> documents-signing/index.ts -> documents-signing/knowledge-ingestion.ts -> node:fs/promises
4. EnabledAppsProvider.tsx -> platform-core/src/index.ts -> accommodation/ical-import.ts -> command-centre/growth-engine/ssrf-guard.ts -> node:net
5. EnabledAppsProvider.tsx -> platform-core/src/index.ts -> documents-signing/index.ts -> documents-signing/knowledge-ingestion.ts -> node:path

Cause: the provider's runtime named imports use the mixed root barrel
@dg/platform-core. Export-star traversal exposes unrelated server modules within
a use-client module graph. No individual browser helper needs the Node APIs above.
Type-only imports are erased and are not the cause.

Smallest existing modules for the exact imports:
- appIdsFromPlanSelection, getDefaultEnabledAppIds, PlanSelectionInput: apps/org-apps
- buildAccessContext: access/evaluate
- filterNavigationByAccess: access/nav-filter
- getCategorizedPlatformNavigation, getPartnerWorkspaceShellLinks: apps/navigation
- PartnerType (type-only): partners/types

Read installed Next server-and-client-components guidance and Turbopack guidance
before edits; apply direct imports, not shims/externals/error suppression.
