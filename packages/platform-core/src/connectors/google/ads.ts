import { ensureValidOrgGoogleAccessToken, getOrgGoogleGbpConnectorTokens, saveOrgGoogleGbpConnectorTokens } from "./auth";

const GOOGLE_ADS_VERSION = process.env.GOOGLE_ADS_API_VERSION?.trim() || "v25";
const GOOGLE_ADS_ROOT = `https://googleads.googleapis.com/${GOOGLE_ADS_VERSION}`;

export type GoogleAdsAccount = { customerId: string; resourceName: string };
export type GoogleAdsCampaignEvidence = { id: string; name: string; status: string | null; impressions: number; clicks: number; conversions: number; conversionsValue: number; cost: number };
export type GoogleAdsEvidence = { customerId: string; period: "LAST_30_DAYS"; campaigns: GoogleAdsCampaignEvidence[]; performance: { spend: number; impressions: number; clicks: number; conversions: number; conversionsValue: number } };

async function adsGet(path: string, accessToken: string) {
  const headers: Record<string,string> = { Authorization: `Bearer ${accessToken}`, Accept: "application/json" };
  // Google sunset developer-token enforcement on 9 Sep 2026. Keep an existing
  // token compatible during migration, but Cloud-project API access is canonical.
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (developerToken) headers["developer-token"] = developerToken;
  const res = await fetch(`${GOOGLE_ADS_ROOT}/${path}`, { headers });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) as unknown : null; } catch { data = text; }
  if (!res.ok) {
    const requestId = res.headers.get("request-id");
    const message = data && typeof data === "object" && "error" in data && (data as { error?: unknown }).error && typeof (data as { error?: { message?: unknown } }).error?.message === "string"
      ? (data as { error: { message: string } }).error.message
      : `Google Ads API HTTP ${res.status}`;
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
    await saveOrgGoogleGbpConnectorTokens(org, { ...ensured.tokens, selectedGoogleAdsCustomerIds: selectedCustomerIds });
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


function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function numeric(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
  return 0;
}

async function adsPost(path: string, accessToken: string, body: unknown) {
  const headers: Record<string,string> = { Authorization: `Bearer ${accessToken}`, Accept: "application/json", "Content-Type": "application/json" };
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (developerToken) headers["developer-token"] = developerToken;
  const res = await fetch(`${GOOGLE_ADS_ROOT}/${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) as unknown : null; } catch { data = text; }
  if (!res.ok) {
    const requestId = res.headers.get("request-id");
    const record = asRecord(data); const error = asRecord(record?.error);
    const message = typeof error?.message === "string" ? error.message : `Google Ads API HTTP ${res.status}`;
    return { ok:false as const, message: requestId ? `${message} · request ${requestId}` : message };
  }
  return { ok:true as const, data };
}

export async function fetchOrgGoogleAdsEvidence(org: string): Promise<{ok:true;data:GoogleAdsEvidence[]}|{ok:false;message:string}> {
  const ensured = await ensureValidOrgGoogleAccessToken(org);
  if (!ensured.ok) return { ok:false, message:ensured.message };
  const selected = ensured.tokens.selectedGoogleAdsCustomerIds || [];
  if (!selected.length) return { ok:true, data:[] };
  const evidence: GoogleAdsEvidence[] = [];
  const query = "SELECT campaign.id, campaign.name, campaign.status, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC";
  for (const customerId of selected) {
    const result = await adsPost(`customers/${customerId}/googleAds:searchStream`, ensured.accessToken, { query });
    if (!result.ok) return { ok:false, message:`Google Ads customer ${customerId}: ${result.message}` };
    const batches = Array.isArray(result.data) ? result.data : [];
    const campaigns: GoogleAdsCampaignEvidence[] = [];
    for (const batch of batches) {
      const batchRecord = asRecord(batch); const rows = Array.isArray(batchRecord?.results) ? batchRecord.results : [];
      for (const row of rows) {
        const rowRecord = asRecord(row); const campaign = asRecord(rowRecord?.campaign); const metrics = asRecord(rowRecord?.metrics);
        if (!campaign) continue;
        const id = String(campaign.id ?? ""); if (!id) continue;
        campaigns.push({ id, name: typeof campaign.name === "string" ? campaign.name : id, status: typeof campaign.status === "string" ? campaign.status : null, impressions:numeric(metrics?.impressions), clicks:numeric(metrics?.clicks), conversions:numeric(metrics?.conversions), conversionsValue:numeric(metrics?.conversionsValue), cost:numeric(metrics?.costMicros)/1_000_000 });
      }
    }
    evidence.push({ customerId, period:"LAST_30_DAYS", campaigns, performance: campaigns.reduce((a,x)=>({spend:a.spend+x.cost,impressions:a.impressions+x.impressions,clicks:a.clicks+x.clicks,conversions:a.conversions+x.conversions,conversionsValue:a.conversionsValue+x.conversionsValue}),{spend:0,impressions:0,clicks:0,conversions:0,conversionsValue:0}) });
  }
  return { ok:true, data:evidence };
}
