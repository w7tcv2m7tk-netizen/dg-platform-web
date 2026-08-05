# Event Catalogue

**Domain events published by the Platform**

Convention: `{entity}.{action}` in past tense where applicable.

All events include: `organisationId`, `occurredAt`, optional `actorId`, `entityType`, `entityId`, `payload`.

---

## Core / CRM

| Event | Producer | Typical consumers |
|-------|----------|-------------------|
| `organisation.created` | Org provisioning | Billing, onboarding, BI |
| `contact.created` | CRM API | Automation, timeline, Twin |
| `contact.updated` | CRM API | Twin, search index |
| `company.created` | CRM API | Graph, Twin |

---

## Commercial

| Event | Producer | Consumers |
|-------|----------|-----------|
| `lead.created` | CRM, Connectors, RE App | Automation, notifications, BI |
| `invoice.paid` | Stripe Connector | CRM tags, Twin, BI |

---

## Real Estate (Phase 3)

| Event | Producer | Consumers |
|-------|----------|-----------|
| `property.listed` | RE App | SEO, marketing, Twin |
| `appraisal.booked` | RE App | Calendar, automation |

---

## Accommodation

| Event | Producer | Consumers |
|-------|----------|-----------|
| `booking.confirmed` | Accommodation App | Notifications, accounting |

---

## Growth

| Event | Producer | Consumers |
|-------|----------|-----------|
| `review.received` | Reviews Connector | BI, reputation score |
| `seo.score_changed` | SEO App | BI, notifications |
| `ai_vis.citation_found` | AI Visibility App | BI, Twin |

---

## Implementation

- Bus: `packages/platform-core/src/events/bus.ts`  
- Types: `packages/platform-core/src/events/types.ts`  
- Add new events here **before** implementing producers  
