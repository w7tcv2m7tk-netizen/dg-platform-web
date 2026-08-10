import type { SocialProfiles } from "@dg/platform-core";

export const SOCIAL_PROFILE_FIELDS = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "x", label: "X (Twitter)" },
  { key: "googleBusiness", label: "Google Business Profile" },
  { key: "youtube", label: "YouTube" },
] as const satisfies ReadonlyArray<{ key: keyof SocialProfiles; label: string }>;

export type SocialFieldKey = (typeof SOCIAL_PROFILE_FIELDS)[number]["key"];

export function getSocialUrl(social: SocialProfiles | undefined, key: SocialFieldKey): string {
  return social?.[key]?.trim() ?? "";
}

export function listSocialGaps(social: SocialProfiles | undefined): string[] {
  return SOCIAL_PROFILE_FIELDS.filter((field) => !getSocialUrl(social, field.key)).map(
    (field) => field.label,
  );
}

export function socialCompletenessPercent(social: SocialProfiles | undefined): number {
  const filled = SOCIAL_PROFILE_FIELDS.filter((field) => getSocialUrl(social, field.key)).length;
  return Math.round((filled / SOCIAL_PROFILE_FIELDS.length) * 100);
}
