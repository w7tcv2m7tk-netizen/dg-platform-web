import { getOrgConnectorSettings, saveOrgConnectorSettings } from "../framework/store";
import { ensureValidOrgGoogleAccessToken, googleApiGet } from "./auth";

export type GoogleAnalyticsProperty = { name: string; displayName: string; account?: string; timeZone?: string; currencyCode?: string };
export type GoogleSearchConsoleSite = { siteUrl: string; permissionLevel?: string };
export type OrgGoogleAnalyticsSettings = { property?: string; propertyLabel?: string; searchConsoleSite?: string; updatedAt?: string };

export async function getOrgGoogleAnalyticsSettings(organisationId: string): Promise<OrgGoogleAnalyticsSettings> {
  const blob = await getOrgConnectorSettings(organisationId, "google-analytics");
  if (!blob) return {};
  return {
    property: typeof blob.property === "string" ? blob.property : undefined,
    propertyLabel: typeof blob.propertyLabel === "string" ? blob.propertyLabel : undefined,
    searchConsoleSite: typeof blob.searchConsoleSite === "string" ? blob.searchConsoleSite : undefined,
    updatedAt: typeof blob.updatedAt === "string" ? blob.updatedAt : undefined,
  };
}

export async function saveOrgGoogleAnalyticsSettings(organisationId: string, settings: OrgGoogleAnalyticsSettings): Promise<void> {
  await saveOrgConnectorSettings(organisationId, "google-analytics", { ...settings, updatedAt: new Date().toISOString() });
}

export async function discoverOrgGoogleAnalyticsProperties(organisationId: string): Promise<{ ok: true; properties: GoogleAnalyticsProperty[] } | { ok: false; message: string }> {
  const token = await ensureValidOrgGoogleAccessToken(organisationId);
  if (!token.ok) return token;
  const accounts = await googleApiGet("https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200", token.accessToken);
  if (!accounts.ok) return { ok: false, message: accounts.message };
  const summaries = accounts.data && typeof accounts.data === "object" && "accountSummaries" in accounts.data ? (accounts.data as { accountSummaries?: Array<{ account?: string; propertySummaries?: Array<{ property?: string; displayName?: string }> }> }).accountSummaries ?? [] : [];
  const properties = summaries.flatMap((summary) => (summary.propertySummaries ?? []).filter((property) => property.property).map((property) => ({ name: property.property!, displayName: property.displayName || property.property!, account: summary.account })));
  return { ok: true, properties };
}

export async function discoverOrgGoogleSearchConsoleSites(organisationId: string): Promise<{ ok: true; sites: GoogleSearchConsoleSite[] } | { ok: false; message: string }> {
  const token = await ensureValidOrgGoogleAccessToken(organisationId);
  if (!token.ok) return token;
  const result = await googleApiGet("https://www.googleapis.com/webmasters/v3/sites", token.accessToken);
  if (!result.ok) return { ok: false, message: result.message };
  const sites = result.data && typeof result.data === "object" && "siteEntry" in result.data ? ((result.data as { siteEntry?: GoogleSearchConsoleSite[] }).siteEntry ?? []) : [];
  return { ok: true, sites };
}
