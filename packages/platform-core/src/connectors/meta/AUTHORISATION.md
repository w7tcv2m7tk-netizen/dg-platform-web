# Meta authorisation mode

DigitalGate defaults to explicit Facebook Page OAuth scopes (`pages_show_list`, `pages_read_engagement`, `business_management`) because this is the known-good flow for presenting the managed Page selector and discovering Pages through `me/accounts`.

`META_CONFIG_ID` may remain configured. It is only used when `META_USE_BUSINESS_LOGIN_CONFIG=true` is explicitly set. This prevents a Facebook Login for Business configuration change from silently replacing the Page-selection flow.

The production asset-discovery diagnostics must never log access tokens, OAuth codes or app secrets.
