import type { OrgBrandTheme } from "@dg/platform-core";

/** Clerk appearance tuned to the active org brand primary colour. */
export function clerkAppearanceForBrand(theme?: OrgBrandTheme | null) {
  const primary = theme?.primaryColor ?? "#3b82f6";

  return {
    variables: {
      colorPrimary: primary,
      colorRing: primary,
    },
    elements: {
      avatarBox: "h-9 w-9 rounded-full ring-1 ring-slate-600",
      userButtonAvatarBox: "h-9 w-9",
      userButtonTrigger: "focus:shadow-none",
    },
  };
}
