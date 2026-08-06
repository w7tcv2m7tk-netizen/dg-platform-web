/** Dark theme for Clerk v7 — variables + layout; text contrast enforced in clerk-overrides.css */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#3b82f6",
    colorPrimaryForeground: "#ffffff",
    colorBackground: "#0f172a",
    colorForeground: "#f8fafc",
    colorMuted: "#1e293b",
    colorMutedForeground: "#e2e8f0",
    colorInput: "#1e293b",
    colorInputForeground: "#f8fafc",
    colorNeutral: "#ffffff",
    colorBorder: "#64748b",
    colorDanger: "#f87171",
    colorSuccess: "#34d399",
    colorWarning: "#fbbf24",
    colorRing: "#3b82f6",
    borderRadius: "0.75rem",
  },
  options: {
    logoPlacement: "none" as const,
    socialButtonsPlacement: "bottom" as const,
  },
  elements: {
    rootBox: "w-full",
    card: "bg-slate-900 border border-slate-600 shadow-2xl shadow-black/40",
    socialButtonsRoot: "!hidden",
    dividerRow: "!hidden",
    formButtonPrimary:
      "bg-blue-600 hover:bg-blue-500 text-white rounded-full normal-case font-semibold shadow-sm",
  },
};
