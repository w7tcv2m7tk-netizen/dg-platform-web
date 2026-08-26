# Roles, Permissions & Side Panel (canonical Gen 2)

**Status:** Locked · Platform Architect (Ben) · August 2026  
**Code:** `packages/platform-core/src/access/` · `packages/platform-core/src/apps/navigation.ts` · `packages/platform-core/src/industry/platform.ts`  
**Related:** [INDUSTRY-PLATFORM.md](./INDUSTRY-PLATFORM.md) · [APP-HIERARCHY.md](./APP-HIERARCHY.md) · [COMMERCIAL-MODEL.md](./COMMERCIAL-MODEL.md) · Partners ecosystem docs

---

## Core principle

DigitalGate is a multi-tenant Business Operating Platform.

```
Organisation → Subscription → Apps → Role → Permissions
```

Industry Apps do **not** create separate platforms. They activate Templates and workflows on the same Core.

The UI adapts by: **who** the user is · **which organisation** · **subscription** · **activated Apps** · **permissions**.

**Security:** Permissions are enforced at the **API / data layer**. Hiding a nav item is UI only — not security.

---

## Access chain (side panel)

```
User → Organisation → Role → Permissions → Subscription → Activated Apps → Industry → Template
```

Do **not** hard-code one universal side panel for every user.

**Operator UX:** Side panel IA supports discovery; the primary product experience is outcome-based (Overview · Priorities · Opportunities · AI Advisor · Apps). See [OPERATOR-EXPERIENCE.md](./OPERATOR-EXPERIENCE.md) — Operator vs Administrator mode, Simple → Advanced, “Why am I seeing this?”

---

## Platform user types (DigitalGate internal)

| Role | Scope | Notes |
|------|-------|-------|
| **DigitalGate Owner** | Platform-level | Not merely Organisation Owner. Full platform admin, customers (authorised), partners, billing, flags, audit, roadmap. |
| **DigitalGate Admin** | Elevated staff | Command Centre, Founding, Prospecting, Partners, Delivery, docs, assigned customers. Not unrestricted owner/financial/security unless granted. |
| **DigitalGate Member / Staff** | Operational | Assigned prospects/customers/delivery, CRM, tasks, support, docs. No default global billing, commissions config, API, org deletion, global settings. |

Staff role claim today: `dg:staff` (Command Centre). Owner/Admin/Member refinement lands on membership + permission grants.

---

## Customer organisation roles

| Role | Default | Must not (by default) |
|------|---------|------------------------|
| **Organisation Owner** | Full org: profile, users, roles, billing, subscriptions, Apps, connectors, all enabled Apps, Twin, Goals, Brain, reports, security | Platform-wide DigitalGate admin |
| **Organisation Admin** | Operational: Overview, Profile, Twin, Goals, Team, CRM, Commerce, Design Studio, Infrastructure, Industry Apps, Growth, Intelligence, Reports | Transfer ownership, delete org, platform admin, some billing/security without grant |
| **Organisation Member** | Operational on assigned records: CRM, tasks, calendar, Industry records, relevant reports | Billing, user admin, subscriptions, org-wide financials, platform admin, others’ private data unless permitted |

Roles set **defaults**. Granular overrides are required.

---

## Granular permissions (required model)

| Dimension | Examples |
|-----------|----------|
| **Action** | View · Create · Edit · Delete · Export · Manage · Approve · Assign |
| **Module** | CRM |
| **Sub-module** | CRM → Opportunities |
| **Scope** | Own · Assigned · Team · Organisation-wide |

Custom job titles (Salesperson, Sales Manager, Accountant, …) are **permission sets**, not dozens of hard-coded roles.

---

## Customer side panel (canonical)

**Full lock:** [SIDEBAR-NAVIGATION.md](./SIDEBAR-NAVIGATION.md)

Order (locked):

```
DIGITALGATE (staff only — Platform Operator)
├── Command Centre · Sales · Partners · Delivery · …
CORE — run the business
│   Business · CRM · Communications · Documents · Commerce · Design Studio · Infrastructure · Intelligence
INDUSTRY          ← activated Apps/Templates only
GROWTH
PLATFORM          ← Apps · Marketplace · Network · Settings
```

### CORE
Business · CRM · Communications · Documents · Commerce · Design Studio · Infrastructure · Intelligence  
(Intelligence → Overview is primary; Health / Insights / Advisor / Reports unlock from the hub.)

### INDUSTRY
Only when an Industry App is activated. **Industry App ≠ Template.** One Industry App ($99) → one Template included; additional Templates +$29.  
Do not show the full Industry catalogue to every customer.

### GROWTH
Prospecting · AI Visibility · SEO · Automation · Analytics · Social · Reputation  
(AI Communications nests under Core Communications — not a Growth sidebar app.)

### PLATFORM
Apps · Marketplace · Network · Settings (Overview · Billing · Connectors · API · Audit Log) · Support  

Platform Docs = DIGITALGATE staff only (trailing link under Platform Operator), not customer Platform. Roadmap = Product (staff). See [KNOWLEDGE-LAYERS.md](./KNOWLEDGE-LAYERS.md).

---

## Twelve Industry Apps

See [INDUSTRY-PLATFORM.md](./INDUSTRY-PLATFORM.md). Summary:

Property · Hospitality & Accommodation · Services · Finance · Professional · Health & Wellness · Automotive · Retail & Commerce · Creator & Media · Transport & Logistics · Agriculture & Primary · Education & Organisations  

**Accommodation** → Hospitality & Accommodation (not Property). Preserve CVH functionality during taxonomy migration.

**Finance → Accounting** for accountants. **Professional → Legal / Surveying** for lawyers / surveyors. Do not invent Legal App or Accounting App as top-level Industries.

---

## Partners (separate experiences)

| Partner | Responsibility | Default customer admin access |
|---------|----------------|-------------------------------|
| **Reseller** | Introduce / refer / commercial assist | **No** — no CRM, billing, Brain, documents |
| **Delivery / Implementation Partner** | Configure & onboard | Assigned customers/projects only |
| **Success / Support Partner** | Adoption after go-live | Separately granted |

A party may hold multiple partner capabilities — each independently permissioned.

### Delivery side panel (approx.)
Delivery · Customer setup · Communication · Knowledge  

### Reseller side panel (approx.)
Dashboard · Performance · Prospects · Referrals · Customers · Commissions · Resources · Support  

DigitalGate staff **Partners** section: Resellers · Referrals · Commissions · Delivery/Implementation.

---

## Pricing architecture (commercial lock)

| Layer | Model |
|-------|--------|
| **Platform** | Starter $99 · Growth $249 · Scale $499 · Enterprise custom |
| **Industry App** | +$99/mo — major vertical capability (commercial boundary) |
| **Industry Template** | 1 included with each Industry App · **+$29/mo** each additional |
| **Growth Apps** | Optional · billed separately: Prospecting & Opportunity Engine **$99** · AI Visibility **$99** · SEO **$99** · Automation **$49** · Analytics **$49** · Social **$79** · AI Communications **$99** · Reputation **Free** |
| **Founding** | 30% off qualifying Platform + Industry Apps + additional Templates at onboarding for 24 months (independent of reseller commission) |
| **Professional Services** | Optional people work — never required |
| **Customer Success** | Standard included · Priority $199 · Success Partner $499 · Enterprise custom |

Do **not** sell Templates as separate Industry Apps at $99. The Industry App is the commercial boundary; Templates are the expansion layer.

---

## Feature lifecycle (Apps & Templates)

Planned · Architecture Reserved · Coming Soon · Developing · Early Access · Founding · Available · Deprecated  

Side panel exposes only appropriate readiness. Routes alone do not justify nav exposure.

---

## Final implementation rule

```
One Core → Industry Apps → Templates → Permissions → User experience
```

Do **not** create separate platforms per industry.  
Do **not** create a top-level App for every business type.  
Do **not** hard-code a role for every job title.

---

## Implementation status

| Layer | Status |
|-------|--------|
| Locked docs + types | Done — `access/roles.ts`, this document |
| Role defaults + evaluator | Done — `access/defaults.ts`, `access/evaluate.ts` |
| DB role bridge (`owner`/`admin`/`member`) | Done — `access/membership-role.ts` |
| Membership `permissions` JSON grants | Done — schema + migration |
| Side panel filter by role | Done — `access/nav-filter.ts` → `EnabledAppsProvider` |
| API `requirePermission` / feature bridge | Done — `src/lib/platform-api.ts`, `features/access.ts` |
| Team role assign (Admin/Member) | Done — Team settings + `PATCH /api/v1/org/team` |
| Record-scope enforcement (own/assigned) on every CRM query | Progressive — use `assignedUserId` filters where APIs already support; expand per module |
| Custom named roles (Salesperson, …) | Architecture ready via grants — UI for grant editor next |

---

## Code map

| Surface | Path |
|---------|------|
| Roles / permission model | `packages/platform-core/src/access/` |
| Side panel IA | `packages/platform-core/src/apps/navigation.ts` |
| Industry map | `packages/platform-core/src/industry/platform.ts` |
| Delivery / reseller nav | `packages/platform-core/src/partners/delivery-workspace.ts` |
| Command Centre access | `packages/platform-core/src/command-centre/access.ts` |
| API guards | `src/lib/platform-api.ts` → `requirePermission` / `requireFeature` |
| Team roles UI | `src/components/platform/TeamRoleSelect.tsx` |

