# Google Business Profile organisation resource selection

`GET /api/v1/connectors/google/locations` discovers every GBP location visible to the connected Google login, but keeps discovery separate from the organisation evidence cache.

`PUT /api/v1/connectors/google/locations` accepts `{ "locationNames": ["accounts/.../locations/..."] }`, validates every requested resource against live Google discovery, persists the selection on the active organisation's `google-gbp` connector settings, clears stale evidence, and immediately rebuilds the cache.

Safety invariant: an unselected or inaccessible Google Business Profile location must never be persisted into an organisation's active `locations` or `reviews` evidence arrays.
