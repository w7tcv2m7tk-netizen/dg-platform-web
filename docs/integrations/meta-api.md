# Meta API integration

DigitalGate will use an organisation-scoped Meta OAuth connection, following the same tenant-isolation principles as Google connectors.

## Planned evidence sources

- Facebook Pages: page identity and organic page/engagement evidence where permitted.
- Instagram Professional accounts: account and media insights where permitted.
- Meta Ads: advertising account/campaign performance evidence for Analytics and Aida.

## Platform configuration required

Create/configure the Meta developer app and provide these deployment secrets through the platform environment (never commit them):

- `META_APP_ID`
- `META_APP_SECRET`
- `META_REDIRECT_URI=https://app.digitalgate.com.au/api/connectors/meta/callback`

The implementation must request only the permissions required for enabled DigitalGate capabilities, store user/system tokens encrypted per organisation, validate OAuth state against the active organisation, and expose clean reconnect/disconnect/permission-limited states.

## Implementation sequence

1. Meta OAuth connect/callback and encrypted organisation token store.
2. Discover accessible Facebook Pages, Instagram Professional accounts and ad accounts.
3. Organisation-scoped resource selection.
4. Read-only evidence sync into Analytics / Digital Twin / Aida.
5. Connected Services health, reconnect and disconnect controls.
6. Graceful handling for Meta permissions that require App Review or business verification.

Do not fabricate metrics when Meta denies a permission or a resource is unavailable.
