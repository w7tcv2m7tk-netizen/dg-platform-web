# Core Object Specification

**The single most important architectural decision**

Every App uses these objects. Changing definitions after Platform 1.0 is expensive — treat this document as the contract.

**Version:** 1.0 (Platform 1.0 — Foundation)  
**Status:** Draft for review before Postgres schema finalisation

See also: [OBJECT-MODEL.md](../catalogues/OBJECT-MODEL.md), [EVENT-CATALOGUE.md](../catalogues/EVENT-CATALOGUE.md)

---

## Global rules

| Rule | Detail |
|------|--------|
| **Tenant scope** | Every object (except Platform-global config) has `organisationId` |
| **Ownership** | One **owning context** writes canonical state; others consume via API/events |
| **IDs** | `cuid()` primary keys; external IDs in `externalRefs` JSON where needed |
| **Timestamps** | `createdAt`, `updatedAt` on all mutable objects |
| **Soft delete** | `deletedAt` where recovery/compliance required (Contact, Company, Document) |
| **Extensions** | Industry fields in typed extension tables or namespaced `metadata` — never duplicate core identity |
| **Events** | Every state change emits a domain event before side effects complete |

---

## 1. Organisation

### What is it?

The **tenant** — a business using DigitalGate (e.g. Roe Realty, Currumbin Valley Hideaway). All data is isolated beneath an Organisation.

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Primary key |
| `name` | string | Display name |
| `slug` | string | Unique URL segment |
| `locale` | string | Default `en-AU` — see [GLOBAL-READINESS.md](./GLOBAL-READINESS.md) |
| `timezone` | string | IANA e.g. `Australia/Brisbane` |
| `currency` | string | ISO 4217 e.g. `AUD` |
| `status` | enum | `active` \| `trial` \| `suspended` \| `churned` |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Optional fields

`clerkOrgId`, `settings` (JSON: branding, features, onboarding state), `billingCustomerId` (Stripe), `industry` (e.g. `real_estate`), `planId`

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| employs | User (via Membership) | 1:N |
| owns | Contact, Company, Lead, … | 1:N |
| has | Digital Twin | 1:1 |
| has | AppInstallation | 1:N |
| connects | Connector | 1:N |

### Ownership

**Platform Core** — provisioning, settings, billing linkage.

### Events

| Event | When |
|-------|------|
| `organisation.created` | Signup / webhook provision |
| `organisation.updated` | Settings, plan, status change |
| `organisation.suspended` | Billing or compliance |
| `organisation.deleted` | Offboarding (after retention period) |

---

## 2. User

### What is it?

A **person** who accesses the platform. Identity lives in Clerk; Platform stores membership and permissions.

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Platform membership ID |
| `clerkUserId` | string | Clerk subject |
| `organisationId` | string | Tenant |
| `role` | string | e.g. `owner`, `admin`, `member`, `dg:staff` |
| `status` | enum | `active` \| `invited` \| `disabled` |
| `createdAt` | datetime | |

### Optional fields

`displayName`, `email` (Clerk login cache), `publicEmail` (per-org team/agent card), `bio`, `jobTitle`, `phone`, `avatarUrl`, `featureOverrides` (JSON), `lastActiveAt`

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| belongs to | Organisation | N:1 |
| creates | Activity, Task, Note | 1:N |
| assigned | Task, Lead, Opportunity | 1:N |

### Ownership

**Platform Core** — membership CRUD; Clerk owns authentication.

### Events

| Event | When |
|-------|------|
| `user.invited` | Invite sent |
| `user.joined` | First login / accept invite |
| `user.role_changed` | Permission change |
| `user.disabled` | Access revoked |

---

## 3. Contact

### What is it?

A **person** the organisation has a relationship with — client, vendor, buyer, guest, lead source contact. Not a platform User unless they also have Membership.

**ONE Contact only.** Guest, Vendor, Buyer, Customer, Client, Borrower, and Member are **roles / app contexts**, not separate Universal Objects. See [CONTACTS-AND-APP-ROLES.md](./CONTACTS-AND-APP-ROLES.md).

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `organisationId` | string | |
| `firstName` | string | |
| `status` | enum | `active` \| `archived` |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Optional fields

`lastName`, `email`, `phone`, `source`, `tags[]`, `companyId`, `assignedUserId`, `externalRefs` (WP ID, etc.), `metadata`, `deletedAt`

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| belongs to | Organisation | N:1 |
| works at | Company | N:1 (optional) |
| generates | Lead | 1:N |
| linked to | Property (owner, buyer) | N:M via graph |
| guest of | StayBooking / AccommodationGuestProfile | 1:N / 1:1 (Accommodation app context) |
| has | Activity, Task, Note | 1:N (polymorphic) |

### Ownership

**CRM App** (Core) — canonical contact record. Connectors may create/update via Platform API. Industry Apps add context tables keyed to `contactId`; they do not create parallel people rows.

### Events

| Event | When |
|-------|------|
| `contact.created` | New contact |
| `contact.updated` | Field change |
| `contact.merged` | Duplicate merge |
| `contact.archived` | Soft archive |
| `contact.deleted` | GDPR/offboarding delete |

---

## 4. Company

### What is it?

A **business account** — agency branch, corporate client, supplier, developer.

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `organisationId` | string | |
| `name` | string | |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Optional fields

`website`, `phone`, `email`, `industry`, `tags[]`, `parentCompanyId`, `externalRefs`, `metadata`, `deletedAt`

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| belongs to | Organisation | N:1 |
| employs | Contact | 1:N |
| linked to | Opportunity, Invoice | 1:N |

### Ownership

**CRM App** (Core)

### Events

| Event | When |
|-------|------|
| `company.created` | |
| `company.updated` | |
| `company.deleted` | |

---

## 5. Lead

### What is it?

An **expression of interest** before qualification — form submission, enquiry, walk-in, referral. May promote to Opportunity or link to existing Contact.

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `organisationId` | string | |
| `status` | enum | `new` \| `contacted` \| `qualified` \| `unqualified` \| `converted` |
| `source` | string | e.g. `website_form`, `referral`, `portal` |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Optional fields

`contactId`, `assignedUserId`, `title`, `description`, `channel`, `campaignId`, `propertyId` (RE), `metadata`, `responseDueAt`, `firstResponseAt`, `externalRefs`

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| belongs to | Organisation | N:1 |
| from | Contact | N:1 (optional until matched) |
| from | Campaign | N:1 (optional) |
| converts to | Opportunity | 1:1 (optional) |
| about | Property | N:1 (RE context) |

### Ownership

**CRM App** — Connectors and RE App create leads via Platform API.

### Events

| Event | When |
|-------|------|
| `lead.created` | Form sync, manual entry |
| `lead.assigned` | Owner set |
| `lead.contacted` | First outreach logged |
| `lead.qualified` | |
| `lead.converted` | Becomes Opportunity |
| `lead.response_sla_breached` | Automation/CS alert |

---

## 6. Opportunity

### What is it?

A **qualified pipeline item** with expected value and stage — vendor listing journey, buyer offer track, commercial deal.

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `organisationId` | string | |
| `title` | string | |
| `stage` | string | App-defined stage ID (RE: appraisal → settlement) |
| `status` | enum | `open` \| `won` \| `lost` |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Optional fields

`contactId`, `companyId`, `propertyId`, `leadId`, `assignedUserId`, `valueCents`, `currency`, `probability`, `expectedCloseDate`, `lostReason`, `metadata`, `pipelineId`

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| belongs to | Organisation | N:1 |
| for | Contact, Company, Property | N:1 each optional |
| originated from | Lead | 1:1 optional |
| has | Activity, Task, Document | 1:N |

### Ownership

**CRM App** (generic pipeline) + **Real Estate App** (RE stages and extensions). RE owns stage definitions; CRM owns base Opportunity object.

### Events

| Event | When |
|-------|------|
| `opportunity.created` | |
| `opportunity.stage_changed` | Pipeline move |
| `opportunity.won` | |
| `opportunity.lost` | |
| `opportunity.updated` | |

---

## 7. Activity

### What is it?

An **immutable timeline entry** — call, email, note, stage change, system event — attached to any entity.

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `organisationId` | string | |
| `entityType` | string | e.g. `Contact`, `Opportunity` |
| `entityId` | string | |
| `activityType` | string | e.g. `call`, `email`, `stage_change` |
| `title` | string | |
| `createdAt` | datetime | |

### Optional fields

`body`, `metadata`, `createdBy` (userId), `sourceApp`, `externalRefs`

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| belongs to | Organisation | N:1 |
| attached to | Any entity | N:1 (polymorphic) |
| created by | User | N:1 optional |

### Ownership

**Platform Core** (Timeline service) — Apps request timeline writes via API; Activity is append-only (no updates, only void/redact with audit).

### Events

| Event | When |
|-------|------|
| `activity.created` | Any timeline entry |

*(Activity often mirrors other events — consumers may dedupe.)*

---

## 8. Task

### What is it?

A **future action** with assignee and due date — follow-up call, listing prep, review request.

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `organisationId` | string | |
| `title` | string | |
| `status` | enum | `open` \| `completed` \| `cancelled` |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Optional fields

`description`, `assignedUserId`, `dueAt`, `completedAt`, `entityType`, `entityId`, `priority`, `sourceApp`, `metadata`

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| belongs to | Organisation | N:1 |
| assigned to | User | N:1 |
| related to | Contact, Opportunity, Property, … | N:1 polymorphic |

### Ownership

**Platform Core** (Tasks service) — usable by all Apps.

### Events

| Event | When |
|-------|------|
| `task.created` | |
| `task.completed` | |
| `task.overdue` | Automation (scheduled) |
| `task.assigned` | |

---

## 9. Document

### What is it?

A **file reference** — contract, appraisal PDF, brand asset upload, listing collateral. Binary in object storage; metadata in Postgres.

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `organisationId` | string | |
| `name` | string | |
| `storageKey` | string | S3/R2 path |
| `mimeType` | string | |
| `sizeBytes` | number | |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Optional fields

`entityType`, `entityId`, `uploadedBy`, `category`, `version`, `checksum`, `deletedAt`, `metadata`

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| belongs to | Organisation | N:1 |
| attached to | Opportunity, Property, Contact, … | N:1 optional |

### Ownership

**Platform Core** (Asset/Document service) — Apps tag documents with `sourceApp`.

### Events

| Event | When |
|-------|------|
| `document.uploaded` | |
| `document.deleted` | |
| `document.version_added` | |

---

## 10. Property

### What is it?

A **real estate asset** — residential, commercial, land — central to the Real Estate App.

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `organisationId` | string | |
| `addressLine1` | string | |
| `suburb` | string | |
| `state` | string | |
| `postcode` | string | |
| `country` | string | Default from org |
| `status` | enum | `prospect` \| `appraisal` \| `listed` \| `under_offer` \| `sold` \| `withdrawn` |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Optional fields

`addressLine2`, `latitude`, `longitude`, `propertyType`, `bedrooms`, `bathrooms`, `landAreaSqm`, `buildingAreaSqm`, `ownerContactId`, `listingPriceCents`, `currency`, `metadata`, `externalRefs` (REA, Domain IDs)

> **Listing vs Property:** Property is the **asset**. A **Listing** (first-class — §10b) is the agency’s marketing/sale campaign for that asset. Portal IDs (Domain, REA) belong on **ListingPlacement**, not only on Property `externalRefs`. See [PROPERTY-SYNDICATION.md](./PROPERTY-SYNDICATION.md).

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| belongs to | Organisation | N:1 |
| owned by | Contact | N:M |
| has | Listing (campaign) | 1:N |
| has | Opportunity (listing pipeline) | 1:N |
| has | Lead (buyer enquiries) | 1:N |
| has | Document, Campaign | 1:N |

### Ownership

**Real Estate App** — universal Property type; RE extensions in `property_details` or metadata namespace `re.*`.

### Events

| Event | When |
|-------|------|
| `property.created` | |
| `property.updated` | |
| `property.listed` | Goes live (legacy — prefer `listing.published` via Listing) |
| `property.sold` | Settlement complete |
| `property.withdrawn` | |

---

## 10b. Listing

### What is it?

An **agency marketing / sale campaign** for a Property — price, copy, media set, and syndication to portals. Distinct from the underlying asset so a Property can be re-listed over time and each campaign can have multiple portal placements.

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `organisationId` | string | |
| `propertyId` | string | Underlying asset |
| `status` | enum | `draft` \| `ready` \| `syndicating` \| `live` \| `under_offer` \| `sold` \| `withdrawn` |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Optional fields

`headline`, `description`, `listPriceCents`, `currency`, `agencyContactId`, `opportunityId`, `metadata`, `externalRefs`

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| belongs to | Organisation | N:1 |
| for | Property | N:1 |
| has | ListingPlacement (Domain, REA, website, …) | 1:N |
| linked to | Opportunity | N:1 optional |

### Ownership

**Real Estate App** — Property Syndication Engine; see [PROPERTY-SYNDICATION.md](./PROPERTY-SYNDICATION.md).

### Events

| Event | When |
|-------|------|
| `listing.created` | |
| `listing.updated` | |
| `listing.published` | First portal or website live |
| `listing.withdrawn` | |
| `listing.placement_status_changed` | Webhook / sync from portal |

### ListingPlacement (channel row)

| Field | Notes |
|-------|------|
| `channel` | `domain` \| `rea` \| `website` \| … |
| `status` | `draft` \| `pending` \| `published` \| `withdrawn` \| `error` |
| `externalId` | Portal listing ID |
| `lastSyncedAt`, `lastError`, `metadata` | |

---

## 11. Booking

### What is it?

A **reserved period** for an accommodation unit — hospitality, short-stay, dome rental.

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `organisationId` | string | |
| `accommodationId` | string | Unit reference |
| `checkIn` | datetime | Org timezone |
| `checkOut` | datetime | |
| `status` | enum | `pending` \| `confirmed` \| `checked_in` \| `checked_out` \| `cancelled` |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Optional fields

`contactId` (guest — Universal Contact), `totalCents`, `currency`, `source`, `notes`, `metadata`, `externalRefs` (Airbnb, Booking.com)

> **Do not** introduce a `Guest` Universal Object. Guests are Contacts; Accommodation guest attributes live on `AccommodationGuestProfile` + booking aggregates. See [CONTACTS-AND-APP-ROLES.md](./CONTACTS-AND-APP-ROLES.md).

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| belongs to | Organisation | N:1 |
| for | Accommodation (asset) | N:1 |
| guest | Contact | N:1 |
| generates | Invoice | 1:N optional |

### Ownership

**Accommodation App** (Business tier) — `StayBooking` + `AccommodationGuestProfile` in Gen 2 schema; WordPress remains connector SoT until cutover.

### Events

| Event | When |
|-------|------|
| `booking.created` | |
| `booking.confirmed` | |
| `booking.cancelled` | |
| `booking.checked_in` | |
| `booking.checked_out` | |

---

## 12. Campaign

### What is it?

A **marketing initiative** — email blast, social push, suburb landing page launch, open home promotion.

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `organisationId` | string | |
| `name` | string | |
| `status` | enum | `draft` \| `scheduled` \| `active` \| `completed` \| `cancelled` |
| `channel` | string | e.g. `email`, `social`, `landing_page`, `ads` |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Optional fields

`startAt`, `endAt`, `budgetCents`, `currency`, `targetSegment`, `propertyId`, `metadata`, `externalRefs`

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| belongs to | Organisation | N:1 |
| generates | Lead | 1:N |
| uses | Asset (creatives) | N:M |
| promotes | Property | N:1 optional |

### Ownership

**Marketing App** (Growth tier) — Phase 2+; object defined for graph and events now.

### Events

| Event | When |
|-------|------|
| `campaign.created` | |
| `campaign.started` | |
| `campaign.completed` | |
| `campaign.lead_attributed` | Lead tagged with campaign |

---

## 13. Asset

### What is it?

**Two subtypes** — do not conflate:

| Subtype | Purpose | Owner |
|---------|---------|-------|
| **Brand Asset** | Logo, colours, templates — Digital Identity | Platform Core (`assets/`) |
| **Media Asset** | Campaign images, listing photos, documents | Document service or Campaign |

### Brand Asset — mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `organisationId` | string | |
| `name` | string | |
| `assetType` | enum | `logo` \| `icon` \| `template` \| `brand_colour` |
| `storageKey` or `value` | string | File ref or hex/token |
| `createdAt` | datetime | |

### Ownership

**Platform Core** — Asset Library for branding and white-label.

### Events

| Event | When |
|-------|------|
| `asset.created` | |
| `asset.updated` | Brand refresh |

---

## 14. Invoice

### What is it?

A **billing document** — client invoice (RE commission) or platform subscription invoice (Stripe).

### Mandatory fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | |
| `organisationId` | string | |
| `number` | string | Human-readable |
| `status` | enum | `draft` \| `sent` \| `paid` \| `void` \| `overdue` |
| `totalCents` | number | |
| `currency` | string | ISO 4217 |
| `issuedAt` | datetime | |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### Optional fields

`contactId`, `companyId`, `dueAt`, `paidAt`, `stripeInvoiceId`, `lineItems` (JSON), `taxCents`, `metadata`

### Relationships

| Relation | Target | Cardinality |
|----------|--------|-------------|
| belongs to | Organisation | N:1 |
| billed to | Contact, Company | N:1 optional |
| from | Booking, Opportunity | N:1 optional |

### Ownership

**Platform Core** (subscription invoices) + **Finance integrations** (client invoices). Stripe Connector syncs subscription invoices.

### Events

| Event | When |
|-------|------|
| `invoice.created` | |
| `invoice.sent` | |
| `invoice.paid` | |
| `invoice.overdue` | |

---

## Platform 1.0 schema scope

Objects **in Postgres for Platform 1.0**:

| Object | Table | Phase |
|--------|-------|-------|
| Organisation | ✅ `organisations` | 1.0 |
| User/Membership | ✅ `memberships` | 1.0 |
| Contact | ✅ `contacts` | 1.0 |
| Company | ✅ `companies` | 1.0 |
| Activity | ✅ `activities` | 1.0 |
| AppInstallation | ✅ `app_installations` | 1.0 |
| Task | `tasks` | 1.0 |
| Lead | `leads` | 1.0 |
| Opportunity | — | 1.5 (RE) |
| Document | — | 1.5 |
| Property | — | 1.5 (RE) |
| Booking | — | 2.0 |
| Campaign | — | 1.5 |
| Invoice | — | 1.5 (Stripe) |
| Asset | — | 1.5 |

Align Prisma migrations to this table before `db:push` to production.

---

## Change control

Changes to mandatory fields or ownership require:

1. Update this document  
2. Update [EVENT-CATALOGUE.md](../catalogues/EVENT-CATALOGUE.md)  
3. ADR if breaking  
4. Migration plan for existing tenants  
