/** Canonical DigitalGate Clerk theme — variables + layout; text contrast enforced in clerk-overrides.css */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#7c3aed",
    colorPrimaryForeground: "#ffffff",
    colorBackground: "#0c0716",
    colorForeground: "#f8fafc",
    colorMuted: "#120b20",
    colorMutedForeground: "#e2e8f0",
    colorInput: "#120b20",
    colorInputForeground: "#f8fafc",
    colorNeutral: "#ffffff",
    colorBorder: "#4c1d95",
    colorDanger: "#f87171",
    colorSuccess: "#34d399",
    colorWarning: "#fbbf24",
    colorRing: "#a78bfa",
    borderRadius: "0.75rem",
  },
  options: {
    logoPlacement: "none" as const,
    socialButtonsPlacement: "bottom" as const,
  },
  elements: {
    rootBox: "w-full",
    card: "bg-[#0c0716] border border-violet-900/70 shadow-2xl shadow-black/40",
    socialButtonsRoot: "!hidden",
    dividerRow: "!hidden",
    formButtonPrimary:
      "bg-violet-600 hover:bg-violet-500 text-white rounded-full normal-case font-semibold shadow-sm",
  },
};
