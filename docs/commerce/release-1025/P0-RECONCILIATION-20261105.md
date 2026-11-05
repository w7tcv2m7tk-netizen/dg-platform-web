# P0 release reconciliation — 5 November 2026

Owner scope: local integration, independently reviewed real-defect corrections,
credential-free/disposable validation, suppressed draft publication and exact-head
CI. Production merge/deployment, migrations, role grants, Live provider writes,
admissions and checkout activation remain separately approval-gated.
Requirements: `platform.auth`, `detach.portal_billing`, `crm.companies`,
`platform.roadmap`. Approved commercial sources remain Pricing/Packaging and the
Commercial Model; live Business Brain was unavailable and not accessed.

## Provenance

Live main was verified at `8d639743352b9e980afb7e156fc9ac9cff1308b2`.
Preserved checkout base: `d747148f582441f3e456257e606ae6bb3c5dd47f` (#1036).
New local branch: `integration/p0-release-reconciliation-20261105`.
The reported `c025378d50661b3befe825cddd4632d34b5b8c00` could not be recovered
from the checked local Git stores or GitHub. Its original history is not fabricated,
reconstructed or certified. This candidate explicitly continues the accessible,
previously published consolidation; original worktrees and PRs are retained.
Some local remote-tracking refs differ across independent Git stores. Live GitHub
metadata, not those cached refs, established main and the ten open PR heads.

## All ten open PRs — source inspected, no blind merges

- #1006 `978ad16a`: **B — incorporated/superseded**. The only non-merge
  commit unique to its tip adds historical Roadmap evidence. Main already contains
  its implemented coordinator ancestor; later candidate guards supersede old code.
- #1015 `9c313a7f`: **C — superseded**. Exact-path unpaid saves, ordered queue,
  expired checkout return and stronger canonical completion guards are present.
  One missing historical external UI harness pins an obsolete source and weaker
  environment checks; it is retained in Git history, not copied into this release.
- #1026 `e83e572d`: **D — defer/revise proposed handoff docs**. Two documentation
  files only; old source, migration count and assumed AIM basket are not authority.
- #1028 `f1e199de`: **A — required admission component, already included** by
  exact ancestry. Approved migration checksum remains unchanged; publication does
  not authorise schema reapplication or admission issuance.
- #1029 `f07ba2a7`: **A — required restricted-runtime tooling, included**.
  Subsequent column/PUBLIC/ownership repairs remain, with no grant expansion.
- #1032 `e10b2475`: **A — security integration, included** with later corrections.
- #1033 `fc7b7c44`: **C — superseded** by included reconciled onboarding repair;
  the expired/unpaid-return test is preserved. Do not merge overlapping UI twice.
- #1035 `5230ad92`: **A — included security dependency stack**. Its optional
  runtime identity diagnostic remains disabled; control-store provisioning is
  required only to enable that diagnostic and is not silently a checkout release
  prerequisite. Actual serving runtime identity remains an operational requirement.
- #1036 `d747148f`: **A — accessible consolidated source**, retained in full.
- #1037 `4928b8ea`: **B — exact certified commercial safeguards already merged**
  into the source by normal local history; pricing/line-item rules are unchanged.

All existing PRs remain open/preserved. Closure, retargeting or merge requires
owner approval. Seven recent component PRs have passing checks; #1006/#1015/#1026
have no current checks in the retrieved inventory. Old green checks certify their
own heads only. This branch requires new exact-head commercial/checkout CI.

## Independently confirmed defects corrected

1. First/additional-business creation now serialises actor requests and performs
   count, canonical authority and nested creation in one bounded transaction.
   Parent/membership locks coordinate with cancellation and membership revocation.
2. Historical Scale/Enterprise tiers alone cannot authorise additional business:
   current canonical status, activation entitlement, provider/customer ownership
   and applicable unexpired period are required. Canonical exemptions remain
   supported; mutable settings are never authority.
3. Enterprise's explicit null capacity remains null, not the old fallback of one.
4. First-business HTTP writes require exact trusted Origin, JSON, a session token,
   no API-key principal and matching Clerk auth/current-user identity.

Legacy-demo member recovery remains possible; renaming an owned tenant cannot
remove it from capacity. Core-only Scale does not require purchased add-ons.
No app migration, role creation, privilege expansion or pricing change is included.

## Validation and independent review

Fresh local source checks: release682; commercial57; safeguards44 (actual builder
matrix24); security128; compatibility171; coordinator44; permissions56; durable
control33 and shared-client7 groups; TypeScript, changed-code lint, Prisma/schema
compatibility and full `npm run build` including prebuild and457 pages passed.
Disposable compatibility's existing256 checks passed; the final targeted business
suite18 passed (including real concurrency, nested rollback, cancellation locks,
legacy recovery and non-owner execution under unchanged grants). These overlapping
counts must not be added as unique requirements or hosted acceptance.

Initial integration failures were retained and corrected: old closed-import tests
needed creation-only imports deferred; static SQL scanners correctly rejected an
ambiguous FROM-function/CREATE-prefix shape, so the SQL shape was changed without
weakening scanners; obsolete literal business-limit assertions now test canonical
limits and real factory enforcement. Prisma validation initially lacked a local
configuration URL; a synthetic loopback URL is sufficient for schema validation,
without making a database connection.

A separate read-only reviewer reproduced four original defects and accepted the
final narrow patch after independently running36 focused tests, manifest83 tables/
1 sequence/5 functions and whitespace checks. This is independent source review,
not Production approval or a claim that the reviewer reran all larger suites.

## Acceptance and operational gates

Starter and Growth hosted sandbox payment/provisioning evidence belongs to the
unchanged billing source at d747 and is preserved; prior external harness false
STOPs are recorded, not described as application cancellation failures. The new
first-business route needs real authenticated acceptance on this revision. Scale
and full hosted package/add-on/lifecycle coverage remain explicit gates until
actual evidence is attached; no completion is inferred from tests or constants.
AIM and My Venue Clean choose their own package through existing onboarding.

Actor-owned capacity is NOT proof of account-wide shared subscription licensing
or unique-user accounting across businesses. The schema lacks an explicit shared
subscription-account relationship. Do not represent secondary independent unpaid
tenants as licensed by another tenant or claim full account-wide capacity acceptance.

Read-only provider metadata shows the existing Production source remains main,
not this candidate. Current ledger, gate/hold/drain, admissions, exemptions and
actual serving role/credential bindings still require attended, separately bounded
read-only verification. Recovery requirements remain unverified: six-hour history
is not seven-day lookback, and provider ADMIN/snapshot availability does not prove
15-minute RPO or two-hour RTO. No recovery or infrastructure mutation is authorised.

## Publication boundary

The exact branch has `deploymentEnabled:false` in its first candidate tree; all
prior suppression rules remain. Git deployment suppression is independent of
branch protection and cannot prevent manual CLI/API deployment. Fresh Vercel Git
settings evidence and unchanged remote heads must be verified before push.
Both workflows check out exact event head; neither deploys or injects Production
credentials. Publish a draft only, without force. Hosted CI and no-deployment
checks are mandatory; main/Production remain HOLD.
