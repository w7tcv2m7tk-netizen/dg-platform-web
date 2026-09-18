export type AdvertisingProvider = "google" | "meta" | "microsoft" | "linkedin" | "tiktok" | "pinterest" | "reddit";

export type AdvertisingChannelEvidence = {
  provider: AdvertisingProvider;
  period: "LAST_30_DAYS";
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number | null;
  conversionValue: number | null;
  reach: number | null;
  campaignCount: number;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  roas: number | null;
};

export type AdvertisingEvidence = {
  period: "LAST_30_DAYS";
  channels: AdvertisingChannelEvidence[];
  totals: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number | null;
    conversionValue: number | null;
    campaignCount: number;
  };
};

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

export function buildAdvertisingEvidence(channels: AdvertisingChannelEvidence[]): AdvertisingEvidence | null {
  if (!channels.length) return null;
  const spend = channels.reduce((n, x) => n + x.spend, 0);
  const impressions = channels.reduce((n, x) => n + x.impressions, 0);
  const clicks = channels.reduce((n, x) => n + x.clicks, 0);
  const conversions = channels.some((x) => x.conversions !== null)
    ? channels.reduce((n, x) => n + (x.conversions ?? 0), 0)
    : null;
  const conversionValue = channels.some((x) => x.conversionValue !== null)
    ? channels.reduce((n, x) => n + (x.conversionValue ?? 0), 0)
    : null;
  return { period: "LAST_30_DAYS", channels, totals: { spend, impressions, clicks, conversions, conversionValue, campaignCount: channels.reduce((n, x) => n + x.campaignCount, 0) } };
}

export function withDerivedAdvertisingMetrics(input: Omit<AdvertisingChannelEvidence, "ctr" | "cpc" | "cpa" | "roas">): AdvertisingChannelEvidence {
  return {
    ...input,
    ctr: ratio(input.clicks, input.impressions),
    cpc: ratio(input.spend, input.clicks),
    cpa: input.conversions === null ? null : ratio(input.spend, input.conversions),
    roas: input.conversionValue === null ? null : ratio(input.conversionValue, input.spend),
  };
}
