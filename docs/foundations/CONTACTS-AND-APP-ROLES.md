# Contacts and App Roles

**ONE universal Contact. Apps add context — never duplicate people.**

> Canonical person type: [CORE-OBJECT-SPECIFICATION.md](./CORE-OBJECT-SPECIFICATION.md) § Contact  
> Object index: [catalogues/OBJECT-MODEL.md](../catalogues/OBJECT-MODEL.md)  
> ADR: [0003-universal-objects.md](../adr/0003-universal-objects.md)  
> Vision: [PRODUCT-VISION.md](../PRODUCT-VISION.md) (eliminate duplication) · Roadmap: [ROADMAP.md](../ROADMAP.md)

---

## Rule (non-negotiable)

There is **one** Universal Object for a person: **`Contact`**.

**Forbidden** as Universal Object / parallel people tables:

| Do not create | Correct model |
|---------------|---------------|
| Guest | `Contact` + Accommodation guest context |
| Vendor | `Contact` + Real Estate vendor / listing relationship |
| Buyer | `Contact` + Real Estate buyer relationship |
| Customer | `Contact` + CRM / Services / Commerce customer context |
| Client | `Contact` + agency / services relationship |
| Borrower | `Contact` + Finance borrower context |
| Member | `Contact` + membership / community context (future) |

Industry Apps **must not** invent a second person record. They attach **roles, profiles, and relationships** to the shared Contact.

---

## Pattern: Contact → App Role

```
Contact (Universal Object — identity)
   │
   ├── Accommodation Guest Profile   (app context — stays, prefs, VIP)
   ├── CRM Customer / Opportunity    (app context — pipeline)
   ├── RE Vendor / Buyer links       (app context — listings)
   ├── Finance Borrower Profile      (future app context)
   └── Services Customer Profile     (future app context)
```

- **Contact** = who the person is (name, email, phone, company, timeline).
- **App role / profile** = how this org relates to them in that App (preferences, status flags, domain metrics).
- **Transactions** (bookings, leads, invoices) reference `contactId` — they do not own a separate person row.

Extension tables are allowed when they hold **app-specific attributes**. They are **not** Universal Objects and must:

1. Be keyed to `organisationId` + `contactId`
2. Never duplicate name/email/phone as source of truth (Contact owns those)
3. Never appear in `UNIVERSAL_OBJECTS` / object catalogues as a person type

---

## Exemplar: Accommodation Guest

### Product surface

**Nav:** Accommodation → Overview · Bookings · **Guests** · Units · Availability · Housekeeping · (Check-ins / Payments / Reviews as those ship)

**Guests** stays a dedicated Accommodation section. The list shows Contacts that have an Accommodation relationship, e.g.:

`Sarah Smith · Guest · 4 stays · $2,840 LTV · Last stay · Favourite unit · Repeat Guest`

Click opens the **Accommodation guest profile** (app context). The same person is available as the **universal Contact** at `/apps/crm/contacts/[id]`.

### Guest profile (Accommodation context on Contact)

| Area | Source of truth |
|------|-----------------|
| Contact details | `Contact` |
| Booking history / current & upcoming stays | `StayBooking` (`contactId`) |
| # stays, total spend, last stay, favourite unit | Aggregated from bookings |
| VIP / repeat status | Profile flags + booking aggregates |
| Preferences, special requests, guest notes, marketing consent | `AccommodationGuestProfile` |
| Check-in/out history | Bookings + activities (as wired) |
| Reviews, communication history | Timeline / Reviews App — may be incomplete |

### Schema sketch

```
Contact
  └── AccommodationGuestProfile (1:1 per org contact — app context)
StayBooking.contactId → Contact
```

WordPress guest rows remain a **connector mirror**. Gen 2 creates/updates Contact (+ guest profile) when guests appear; WP ids may live on the profile as `legacyWpGuestId` / `externalRefs`.

---

## Same pattern later

| App | Role label in UI | Model |
|-----|------------------|-------|
| CRM | Customer / Client | Contact + opportunities / tags |
| Real Estate | Vendor, Buyer | Contact + lead / property relationships |
| Finance | Borrower | Contact + borrower profile (future) |
| Services | Customer | Contact + service context (future) |
| Commerce | Customer | Contact + invoices / subscriptions |

UI labels (“Guest”, “Vendor”) are **role badges**, not object types.

---

## Implementation checklist

- [ ] Never add `Guest` / `Vendor` / `Buyer` / `Customer` / `Borrower` to `UNIVERSAL_OBJECTS`
- [ ] App manifests may list `Contact` as an entity they use; guest UX lives under the App
- [ ] Create/update Contact when a person appears in an App workflow
- [ ] List “Guests” (etc.) as Contact-centric views filtered by app relationship
- [ ] Contact detail may show App panels; App detail must deep-link to Contact

---

## Related

- [PLATFORM-PRINCIPLES.md](../PLATFORM-PRINCIPLES.md) § Universal Objects  
- Accommodation Gen 2 guests: `/apps/accommodation/guests`  
- Contacts CRM: `/apps/crm/contacts`
