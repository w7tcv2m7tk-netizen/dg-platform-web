# Meta developer setup for DigitalGate

Use the DigitalGate Meta developer app for the platform-wide OAuth client. Each DigitalGate organisation will connect its own Meta business resources; do not create separate Meta apps per tenant.

Configure the app with the production OAuth callback:

`https://app.digitalgate.com.au/api/connectors/meta/callback`

Keep the App ID and App Secret out of Git. They will be deployment environment variables `META_APP_ID` and `META_APP_SECRET`.

Initial DigitalGate integration targets are Facebook Pages, Instagram Professional accounts and Meta ad accounts. Permissions will be requested incrementally and read-only wherever Meta supports that model. Some permissions may require Meta App Review, business verification or Advanced Access before non-developer accounts can use them.

Once the Meta app credentials are configured, DigitalGate can implement OAuth, resource discovery/selection, encrypted organisation-scoped tokens, Analytics evidence sync, Aida/Digital Twin evidence and Connected Services health/reconnect/disconnect states.
