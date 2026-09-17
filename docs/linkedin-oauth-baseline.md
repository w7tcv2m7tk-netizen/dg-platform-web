# LinkedIn OAuth baseline

DigitalGate must be able to establish a basic LinkedIn identity connection without requiring LinkedIn Community Management API approval.

Baseline OAuth scopes are `openid profile email`. Organisation social scopes (`w_organization_social`, `r_organization_social`) are opt-in through `LINKEDIN_OAUTH_SCOPES` once the LinkedIn application has Community Management API access.

The connector may report organisation publishing as unavailable/degraded until those scopes are granted; it must not block the base OAuth connection.
