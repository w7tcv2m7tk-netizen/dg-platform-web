# Booking platform authority

This remediation makes Gen 2 `StayBooking.id` the canonical booking identity. WordPress remains a connector and migration source; its numeric booking post ID is an external reference only.

Cutover invariants:
- WordPress webhook payloads may provide `platform_id` and Gen 2 resolves that id first within the server-resolved organisation.
- Legacy WordPress row-id matching remains migration bootstrap only; the returned canonical id must then be persisted by the connector.
- The WordPress connector stores the canonical Gen 2 id as `dg_booking_platform_id` and returns it as `platform_id` on later projections.
- Before the WordPress REST booking PATCH callback mutates a booking, the connector requires Gen 2 to acknowledge the exact proposed state. A non-2xx Gen 2 response aborts the WordPress write.
- The pre-dispatch authority guard explicitly enforces the accommodation `can_manage` permission before making the privileged Gen 2 webhook call.
- Canonical identity or organisation/WP-link mismatch fails closed.
- Overlap conflicts fail closed and are returned as non-2xx rather than being acknowledged as a successful sync.
- WordPress cannot reassign an established canonical booking to a different accommodation unit through the legacy patch path; that requires a platform-native atomic unit-move implementation.
- Gen 2 remains the read and commercial system of record; WordPress is a projection/mirror where a legacy host still exists.
