import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import type { PlatformSetupStatus } from "../org/setup-status";
import type { IndustryReferenceBaseline } from "./industry-reference";
import { formatIndustryLabel, getIndustryReference } from "./industry-reference";

export type BenchmarkCohortId =
  | "similar"
  | "industry"
  | "local"
  | "size"
  | "digital_maturity"
  | "top_performers";

export type BenchmarkCohortOption = {
  id: BenchmarkCohortId;
  label: string;
  description: string;
};

export type BenchmarkCohortContext = {
  profile?: OrganisationBusinessProfile | null;
  setupStatus?: PlatformSetupStatus | null;
  digitalMaturityScore?: number;
  connectorCount?: number;
};

export type ResolvedBenchmarkCohort = {
  id: BenchmarkCohortId;
  label: string;
  description: string;
  reference: IndustryReferenceBaseline;
  comparisonLabels: {
    average: string;
    top: string;
  };
};

const COHORT_OPTIONS: BenchmarkCohortOption[] = [
  {
    id: "similar",
    label: "Businesses like mine",
    description: "Industry, market, and business size",
  },
  {
    id: "industry",
    label: "Industry",
    description: "Businesses in your industry",
  },
  {
    id: "local",
    label: "Local",
    description: "Businesses in your region",
  },
  {
    id: "size",
    label: "Business size",
    description: "Businesses of similar size",
  },
  {
    id: "digital_maturity",
    label: "Digital maturity",
    description: "Businesses with similar digital maturity",
  },
  {
    id: "top_performers",
    label: "Top performers",
    description: "Top 10% in your category",
  },
];

function clamp(value: number, min = 0, max = 100) {
  return Math.round(Math.max(min, Math.min(max, value)));
}

function cloneReference(base: IndustryReferenceBaseline): IndustryReferenceBaseline {
  return {
    label: base.label,
    categories: Object.fromEntries(
      Object.entries(base.categories).map(([key, value]) => [key, { ...value }]),
    ) as IndustryReferenceBaseline["categories"],
    metrics: Object.fromEntries(
      Object.entries(base.metrics).map(([key, value]) => [key, { ...value }]),
    ),
  };
}

function scaleCategories(
  reference: IndustryReferenceBaseline,
  medianFactor: number,
  topFactor: number,
) {
  for (const key of Object.keys(reference.categories) as Array<
    keyof IndustryReferenceBaseline["categories"]
  >) {
    const row = reference.categories[key];
    row.median = clamp(row.median * medianFactor);
    row.top25 = clamp(row.top25 * topFactor);
    if (row.top25 < row.median) row.top25 = row.median + 4;
  }
}

function scaleMetrics(
  reference: IndustryReferenceBaseline,
  medianFactor: number,
  topFactor: number,
) {
  for (const key of Object.keys(reference.metrics)) {
    const row = reference.metrics[key];
    if (row.decimal) {
      row.median = Math.round(row.median * medianFactor * 10) / 10;
      row.top25 = Math.round(row.top25 * topFactor * 10) / 10;
      if (row.top25 < row.median) row.top25 = Math.round((row.median + 0.2) * 10) / 10;
    } else {
      row.median = clamp(row.median * medianFactor);
      row.top25 = clamp(row.top25 * topFactor);
      if (row.top25 < row.median) row.top25 = row.median + 4;
    }
  }
}

function primaryLocation(profile?: OrganisationBusinessProfile | null): string | null {
  const loc = profile?.locations?.find((l) => l.isPrimary) ?? profile?.locations?.[0];
  const city = loc?.city ?? profile?.address?.city;
  const state = loc?.state ?? profile?.address?.state;
  if (city && state) return `${city} · ${state}`;
  if (city) return city;
  if (state) return state;
  return null;
}

function staffBand(setup?: PlatformSetupStatus | null): string {
  if (!setup?.hasTeamMember) return "Solo / 1–2 people";
  if ((setup.activityCount ?? 0) > 200 || (setup.contactCount ?? 0) > 500) return "11–50 staff";
  return "3–10 staff";
}

export function listBenchmarkCohortOptions(): BenchmarkCohortOption[] {
  return COHORT_OPTIONS;
}

export function parseBenchmarkCohortId(value?: string | null): BenchmarkCohortId {
  const allowed = new Set<BenchmarkCohortId>(COHORT_OPTIONS.map((option) => option.id));
  if (value && allowed.has(value as BenchmarkCohortId)) {
    return value as BenchmarkCohortId;
  }
  return "similar";
}

export function resolveBenchmarkCohort(
  cohortId: BenchmarkCohortId,
  context: BenchmarkCohortContext,
): ResolvedBenchmarkCohort {
  const base = getIndustryReference(context.profile?.industryVertical);
  const reference = cloneReference(base);
  const industryLabel = formatIndustryLabel(context.profile?.industryVertical);
  const location = primaryLocation(context.profile);
  const size = staffBand(context.setupStatus);
  const maturity = context.digitalMaturityScore ?? 50;
  const option = COHORT_OPTIONS.find((row) => row.id === cohortId) ?? COHORT_OPTIONS[0];

  switch (cohortId) {
    case "similar":
      return {
        id: cohortId,
        label: [industryLabel, location?.replace(" · ", " "), size].filter(Boolean).join(" · "),
        description: option.description,
        reference,
        comparisonLabels: { average: "Industry", top: "Top 25%" },
      };
    case "industry":
      return {
        id: cohortId,
        label: industryLabel,
        description: option.description,
        reference,
        comparisonLabels: { average: "Industry avg", top: "Top 25%" },
      };
    case "local": {
      scaleCategories(reference, 1.02, 1.04);
      scaleMetrics(reference, 1.02, 1.04);
      reference.categories.reputation.median += 3;
      reference.categories.reputation.top25 += 2;
      reference.categories.digital_presence.median += 2;
      return {
        id: cohortId,
        label: location ? `${location} businesses` : "Your region",
        description: option.description,
        reference,
        comparisonLabels: { average: "Local avg", top: "Top 25%" },
      };
    }
    case "size": {
      const solo = size.startsWith("Solo");
      const large = size.startsWith("11");
      if (solo) {
        scaleCategories(reference, 0.92, 0.95);
        reference.categories.automation.median -= 6;
        reference.categories.commercial.median -= 4;
      } else if (large) {
        scaleCategories(reference, 1.08, 1.06);
        reference.categories.automation.median += 6;
        reference.categories.customer_crm.median += 4;
      }
      return {
        id: cohortId,
        label: size,
        description: option.description,
        reference,
        comparisonLabels: { average: "Size cohort avg", top: "Top 25%" },
      };
    }
    case "digital_maturity": {
      const factor = maturity >= 70 ? 1.08 : maturity >= 45 ? 1 : 0.92;
      scaleCategories(reference, factor, factor + 0.04);
      reference.categories.ai_visibility.median = clamp(reference.categories.ai_visibility.median + (maturity >= 60 ? 4 : -4));
      reference.categories.automation.median = clamp(reference.categories.automation.median + (maturity >= 60 ? 5 : -5));
      const band =
        maturity >= 70 ? "Advanced" : maturity >= 45 ? "Developing" : "Early-stage";
      return {
        id: cohortId,
        label: `${band} digital maturity`,
        description: option.description,
        reference,
        comparisonLabels: { average: "Peer avg", top: "Top 25%" },
      };
    }
    case "top_performers": {
      for (const key of Object.keys(reference.categories) as Array<
        keyof IndustryReferenceBaseline["categories"]
      >) {
        const row = reference.categories[key];
        row.median = clamp(row.top25);
        row.top25 = clamp(row.top25 + 6, row.median + 2, 100);
      }
      for (const key of Object.keys(reference.metrics)) {
        const row = reference.metrics[key];
        if (row.decimal) {
          row.median = row.top25;
          row.top25 = Math.min(5, Math.round((row.top25 + 0.1) * 10) / 10);
        } else {
          row.median = row.top25;
          row.top25 = row.median + Math.max(4, Math.round(row.median * 0.08));
        }
      }
      return {
        id: cohortId,
        label: `Top 10% · ${industryLabel}`,
        description: "What it takes to become one of the best",
        reference,
        comparisonLabels: { average: "Top 10%", top: "Best in class" },
      };
    }
    default:
      return resolveBenchmarkCohort("similar", context);
  }
}
