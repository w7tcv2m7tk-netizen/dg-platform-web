export const GROWTH_SUITE_MONTHLY_CENTS = 39900;
export const GROWTH_SUITE_WITH_INDUSTRY_MONTHLY_CENTS = 49900;

export const GROWTH_APP_CATALOGUE = [
  { appId: "advertising", key: "advertising_pro", label: "DigitalGate Advertising", monthlyCents: 9900, included: false },
  { appId: "marketing", key: "marketing_pro", label: "DigitalGate Marketing", monthlyCents: 9900, included: false },
  { appId: "prospecting", key: "prospecting_pro", label: "DigitalGate Prospecting & Opportunity Engine", monthlyCents: 9900, included: false },
  { appId: "ai-visibility", key: "ai_visibility_pro", label: "DigitalGate AI Visibility", monthlyCents: 9900, included: false },
  { appId: "seo", key: "seo_pro", label: "DigitalGate SEO", monthlyCents: 9900, included: false },
  { appId: "automation", key: "automation_pro", label: "DigitalGate Automation", monthlyCents: 4900, included: false },
  { appId: "analytics", key: "analytics_pro", label: "DigitalGate Analytics", monthlyCents: 4900, included: false },
  { appId: "social", key: "social_pro", label: "DigitalGate Social", monthlyCents: 7900, included: false },
  { appId: "reviews", key: null, label: "DigitalGate Reviews & Reputation", monthlyCents: 0, included: true },
] as const;

export const PAID_APP_PRICES_CENTS = {
  advertising_pro: 9900,
  growth_suite: GROWTH_SUITE_MONTHLY_CENTS,
  marketing_pro: 9900,
  prospecting_pro: 9900,
  ai_visibility_pro: 9900,
  seo_pro: 9900,
  automation_pro: 4900,
  analytics_pro: 4900,
  social_pro: 7900,
  voice_ai: 9900,
} as const;

export type PaidAppKey = keyof typeof PAID_APP_PRICES_CENTS;

export const PAID_APP_TO_APP_IDS: Record<PaidAppKey, readonly string[]> = {
  advertising_pro: ["advertising"],
  growth_suite: ["advertising", "marketing", "prospecting", "ai-visibility", "seo", "automation", "analytics", "social", "reviews"],
  marketing_pro: ["marketing"],
  prospecting_pro: ["prospecting"],
  ai_visibility_pro: ["ai-visibility"],
  seo_pro: ["seo"],
  automation_pro: ["automation"],
  analytics_pro: ["analytics"],
  social_pro: ["social"],
  voice_ai: ["ai-communications"],
};

export const PAID_APP_LABELS: Record<PaidAppKey, string> = {
  advertising_pro: "DigitalGate Advertising",
  growth_suite: "DigitalGate Growth Suite",
  marketing_pro: "DigitalGate Marketing",
  prospecting_pro: "DigitalGate Prospecting & Opportunity Engine",
  ai_visibility_pro: "DigitalGate AI Visibility",
  seo_pro: "DigitalGate SEO",
  automation_pro: "DigitalGate Automation",
  analytics_pro: "DigitalGate Analytics",
  social_pro: "DigitalGate Social",
  voice_ai: "DigitalGate Advanced AI Communications",
};

export function normalisePaidAppKeys(values: unknown): PaidAppKey[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<PaidAppKey>();
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const key = raw.trim() as PaidAppKey;
    if (key in PAID_APP_PRICES_CENTS) seen.add(key);
  }
  return [...seen];
}

export function paidAppCheckoutLines(values: unknown): Array<{ key: PaidAppKey; amountCents: number; name: string }> {
  return normalisePaidAppKeys(values).map((key) => ({ key, amountCents: PAID_APP_PRICES_CENTS[key], name: PAID_APP_LABELS[key] }));
}

export function paidAppIdsFromKeys(values: unknown): string[] {
  const ids = new Set<string>();
  for (const key of normalisePaidAppKeys(values)) for (const appId of PAID_APP_TO_APP_IDS[key]) ids.add(appId);
  return [...ids];
}

export function paidAppKeyForAppId(appId: string): PaidAppKey | null {
  for (const [key, appIds] of Object.entries(PAID_APP_TO_APP_IDS) as Array<[PaidAppKey, readonly string[]]>) if (appIds.includes(appId)) return key;
  return null;
}
