# Meta connector baseline

DigitalGate's Meta integration should use one organisation-scoped OAuth connection to discover and explicitly assign Facebook Pages and linked Instagram professional accounts.

## Initial capability

- Facebook Login / Meta OAuth
- discover Pages the authorised member can manage
- read Page identity and engagement evidence
- discover the Instagram professional account linked to an assigned Page
- store assignments per DigitalGate organisation; never infer or share assignments between tenants
- expose connection health and missing-permission reasons rather than fabricating data

## Initial permissions

The implementation should request only permissions needed for the first capability slice. Expected permissions include `pages_show_list`, `pages_read_engagement` and `instagram_basic`, subject to the permissions actually enabled for the Meta app and Meta App Review requirements.

Publishing, messaging, leads and Ads are separate capability increments and should add their own permissions only when those features are implemented.

## Production callback

`https://app.digitalgate.com.au/api/connectors/meta/callback`

## Environment

- `META_APP_ID`
- `META_APP_SECRET`
- `META_REDIRECT_URI` (optional; defaults to the production callback above)
- `META_GRAPH_VERSION` (optional)
