import { ensureValidOrgGoogleAccessToken, getOrgGoogleGbpConnectorTokens, saveOrgGoogleGbpConnectorTokens } from "./auth";

const GOOGLE_ADS_VERSION = process.env.GOOGLE_ADS_API_VERSION?.trim() || "v25";
const GOOGLE_ADS_ROOT = `https://googleads.googleapis.com/${GOOGLE_ADS_VERSION}`;

export type GoogleAdsAccount = { customerId: string; resourceName: string };

async function adsGet(path: string, accessToken: string) {
  const headers: Record<string,string> = { Authorization: `Bearer ${accessToken}`, Accept: "application/json" };
  // Google sunset developer-token enforcement on 9 Sep 2026. Keep an existing
  // token compatible during migration, but Cloud-project API access is canonical.
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (developerToken) headers["developer-token"] = developerToken;
  const res = await fetch(`${GOOGLE_ADS_ROOT}/${path}`, { headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const requestId = res.headers.get("request-id");
    const message = data?.error?.message || `Google Ads API HTTP ${res.status}`;
    return { ok:false as const, message: requestId ? `${message} · request ${requestId}` : message };
  }
  return { ok:true as const, data };
}

export async function probeOrgGoogleAdsAccounts(org: string): Promise<{ok:true;data:GoogleAdsAccount[];selectedCustomerIds:string[]}|{ok:false;message:string}> {
  const ensured = await ensureValidOrgGoogleAccessToken(org);
  if (!ensured.ok) return { ok:false, message:ensured.message };
  const granted = new Set((ensured.tokens.scope || "").split(/\s+/).filter(Boolean));
  if (!granted.has("https://www.googleapis.com/auth/adwords")) {
    return { ok:false, message:"Google Ads permission has not been authorised for this organisation — reconnect Google Ads." };
  }
  const result = await adsGet("customers:listAccessibleCustomers", ensured.accessToken);
  if (!result.ok) return { ok:false, message:result.message };
  const payload: { resourceNames?: unknown } = result.data && typeof result.data === "object" ? result.data as { resourceNames?: unknown } : {};
  const rawResourceNames = payload.resourceNames;
  const resourceNames: string[] = Array.isArray(rawResourceNames) ? rawResourceNames.filter((x: unknown): x is string => typeof x === "string") : [];
  const data = resourceNames.map((resourceName:string)=>({resourceName,customerId:resourceName.replace(/^customers\//,"")})).filter((x:GoogleAdsAccount)=>/^\d+$/.test(x.customerId));
  const selectedCustomerIds = (ensured.tokens.selectedGoogleAdsCustomerIds || []).filter(id=>data.some(x=>x.customerId===id));
  if (selectedCustomerIds.length !== (ensured.tokens.selectedGoogleAdsCustomerIds || []).length) {
    await saveOrgGoogleGbpConnectorTokens(org,{...ensured.tokens,selectedGoogleAdsCustomerIds});
  }
  return { ok:true, data, selectedCustomerIds };
}

export async function selectOrgGoogleAdsAccounts(org:string, customerIds:string[]) {
  const discovered = await probeOrgGoogleAdsAccounts(org);
  if (!discovered.ok) return discovered;
  const allowed = new Set(discovered.data.map(x=>x.customerId));
  const selected = [...new Set(customerIds.map(x=>x.replace(/\D/g,"")).filter(Boolean))];
  const invalid = selected.filter(id=>!allowed.has(id));
  if (invalid.length) return {ok:false as const,message:"One or more Google Ads accounts are not available to this organisation's Google connection."};
  const tokens = await getOrgGoogleGbpConnectorTokens(org);
  if (!tokens) return {ok:false as const,message:"Google is not connected for this organisation"};
  await saveOrgGoogleGbpConnectorTokens(org,{...tokens,selectedGoogleAdsCustomerIds:selected});
  return {ok:true as const,selectedCustomerIds:selected};
}
