/**
 * DigitalGate Design System — single source of truth for UI.
 * Apps must use these components; do not build one-off UI unnecessarily.
 */

export const tokens = {
  colour: {
    brand: {
      blue: "#3b82f6",
      blueHover: "#2563eb",
      navy: "#0a0e17",
    },
    surface: {
      base: "#020617",
      raised: "#0f172a",
      card: "rgb(30 41 59 / 0.5)",
      border: "rgb(51 65 85)",
      borderStrong: "rgb(71 85 105)",
    },
    text: {
      primary: "#f8fafc",
      secondary: "#cbd5e1",
      muted: "#94a3b8",
      inverse: "#0f172a",
    },
    status: {
      success: "#34d399",
      warning: "#fbbf24",
      danger: "#f87171",
      info: "#60a5fa",
    },
  },
  radius: {
    md: "0.75rem",
    lg: "1rem",
    full: "9999px",
  },
  font: {
    sans: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  },
} as const;

export type Tokens = typeof tokens;
