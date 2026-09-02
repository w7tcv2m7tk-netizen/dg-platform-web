# Organisation lifecycle & tenancy invariant

**Canonical tenancy rule for DigitalGate. Locked.**

> **Authentication establishes identity.**
> **Membership establishes tenant context.**
> **Explicit onboarding creates a tenant.**

These three sentences are the architectural invariant. Every auth/session/routing path
must uphold them. A Clerk identity with no membership is a **valid, memberless state** —
it is never silently turned into a tenant.

## Why this exists

A `user.created` webhook that called `provisionOrganisation()` (and, earlier, a session
resolver that auto-provisioned) meant any new or mismatched Clerk identity silently
received a fresh organisation (e.g. "Ben's Organisation", `wantd-1`, `wantd-2`). That is a
tenancy-integrity failure: identity was being conflated with tenancy. Implicit
provisioning has been removed; this document + its regression tests keep it removed.

## The only intentional organisation-creation boundaries

Organisations are created **exclusively** through these paths. This allowlist is enforced
by `scripts/test-organisation-lifecycle.mjs` — introducing a new `prisma.organisation.create`
anywhere else fails the build.

| Boundary | Location | Trigger |
|---|---|---|
| `createOrganisationForUser` | `packages/platform-core/src/org/memberships.ts` | Explicit `POST /api/v1/org/create` (user-initiated onboarding / multi-business creation) |
| `createClientOrganisation` | `packages/platform-core/src/org/client-org.ts` | Operator-only Growth Engine prospect → client conversion (requires `PlatformOperatorContext`, C-3) |
| `ensureWantdOrganisation` | `packages/platform-core/src/wantd/org.ts` | Manual admin script `scripts/ensure-wantd-org.mjs` — provisions the singleton Wantd marketplace org |
| demo seed | `packages/platform-core/src/demo/seed.ts` | Demo/seed tooling only |

## Paths that must NEVER create an organisation

- Clerk authentication / `user.created` webhook
- Session resolution (`resolveActivePlatformSession`, `packages/platform-core/src/session`)
- Middleware
- Dashboard / page loading
- Sign-up
- Onboarding (it configures an already-created tenant; it does not implicitly create one)
- Team-invite claiming when there is **no** invitation
- Any "user synchronisation" or normal login/refresh

Team invitations are the one nuance: `claimTeamInvitesForUser` **activates an existing
invited membership** in an **existing** organisation. It never creates an organisation; with
no pending invite and no `organisationId`, it returns `null` and creates nothing.

## Organisation-resolution lifecycle (A–G)

| # | Scenario | Expected behaviour |
|---|---|---|
| A | Existing user + existing membership | Resolve the correct organisation |
| B | Existing user + multiple memberships | Resolve the intended default organisation |
| C | Existing user + valid active-org selection (`dg_active_org`) | Honour the selected organisation |
| D | New user + valid invitation | Activate the existing invited membership (no org creation) |
| E | New user + **no** invitation + **no** membership | **Do not create an organisation.** Enter explicit onboarding / memberless state |
| F | Explicit "Create Organisation" | Create an organisation intentionally (`createOrganisationForUser`) |
| G | Operator prospect → client conversion | Create the client organisation intentionally (`createClientOrganisation`, operator-gated) |

`dg_active_org` is a **browser cookie** (`src/lib/active-org-cookie.ts`), not a database
value. An active-org pointing at an organisation the identity is not a member of must be
ignored, never "fixed" by creating an organisation.

## Regression protection

`scripts/test-organisation-lifecycle.mjs` (run by `npm run test:unit`) permanently asserts:

1. The **only** `prisma.organisation.create` sites are the four allowlisted files above.
2. `provisionOrganisation` does not exist anywhere in the tree.
3. Authentication / session / middleware / signup / onboarding / invite-claim paths contain
   no organisation-creation calls.
4. `claimTeamInvitesForUser` with no invite + no organisationId returns `null` (creates nothing).

If a change reintroduces implicit provisioning, these tests fail.

See also: `docs/foundations/ENVIRONMENT-PARITY.md`, `.cursor/rules/organisation-lifecycle.mdc`.
