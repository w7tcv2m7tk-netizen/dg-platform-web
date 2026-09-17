# LinkedIn OAuth result states

DigitalGate distinguishes three callback outcomes:

- `connected`: OAuth token exchange and the post-connect LinkedIn identity/company-page probe succeeded.
- `attention`: OAuth token exchange succeeded and tokens remain stored, but the post-connect probe is degraded (for example Community Management API/page ACL access is unavailable or no administrable company page was discovered).
- `error`: OAuth itself failed, signed state was invalid, the organisation was not write-entitled, or tokens could not be persisted.

A degraded company-page probe must not be reported as an OAuth failure and must not discard a valid token. The connector health record remains the durable source for the detailed LinkedIn API error and can be re-probed from Social → Accounts.
