/**
 * Light trial / first-steps path for Business Setup.
 * Honest signals only — no invented Domain publish or Google GBP sync state.
 */

import type { OrganisationBusinessProfile } from "../org/business-profile-types";

export type BusinessSetupFirstStepId =
  | "identify"
  | "profile"
  | "domain"
  | "website"
  | "google";

export type BusinessSetupFirstStep = {
  id: BusinessSetupFirstStepId;
  label: string;
  description: string;
  href: string;
  /** True only from measurable profile / identity signals */
  done: boolean;
  ctaLabel: string;
  /** When true, step is a link-out CTA (not a deep sync claim) */
  linkOut?: boolean;
};

export type BusinessSetupFirstStepsProgress = {
  steps: BusinessSetupFirstStep[];
  completed: number;
  total: number;
  percent: number;
  identifyDone: boolean;
  profileSeeded: boolean;
};

/** ABN or ACN already on Business Profile = Identify complete. */
export function isBusinessIdentityOnProfile(
  profile?: OrganisationBusinessProfile | null,
): boolean {
  return Boolean(profile?.abn?.trim() || profile?.acn?.trim());
}

/** Legal/trading name present after Identify (or onboarding seed). */
export function isBusinessProfileSeeded(
  profile?: OrganisationBusinessProfile | null,
): boolean {
  return Boolean(
    profile?.businessName?.trim() || profile?.tradingName?.trim(),
  );
}

/**
 * First steps for new businesses: Identify → Profile → Domain / Website / Google.
 * Domain / Website / Google are CTAs only — done flags use profile fields when present.
 */
export function buildBusinessSetupFirstSteps(
  profile?: OrganisationBusinessProfile | null,
): BusinessSetupFirstStepsProgress {
  const identifyDone = isBusinessIdentityOnProfile(profile);
  const profileSeeded = isBusinessProfileSeeded(profile);
  const websiteLinked = Boolean(profile?.websiteUrl?.trim());
  const googleLinked = Boolean(profile?.social?.googleBusiness?.trim());

  const steps: BusinessSetupFirstStep[] = [
    {
      id: "identify",
      label: "Verify identity",
      description: "Look up ABN / ACN on the ABR, then apply to your profile.",
      href: "/onboarding#identify",
      done: identifyDone,
      ctaLabel: identifyDone ? "Re-verify" : "Verify ABN",
    },
    {
      id: "profile",
      label: "Business Profile",
      description: "Confirm legal name, trading name, and contacts every app reads.",
      href: "/dashboard/business",
      done: profileSeeded,
      ctaLabel: profileSeeded ? "Open profile" : "Review profile",
    },
    {
      id: "domain",
      label: "Domain",
      description: "Search or connect a domain when you are ready.",
      href: "/apps/infrastructure/domains",
      done: false,
      ctaLabel: "Open Domains",
      linkOut: true,
    },
    {
      id: "website",
      label: "Website",
      description: websiteLinked
        ? "Website URL is on your Business Profile."
        : "Add or build a site — link out to Websites.",
      href: "/apps/websites",
      done: websiteLinked,
      ctaLabel: websiteLinked ? "Open Websites" : "Connect website",
      linkOut: true,
    },
    {
      id: "google",
      label: "Google Business",
      description: googleLinked
        ? "Google Business URL is saved on your profile."
        : "Add your Google Business Profile URL via connectors / profile.",
      href: "/dashboard/settings/connectors",
      done: googleLinked,
      ctaLabel: googleLinked ? "Connectors" : "Connect Google",
      linkOut: true,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return {
    steps,
    completed,
    total,
    percent,
    identifyDone,
    profileSeeded,
  };
}
