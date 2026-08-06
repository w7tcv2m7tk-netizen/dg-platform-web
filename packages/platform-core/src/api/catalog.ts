/** Platform API v1 — discoverable endpoint catalog. */

export interface PlatformApiEndpoint {
  method: string;
  path: string;
  description: string;
  feature?: string;
  auth: "session" | "api_key" | "session_or_api_key" | "connector";
}

export const PLATFORM_API_V1: PlatformApiEndpoint[] = [
  { method: "GET", path: "/api/v1/platform", description: "API catalog and version", auth: "session_or_api_key" },
  { method: "GET", path: "/api/v1/contacts", description: "List contacts", feature: "crm.contacts.read", auth: "session_or_api_key" },
  { method: "POST", path: "/api/v1/contacts", description: "Create contact", feature: "crm.contacts.write", auth: "session_or_api_key" },
  { method: "GET", path: "/api/v1/contacts/{id}", description: "Get contact", feature: "crm.contacts.read", auth: "session_or_api_key" },
  { method: "PATCH", path: "/api/v1/contacts/{id}", description: "Update contact", feature: "crm.contacts.write", auth: "session_or_api_key" },
  { method: "GET", path: "/api/v1/companies", description: "List companies", feature: "crm.companies.read", auth: "session_or_api_key" },
  { method: "POST", path: "/api/v1/companies", description: "Create company", feature: "crm.companies.write", auth: "session_or_api_key" },
  { method: "GET", path: "/api/v1/leads", description: "List leads", feature: "crm.leads.read", auth: "session_or_api_key" },
  { method: "POST", path: "/api/v1/leads", description: "Create lead", feature: "crm.leads.write", auth: "session_or_api_key" },
  { method: "GET", path: "/api/v1/properties", description: "List properties", feature: "re.properties.read", auth: "session_or_api_key" },
  { method: "POST", path: "/api/v1/properties", description: "Create property", feature: "re.properties.write", auth: "session_or_api_key" },
  { method: "GET", path: "/api/v1/activities", description: "Organisation activity timeline", feature: "crm.timeline.read", auth: "session_or_api_key" },
  { method: "POST", path: "/api/v1/activities", description: "Create activity", feature: "crm.timeline.write", auth: "session_or_api_key" },
  { method: "GET", path: "/api/v1/audit", description: "Audit log", feature: "platform.audit.read", auth: "session_or_api_key" },
  { method: "GET", path: "/api/v1/commerce/financial-snapshot", description: "Revenue and AR snapshot", auth: "session_or_api_key" },
  { method: "GET", path: "/api/v1/commerce/quotes", description: "List quotes", auth: "session_or_api_key" },
  { method: "GET", path: "/api/v1/commerce/invoices", description: "List invoices", auth: "session_or_api_key" },
  { method: "GET", path: "/api/v1/org/profile", description: "Organisation business profile", auth: "session_or_api_key" },
  { method: "GET", path: "/api/v1/websites/health", description: "Website health from WordPress connector", auth: "session_or_api_key" },
  { method: "GET", path: "/api/v1/platform/api-keys", description: "List API keys (Clerk session only)", auth: "session" },
  { method: "POST", path: "/api/v1/platform/api-keys", description: "Create API key (Clerk session only)", auth: "session" },
  { method: "DELETE", path: "/api/v1/platform/api-keys/{id}", description: "Revoke API key (Clerk session only)", auth: "session" },
];

export function getPlatformApiCatalog() {
  return {
    version: "1.0",
    baseUrl: process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://app.digitalgate.com.au",
    documentation: "/dashboard/settings/api",
    authentication: {
      browser: "Clerk session cookie",
      server: "X-API-Key: dg_live_… or Authorization: Bearer dg_live_…",
    },
    endpoints: PLATFORM_API_V1,
  };
}
