import type { IndustryPack, IndustryPackId } from "./types";

/**
 * One Prospecting Engine → industry-aware discovery defaults.
 * Same underlying search/import/score pipeline; experience adapts per Industry App.
 */
const PACKS: IndustryPack[] = [
  {
    id: "real_estate",
    label: "Real Estate (B2B)",
    searchTerms: ["real estate agency", "buyers agent", "property marketing"],
    auditFocus: ["listing velocity", "suburb SEO", "Google Business Profile", "lead forms"],
    /** Business Discovery only — residential vendors live in RE Vendor Prospecting. */
    targetHints: [
      "Target agencies",
      "B2B partners / referrers",
      "Agency digital opportunity",
      "Local market intelligence (agency)",
    ],
    defaultBusinessType: "Real Estate Agency",
    defaultLocationHint: "Gold Coast, QLD",
  },
  {
    id: "finance",
    label: "Finance",
    searchTerms: ["mortgage broker", "finance broker", "accountant", "financial adviser"],
    auditFocus: ["lead forms", "trust signals", "compliance pages", "review volume"],
    targetHints: [
      "Target businesses / referrers",
      "Lending opportunities",
      "Commercial prospects",
      "Referral opportunities",
    ],
    defaultBusinessType: "Mortgage Broker",
    defaultLocationHint: "Brisbane, QLD",
  },
  {
    id: "services",
    label: "Services",
    searchTerms: ["local service business", "professional services"],
    auditFocus: ["service pages", "local SEO", "quote forms", "review velocity"],
    targetHints: ["Target businesses", "Local opportunities", "Service-fit scoring"],
    defaultBusinessType: "Local Service Business",
    defaultLocationHint: "Gold Coast, QLD",
  },
  {
    id: "digitalgate",
    label: "DigitalGate / Platform",
    searchTerms: ["digital agency", "marketing agency", "IT consultancy", "software reseller"],
    auditFocus: ["positioning", "case studies", "outbound readiness", "partner fit"],
    targetHints: [
      "Target potential customers",
      "Agency prospects",
      "Partner prospects",
      "Reseller opportunities",
    ],
    defaultBusinessType: "Marketing Agency",
    defaultLocationHint: "Australia",
  },
  {
    id: "trades",
    label: "Trades",
    searchTerms: ["plumber", "electrician", "builder", "landscaper"],
    auditFocus: ["call tracking", "GBP photos", "service area pages", "quote speed"],
    targetHints: ["Target trade businesses", "Suburb opportunities", "Service-area fit"],
    defaultBusinessType: "Trade Business",
    defaultLocationHint: "Gold Coast, QLD",
  },
  {
    id: "professional",
    label: "Professional services",
    searchTerms: ["solicitor", "accountant", "consultant", "architect"],
    auditFocus: ["expertise content", "trust pages", "enquiry forms", "directories"],
    targetHints: ["Target practices", "Referral partners", "Local professionals"],
    defaultBusinessType: "Professional Practice",
    defaultLocationHint: "Brisbane, QLD",
  },
  {
    id: "accommodation",
    label: "Accommodation",
    searchTerms: ["hotel", "motel", "holiday apartment", "bnb"],
    auditFocus: ["OTA dependency", "direct booking", "GBP", "seasonality"],
    targetHints: ["Target properties", "Direct-booking opportunities", "Local stays"],
    defaultBusinessType: "Accommodation",
    defaultLocationHint: "Gold Coast, QLD",
  },
  {
    id: "automotive",
    label: "Automotive",
    searchTerms: ["car dealership", "mechanic", "auto electrician"],
    auditFocus: ["inventory pages", "service booking", "reviews", "maps"],
    targetHints: ["Target dealers", "Service opportunities", "Local automotive"],
    defaultBusinessType: "Automotive Business",
    defaultLocationHint: "Gold Coast, QLD",
  },
  {
    id: "general",
    label: "General SMB",
    searchTerms: ["local business"],
    auditFocus: ["website", "maps", "reviews", "contactability"],
    targetHints: ["Target businesses", "Local opportunities", "Fit scoring"],
    defaultBusinessType: "Local Business",
    defaultLocationHint: "Gold Coast, QLD",
  },
];

export function listIndustryPacks(): IndustryPack[] {
  return [...PACKS];
}

export function getIndustryPack(id: IndustryPackId): IndustryPack {
  return PACKS.find((p) => p.id === id) ?? PACKS.find((p) => p.id === "general")!;
}

/**
 * Resolve pack from org industry / Industry App / free-text.
 * Prefer explicit Industry App verticals when present.
 */
export function resolveIndustryPack(
  industry?: string | null,
  businessType?: string | null,
): IndustryPack {
  const hay = `${industry ?? ""} ${businessType ?? ""}`.toLowerCase().trim();
  if (!hay) return getIndustryPack("general");

  const verticalMap: Array<{ id: IndustryPackId; needles: string[] }> = [
    { id: "digitalgate", needles: ["digitalgate", "software", "saas", "platform operator"] },
    { id: "real_estate", needles: ["real estate", "real_estate", "real-estate", "property", "agency"] },
    { id: "finance", needles: ["finance", "mortgage", "broker", "lending", "accountant"] },
    { id: "services", needles: ["services", "cleaner", "cleaning", "service business"] },
    { id: "trades", needles: ["trade", "plumber", "electric", "builder", "hvac"] },
    {
      id: "professional",
      needles: ["lawyer", "solicitor", "accountant", "consultant", "architect", "professional"],
    },
    { id: "accommodation", needles: ["accommodation", "hotel", "motel", "holiday", "airbnb", "stay"] },
    { id: "automotive", needles: ["auto", "car ", "vehicle", "mechanic", "dealer", "tyre"] },
  ];

  for (const rule of verticalMap) {
    if (rule.needles.some((n) => hay.includes(n))) {
      return getIndustryPack(rule.id);
    }
  }

  return getIndustryPack("general");
}

/** Build a Places / search text query from filters. */
export function buildDiscoveryTextQuery(input: {
  industry?: string;
  location?: string;
  businessType?: string;
  q?: string;
}): string {
  const q = input.q?.trim();
  if (q) {
    return input.location?.trim() ? `${q} in ${input.location.trim()}` : q;
  }

  const pack = resolveIndustryPack(input.industry, input.businessType);
  const type =
    input.businessType?.trim() ||
    input.industry?.trim() ||
    pack.searchTerms[0] ||
    "business";
  const location = input.location?.trim();
  return location ? `${type} in ${location}` : type;
}
