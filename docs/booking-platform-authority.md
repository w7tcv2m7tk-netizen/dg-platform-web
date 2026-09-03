# Booking platform authority

This remediation makes Gen 2 `StayBooking.id` the canonical booking identity. WordPress remains a connector and migration source; its numeric booking post ID is an external reference only.

Cutover invariants:
- WordPress webhook payloads may provide `platform_id` and Gen 2 must resolve that id first.
- Legacy WordPress row-id matching remains migration fallback only.
- Connector implementations must persist the canonical Gen 2 id as `dg_booking_platform_id` and return it as `platform_id`.
- Updates from Gen 2 to WordPress must resolve by canonical platform id before any legacy WP id fallback.
