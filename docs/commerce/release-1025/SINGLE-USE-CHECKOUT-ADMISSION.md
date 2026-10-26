# Single-use checkout admission — local candidate, 27 October 2026

Requirement: existing P0 `platform.auth` / `detach.portal_billing` commercial launch.
Owner authorised local implementation and synthetic testing only. No Live grant,
session, migration, deployment, invitation or global gate opening is authorised.

## Boundary

The singleton remains `blocked=true`. An operator-issued row in
`platform_checkout_admissions` can authorise precisely one durable coordinator
attempt, for one canonical organisation and active Clerk membership, exact
commercial terms and Stripe account/mode/API version. Neither HTTP route accepts
an admission ID or actor from request JSON: the actor comes from the authenticated
session, with existing billing-manage checks retained. There is no grant/revoke API.
Missing tables, row, actor, membership, evidence, lock or configuration deny access.
While globally blocked, both creation and returning/resuming OPEN sessions require
a valid permit already bound to the same attempt. No unscoped reservation fallback
exists. Open-gate, no-permit behaviour remains available when separately approved.
An active subscription webhook hold also denies scoped admission.

Terms bind the actual server-generated selection, resolved Price/Product amounts,
currency, cadence, quantities, trial, apps, custom-offer identity/version, setup
charges, tax and other commercial settings. Standard seats derive from the
canonical plan catalogue; custom seats derive from accepted offer metadata.
Variable promotional/adaptive pricing is rejected for scoped permits. Contact
email, business label, return URL, locale and immutable request expiry are not
commercial authority. Changing selection requires a new operator review and permit;
Nathan may change his choice before that review. No provisional choice is imposed.

`prepareStandardCheckoutAdmission` uses the same real standard builder, with
provider reads only, to prepare reviewable terms/hash. It creates no attempt,
session, permit or customer. It is an internal server function, not an HTTP API.
Preparing against Live requires separate provider-read approval and safe operator
secret injection. Custom permits must use the exact accepted canonical offer and
same resolver; missing/unsupported seat or price evidence fails closed.

## Durable attempt and concurrency

The existing organisation lock, attempt slot, lease token, immutable request,
provider scope and idempotency key remain the only creation mechanism. Gate and
permit decisions/binding share the coordinator's short transaction. Lock timeout
is 1 second, SQL statement timeout 3 seconds, Prisma pool acquisition maxWait
1 second and interactive transaction timeout 5 seconds. No Stripe I/O occurs
inside these transactions. Database clock enforces permit expiry.

A permit's attempt binding can never be cleared/reassigned. It cannot adopt an
already-submitted/session-bearing historical attempt, nor bypass legacy session
inventory. Persisted commercial parameters must match the newly requested approved
parameters before binding/replay. An expired/retired attempt cannot spend the same
permit again. Unknown provider outcomes preserve the original request/key for
same-attempt recovery; they never authorise a replacement session.

After Stripe I/O, scoped authority is checked again before returning a link.
Expiry/revocation denies late success, while the durable attempt records any
issued session. Revocation DOES NOT cancel an in-flight Stripe request or revoke
an already-issued link. Separately approved provider expiration/recovery may be
required. The existing immutable absolute session expiry/admission horizon bounds
late sends; no fabricated cancellation guarantee is made.

## Approval and audit records

New additive migration: `20261027_single_use_checkout_admission`.
It creates two empty tables, unique active-organisation/attempt indexes,
a composite (attempt_id,organisation_id) foreign key to the matching checkout
attempt, immutable-authority/revocation checks, and append-only audit triggers.
The composite FK rejects nonexistent attempts, cross-tenant binding and moving or
deleting a bound attempt. Approval and audit TRUNCATE are explicitly rejected. It updates
no existing organisation, subscription, entitlement, webhook receipt or gate row.
Approval evidence includes operator/reference, immutable terms/hash and expiry.
Audit captures grant, attempt binding, revocation actor/reference and timestamps.
Issued session IDs remain on the linked durable attempt. The ordinary app must never create/update grant authority. The separately approved
`scripts/sql/checkout-admission-runtime-privileges.sql` grants an EXISTING non-owner,
non-superuser/non-CREATEROLE runtime role SELECT and UPDATE(attempt_id) only on
new authority tables, plus SELECT and UPDATE(last_admission_expires_at) on the
global gate. All other gate mutation is rejected. The runtime has no grant/revoke, audit INSERT/UPDATE/DELETE,
TRUNCATE, trigger-disable or ownership capability. The fixed-search-path security-
definer trigger writes audit records without granting audit-write rights to the
application. Existing unrelated platform permissions are not granted by this file.
The script fails on unknown/privileged/owner/inherited-owner roles or unexpected
mutation rights, rather than silently changing an existing unsafe policy. Its
check covers the conservative full role-membership closure, including NOINHERIT
SET-ROLE paths. Explicit/inherited EXECUTE on the audit SECURITY DEFINER function,
TRIGGER on protected tables, and INSERT/DELETE/TRUNCATE or control-column UPDATE
on the global gate also cause STOP. A leaf-role-only check is not sufficient.
Keep migration/approval credentials separate and private. Runtime ownership of
these tables is NOT an acceptable production configuration. Current Production
role identity/privileges have not been inspected or changed in this local task;
confirm non-owner suitability or obtain separate role/credential remediation
approval BEFORE deploying admission-capable code or issuing a permit.
No customer-facing issuance control is added. Privileged DB administrators remain
trusted; triggers are not a defence against an administrator disabling them.

## Proposed controlled release — separate approvals at every Production write

1. Independent review and exact-head validation; approve publication separately.
   Keep release-branch auto deployment suppressed before any future push.
2. Fresh read-only Production identity, ledger/catalog, recovery point/RPO,
   current serving source and runtime database checks. Review the exact pending
   migration set; do not run an unchecked blanket migrate deploy.
3. Approve the single additive migration separately. Apply once with bounded lock
   and statement timeouts. Verify tables, checks, unique indexes and trigger
   definitions, FK and TRUNCATE denial; zero permits/audit rows; existing gate/subscription/exemption and
   receipt state unchanged. Record ledger hash/count. Uncertain completion: STOP,
   inspect read-only, no retry or ledger fabrication.
   The new SQL file owns BEGIN/COMMIT, lock_timeout=3s, statement_timeout=10s;
   do not nest it in a second transaction wrapper. The disposable rehearsal
   verifies rollback of every owned object after mid-DDL failure, disconnect and
   lock timeout, then an explicitly verified retry. A duplicate committed apply
   stops. Do not assume this SQL rehearsal certifies Prisma's failed migration
   ledger recovery: inspect ledger/catalog and separately approve any supported
   `migrate resolve --rolled-back` before an operator retry.
   Separately approve/apply the runtime-privilege file for the exact reviewed
   non-owner runtime role. Verify allowed and denied operations and the actual
   deployed connection's current_user/role memberships; never copy a secret into
   logs or shell arguments. Local role tests do not establish Production parity.
4. Separately approve deployment of the reviewed candidate with checkout still
   globally blocked and no permit issued. Verify routing across all aliases,
   configuration, current credentials and baseline safety before issuance.
5. Before a pilot, inventory ALL existing issued/open/uncertain platform sessions,
   active attempt leases and admission horizons using the certified inventory.
   The corrected application will not return an unscoped OPEN session while the
   gate is blocked. Previously issued/direct Stripe URLs nevertheless remain
   reachable independently of DigitalGate; deployment overlap can also include
   old code until its execution bound expires. The permit revokes neither. Any
   potentially reachable session outside the authorised customer is a pilot
   blocker until separately approved containment is verified.
6. Verify the named customer's canonical organisation, authenticated Clerk user,
   active membership/billing authority, saved progress and latest self-selected
   configuration. Prepare the read-only plan from that exact selection; review
   every line and trial date. Confirm Live account and all 12 event subscriptions,
   signed-delivery observability and a named owner/operator at the console.
7. Obtain approval for ONE grant: immutable organisation/user/provider/terms/hash,
   explicit short expiry, approvedBy and approvalReference. In a private parameterised
   transaction: BEGIN; local statement_timeout 10s, lock_timeout 3s; lock gate id=1
   FOR UPDATE; assert blocked=true, hold=false and freshly reviewed revision;
   verify current active membership and no prior submitted/legacy/uncertain
   attempt or active permit; INSERT exactly one permit with attempt_id NULL and
   active_organisation_id=organisation_id; verify one audit INSERT and unchanged
   global gate; COMMIT. No credentials/JSON interpolation in shell arguments.
   The exact operator runner/approval record is a later reviewed execution artifact.
8. Separately authorise customer contact and ONE monitored standard checkout.
   The runtime atomically binds the permit to the existing coordinator attempt.
   Track permit ID -> attempt ID -> exact Stripe session/event/receipt/subscription.
   Confirm published selected amount, seat limit and 14-day standard trial before
   customer confirmation. Any selection change invalidates the existing approval.
9. Correlate signed Live delivery, HTTP response, processed receipt, canonical
   subscription, exact paid apps, onboarding progress and dashboard access.
   Monitor per-attempt results; never open the global gate as a convenience.
10. On mismatch, stop customer activity. Revoke only with separate approval by a
    bounded CAS on exact permit ID/termsHash/attemptId, setting revoked_at,
    revoked_by, revocation_reference and active_organisation_id=NULL; verify audit
    and gate unchanged. Inventory already-issued/uncertain sessions and obtain
    separate approval for exact session expiration/recovery. Do not create another
    attempt, charge, entitlement, refund or subscription as an automatic remedy.

Global gate transition: NONE. It stays blocked throughout. The permit INSERT and
revocation UPDATE are the narrowly scoped future writes, not a global opening.

## Rollback and stop conditions

Stop on identity/hash/actor/terms mismatch, active webhook hold, stale revision,
unexpected permit/attempt/session, lock timeout, uncertain provider outcome,
missing observability or unrelated issued session. No automatic retry of operator
writes. Runtime same-key recovery is distinguished from operator write retries.
No implicit hold activation/release or additional Stripe selections are authorised.

Keep the additive schema and audit history on application rollback. Prior certified code sees the global block and cannot use new permits to create
sessions, but CAN resume existing unscoped OPEN sessions. Thus rolling back to it
weakens the new resumption restriction; a claimed one-customer pilot cannot
continue across that rollback. Therefore containment/revocation and session
inventory precede any separately approved rollback. Never remove audit evidence or
restore older customer-editable purchase authority. A DB snapshot restore is a
separate, last-resort operation with post-snapshot write loss and protected-branch
limitations; no automatic restore is proposed.

## Local evidence

Synthetic PostgreSQL only; Stripe is mocked, no external provider calls or actual
customers. Provisional synthetic fixture uses A$947/month, five users, 14 days;
this is not a Live offer, admission, customer configuration change or Price update.
A real standard builder fixture separately verifies canonical Growth seats=5,
Growth + Finance A$398/month and 14-day trial without changing catalogue pricing.
See the local validation report for final counts, failures corrected and review.


## Final local remediation, 27 October 2026

This revision supersedes the earlier documented allowance for unscoped closed-gate
resumption. No direct Stripe link is claimed revoked. New migration constraints,
restricted-runtime proof and atomic failure rehearsal are covered in
[SINGLE-USE-CHECKOUT-ADMISSION-REMEDIATION.md](SINGLE-USE-CHECKOUT-ADMISSION-REMEDIATION.md).
Branch `fix/single-use-checkout-admission-20261027` is explicitly suppressed in
vercel.json, preserving all existing rules and Production main behaviour. That
suppression must be in the first future commit pushed; publication still requires
owner approval and confirmation of the existing first-push suppression mechanism.
