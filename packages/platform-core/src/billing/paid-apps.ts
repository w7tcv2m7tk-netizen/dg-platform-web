export const PAID_APP_PRICES_CENTS = {
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
  prospecting_pro: ["prospecting"],
  ai_visibility_pro: ["ai-visibility"],
  seo_pro: ["seo"],
  automation_pro: ["automation"],
  analytics_pro: ["analytics"],
  social_pro: ["social"],
  voice_ai: ["ai-communications"],
};

export const PAID_APP_LABELS: Record<PaidAppKey, string> = {
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

export function paidAppCheckoutLines(values: unknown): Array<{
  key: PaidAppKey;
  amountCents: number;
  name: string;
}> {
  return normalisePaidAppKeys(values).map((key) => ({
    key,
    amountCents: PAID_APP_PRICES_CENTS[key],
    name: PAID_APP_LABELS[key],
  }));
}

export function paidAppIdsFromKeys(values: unknown): string[] {
  const ids = new Set<string>();
  for (const key of normalisePaidAppKeys(values)) {
    for (const appId of PAID_APP_TO_APP_IDS[key]) ids.add(appId);
  }
  return [...ids];
}

export function paidAppKeyForAppId(appId: string): PaidAppKey | null {
  for (const [key, appIds] of Object.entries(PAID_APP_TO_APP_IDS) as Array<
    [PaidAppKey, readonly string[]]
  >) {
    if (appIds.includes(appId)) return key;
  }
  return null;
}
