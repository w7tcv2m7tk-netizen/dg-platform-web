export const GROWTH_APP_CATALOGUE = [
  { appId: "marketing", key: "marketing_pro", label: "DigitalGate Marketing", monthlyCents: 4900 },
  { appId: "prospecting", key: "prospecting_pro", label: "DigitalGate Prospecting & Opportunity Engine", monthlyCents: 9900 },
  { appId: "ai-visibility", key: "ai_visibility_pro", label: "DigitalGate AI Visibility", monthlyCents: 9900 },
  { appId: "seo", key: "seo_pro", label: "DigitalGate SEO", monthlyCents: 9900 },
  { appId: "automation", key: "automation_pro", label: "DigitalGate Automation", monthlyCents: 4900 },
  { appId: "analytics", key: "analytics_pro", label: "DigitalGate Analytics", monthlyCents: 4900 },
  { appId: "social", key: "social_pro", label: "DigitalGate Social", monthlyCents: 7900 },
  { appId: "reviews", key: "reviews_pro", label: "DigitalGate Reputation", monthlyCents: 2900 },
] as const;

export const PAID_APP_PRICES_CENTS = {
  marketing_pro: 4900,
  prospecting_pro: 9900,
  ai_visibility_pro: 9900,
  seo_pro: 9900,
  automation_pro: 4900,
  analytics_pro: 4900,
  social_pro: 7900,
  reviews_pro: 2900,
  voice_ai: 9900,
} as const;

export type PaidAppKey = keyof typeof PAID_APP_PRICES_CENTS;

export const PAID_APP_TO_APP_IDS: Record<PaidAppKey, readonly string[]> = {
  marketing_pro: ["marketing"],
  prospecting_pro: ["prospecting"],
  ai_visibility_pro: ["ai-visibility"],
  seo_pro: ["seo"],
  automation_pro: ["automation"],
  analytics_pro: ["analytics"],
  social_pro: ["social"],
  reviews_pro: ["reviews"],
  voice_ai: ["ai-communications"],
};

export const PAID_APP_LABELS: Record<PaidAppKey, string> = {
  marketing_pro: "DigitalGate Marketing",
  prospecting_pro: "DigitalGate Prospecting & Opportunity Engine",
  ai_visibility_pro: "DigitalGate AI Visibility",
  seo_pro: "DigitalGate SEO",
  automation_pro: "DigitalGate Automation",
  analytics_pro: "DigitalGate Analytics",
  social_pro: "DigitalGate Social",
  reviews_pro: "DigitalGate Reputation",
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
