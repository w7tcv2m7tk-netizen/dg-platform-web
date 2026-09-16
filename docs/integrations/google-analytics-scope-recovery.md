# Google Analytics stale OAuth grant recovery

If Google returns `ACCESS_TOKEN_SCOPE_INSUFFICIENT` for Analytics Admin or Search Console after DigitalGate requested the correct scopes, the organisation's existing Google grant is stale/incomplete.

DigitalGate must not accept an Analytics-mode OAuth exchange unless the returned token scope includes both:

- `https://www.googleapis.com/auth/analytics.readonly`
- `https://www.googleapis.com/auth/webmasters.readonly`

The callback rejects an incomplete grant before overwriting the organisation's stored Google token. The connector UI should direct the user to remove DigitalGate from Google Account > third-party connections and then re-authorise from the Analytics connector. This is an OAuth grant reset; it does not delete Google Analytics, Search Console or Business Profile data.
