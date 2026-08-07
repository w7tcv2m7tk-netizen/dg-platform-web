# App Marketplace Architecture

**Design every App as installable, licensable, and removable — even before third parties**

The marketplace may not launch until Platform 3.0 / **Roadmap Phase 5**, but **App architecture must support it from Platform 1.0**.

Phase 5 expands Marketplace beyond Apps into **services, software, and opportunities**, alongside Community — see [NETWORK-LAYER.md](./NETWORK-LAYER.md). Reviews and **Business** Referrals connect to that flywheel later — [REVIEWS-AND-REFERRALS.md](./REVIEWS-AND-REFERRALS.md) §§B–C. **Platform Refer & Earn** (SaaS acquisition) is Core/Billing — §A of the same doc. This file remains the contract for **installable Apps**.

---

## App lifecycle

```
Discover → Install → Configure → Use → Update → Disable → Uninstall
```

Each transition is auditable and reflected in `AppInstallation` records.

---

## App manifest contract

Every App (built-in or third-party) declares via manifest:

| Field | Purpose |
|-------|---------|
| `id` | Unique slug e.g. `real-estate` |
| `version` | Semver — App release |
| `minPlatformVersion` | e.g. `1.0.0` |
| `tier` | `core` \| `business` \| `growth` \| `internal` |
| `visibility` | `customer` \| `internal` |
| `features[]` | Feature Registry IDs for licensing |
| `entities[]` | Universal Objects used |
| `permissions[]` | RBAC within App |
| `pricing` | (future) SKU, trial days, metered features |

**Code:** `packages/platform-core/src/apps/manifest.ts`

---

## Installation model

```typescript
AppInstallation {
  organisationId
  appId
  version          // pinned at install
  enabled          // soft disable without uninstall
  settings         // JSON — App-specific config
  installedAt
  installedBy
  licenseId?       // Stripe subscription item
  trialEndsAt?
}
```

### Rules

1. **One installation per org per appId** — upgrades change `version`, not duplicate rows  
2. **Disable ≠ uninstall** — disabled Apps hide nav but retain data  
3. **Uninstall** — soft: mark uninstalled, retain data 90 days; hard: after retention + export confirmation  
4. **Dependencies** — manifest may declare `requires: ["crm"]` — install blocked until dependency satisfied  

---

## Licensing integration

| Model | Implementation |
|-------|----------------|
| Included in plan | Plan template grants feature IDs |
| Add-on App | Stripe subscription item → `AppInstallation.licenseId` |
| Trial | `trialEndsAt` → auto-disable or prompt upgrade |
| Metered (AI) | Usage recorded → billing meter (Platform 1.5+) |
| Enterprise | Custom feature set via `featureOverrides` on org |

See [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md).

---

## Updates

| Update type | Behaviour |
|-------------|-----------|
| **Patch** (1.0.1) | Auto-apply; backward compatible |
| **Minor** (1.1.0) | Notify admin; optional auto-update per org setting |
| **Major** (2.0.0) | Requires explicit upgrade; migration script if schema extensions |

Platform validates manifest against `minPlatformVersion` before enabling.

---

## Third-party Apps (Platform 3.0)

| Requirement | Detail |
|-------------|--------|
| Manifest validation | CI checks schema, feature IDs, entity usage |
| Sandboxed API access | Platform API only — no direct DB |
| Review process | Security + UX review before listing |
| Revenue share | Configurable % on App subscription |
| Publisher account | Organisation type `publisher` |
| SDK | `@dg/app-sdk` — types, API client, event helpers |

Built-in Apps (CRM, RE) are reference implementations.

---

## Internal Apps

`visibility: internal` Apps (Command Centre) are:

- Pre-installed for DigitalGate staff org only  
- Never listed in customer marketplace  
- Same manifest contract for consistency  

---

## Marketplace UI (future)

| Surface | Audience |
|---------|----------|
| `/dashboard/apps` | Browse, install, configure (today: scaffold) |
| Publisher portal | Submit, version, analytics |
| Command Centre | Installations across tenants, revenue by App |

---

## Scalability checklist

- [ ] App install/uninstall O(1) per org — no full table scans  
- [ ] Feature checks cached per session — not per request DB hit  
- [ ] App settings JSON schema validated per App  
- [ ] Uninstall does not cascade-delete Universal Objects owned by other Apps  

---

## Related

- [ADR 0007](../adr/0007-feature-registry-permissions.md) — Feature Registry  
- [PLATFORM-RELEASES.md](./PLATFORM-RELEASES.md) — when marketplace ships  
