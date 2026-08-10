# Accommodation channel connectivity

**Status:** Stage 1 (iCal) live for CVH beta · Stage 2 (native APIs) planned  
**Goal:** CVH Business Platform (Gen 2) is the **central hub** — inventory master for direct + OTA channels.

---

## Distinction

| Path | What it is | Fit for CVH hub |
|------|------------|-----------------|
| **Direct Connectivity Partner** | Booking.com / Airbnb certify *your* software | Preferred — CVH platform owns availability & reservations |
| **Established channel manager / PMS** | Plug into Lodgify, Guesty, etc. | Faster ops, but inventory master stays elsewhere |

For “platform as hub,” pursue **direct connectivity** with both OTAs — not only embedding a third-party CM.

---

## Stage 1 — now (iCal)

```
CVH Platform (Neon StayBooking + AccommodationUnit)
        ↕ iCal import/export
   Booking.com · Airbnb
```

- **Import:** OTA export URL → unit fields → WP iCal sync → Gen 2 StayBooking  
- **Export:** DigitalGate `.ics` → paste into each OTA (never OTA↔OTA)  
- **Public book-now:** WordPress until Gen 2-first cutover flags

Gets the central calendar working immediately while partner programmes progress.

---

## Stage 2 — native APIs

```
              CVH BUSINESS PLATFORM
                       │
            ┌──────────┴──────────┐
            │                     │
       BOOKING.COM             AIRBNB
        Connectivity             API
            API              (partner programme)
            │                     │
            ▼                     ▼
      Reservations          Reservations
      Availability           Availability
      Rates / restrictions   Rates
```

Then **Neon is master inventory**; OTAs mirror from Gen 2.

### Booking.com — Connectivity Partner

1. Register CVH Business Platform as a connectivity / software provider  
2. [Booking.com Connectivity Developer Portal](https://developers.booking.com/) — review & certification  
3. Implement required APIs (reservations, availability, rates, restrictions, content, …)  
4. Connect CVH properties + auth  
5. Prefer **Connections API** surfaces: RESERVATIONS, AVAILABILITY, CONTENT, MESSAGING, PAYMENTS, etc.

### Airbnb — partner programme (not a generic host API key)

Approach as: *proprietary PMS / direct-booking platform seeking API connectivity for owned inventory.*

- NDA, API terms, security review, mandatory implementation requirements  
- Entry via [Airbnb software partners](https://www.airbnb.com/partner) / API programmes — not a one-off “API key for a listing”

---

## Architecture rule — channel abstraction (build now)

Even while Stage 1 is iCal-only, keep an **API-first channel layer**:

```
Channel
 ├── CVH Direct
 ├── Booking.com
 └── Airbnb

Common ops:
  getReservations / createReservation / updateReservation / cancelReservation
  getAvailability / updateAvailability
  getRates / updateRates
```

| Stage | Adapter |
|-------|---------|
| 1 | `Booking.com → iCal adapter`, `Airbnb → iCal adapter` |
| 2 | Swap adapters for native Booking.com Connectivity + Airbnb partner APIs |

Do **not** lock the booking engine to iCal shapes — adapters translate into StayBooking + unit availability.

### Suggested package layout (when implemented)

```
packages/platform-core/src/accommodation/channels/
  types.ts              # ChannelId, ChannelAdapter
  registry.ts
  ical/bookingcom.ts
  ical/airbnb.ts
  # later:
  # bookingcom/api.ts
  # airbnb/api.ts
```

Gen 2 calendar / sync_ota call the registry; UI stays channel-agnostic.

---

## Related

- [ACC-BETA-LAUNCH.md](../ACC-BETA-LAUNCH.md) — iCal ops checklist  
- [PROPERTY-SYNDICATION.md](./PROPERTY-SYNDICATION.md) — RE portal syndication (Domain / REA) — same adapter idea  
- [WP-DETACH-BACKLOG.md](../WP-DETACH-BACKLOG.md) — StayBooking SoT / Gen 2-first flags  
- Units OTA fields: `/apps/accommodation/units`
