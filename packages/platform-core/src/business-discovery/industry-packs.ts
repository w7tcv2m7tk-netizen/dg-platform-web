import type { IndustryPack, IndustryPackId } from "./types";

const PACKS: IndustryPack[] = [
  {
    id: "real_estate",
    label: "Real Estate",
    searchTerms: ["real estate agency", "real estate agent", "buyers agent"],
    auditFocus: [
      "vendor acquisition",
      "listings visibility",
      "AI visibility",
      "local SEO",
    ],
  },
  {
    id: "finance",
    label: "Finance",
    searchTerms: ["mortgage broker", "finance broker", "financial adviser"],
    auditFocus: ["lead generation", "finance enquiries", "SEO", "trust signals"],
  },
  {
    id: "trades",
    label: "Trades",
    searchTerms: ["plumber", "electrician", "builder", "carpenter"],
    auditFocus: ["local search", "calls", "quote enquiries", "reviews"],
  },
  {
    id: "professional",
    label: "Professional Services",
    searchTerms: ["accountant", "solicitor", "lawyer", "bookkeeper"],
    auditFocus: ["authority", "enquiries", "conversion", "content"],
  },
  {
    id: "accommodation",
    label: "Accommodation",
    searchTerms: ["holiday house", "motel", "boutique hotel", "short stay"],
    auditFocus: ["direct bookings", "reviews", "visibility", "OTA dependence"],
  },
  {
    id: "automotive",
    label: "Automotive",
    searchTerms: ["car dealer", "auto mechanic", "tyre shop"],
    auditFocus: ["inventory", "enquiries", "test drives", "local SEO"],
  },
  {
    id: "general",
    label: "General business",
    searchTerms: ["business"],
    auditFocus: ["website", "local visibility", "conversion", "reputation"],
  },
];

export function listIndustryPacks(): IndustryPack[] {
  return PACKS;
}

export function resolveIndustryPack(
  industry?: string | null,
  businessType?: string | null,
): IndustryPack {
  const hay = `${industry ?? ""} ${businessType ?? ""}`.toLowerCase();
  if (!hay.trim()) return PACKS.find((p) => p.id === "general")!;

  const rules: Array<{ id: IndustryPackId; needles: string[] }> = [
    {
      id: "real_estate",
      needles: ["real estate", "realty", "property", "buyers agent", "agency"],
    },
    {
      id: "finance",
      needles: ["mortgage", "broker", "finance", "financial", "lending"],
    },
    {
      id: "trades",
      needles: ["plumber", "electric", "builder", "trade", "carpenter", "hvac"],
    },
    {
      id: "professional",
      needles: ["account", "solicitor", "lawyer", "legal", "bookkeep", "advisor"],
    },
    {
      id: "accommodation",
      needles: ["accommodation", "hotel", "motel", "holiday", "airbnb", "stay"],
    },
    {
      id: "automotive",
      needles: ["auto", "car ", "vehicle", "mechanic", "dealer", "tyre"],
    },
  ];

  for (const rule of rules) {
    if (rule.needles.some((n) => hay.includes(n))) {
      return PACKS.find((p) => p.id === rule.id)!;
    }
  }

  return PACKS.find((p) => p.id === "general")!;
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
