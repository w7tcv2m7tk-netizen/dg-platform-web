/** Platform colour scheme — user preference in localStorage. */

export const DG_COLOR_SCHEME_KEY = "dg-color-scheme";

export const COLOR_SCHEME_OPTIONS = [
  { id: "dark", label: "Dark", description: "Default DigitalGate shell" },
  { id: "light", label: "Light", description: "Bright surfaces for daytime work" },
  { id: "system", label: "System", description: "Match your device setting" },
] as const;

export type ColorSchemePreference = (typeof COLOR_SCHEME_OPTIONS)[number]["id"];
export type ResolvedColorScheme = "dark" | "light";

export function isColorSchemePreference(value: unknown): value is ColorSchemePreference {
  return value === "dark" || value === "light" || value === "system";
}

export function readColorSchemePreference(): ColorSchemePreference {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem(DG_COLOR_SCHEME_KEY);
    return isColorSchemePreference(raw) ? raw : "dark";
  } catch {
    return "dark";
  }
}

export function resolveColorScheme(
  preference: ColorSchemePreference,
  prefersLight?: boolean,
): ResolvedColorScheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  if (typeof prefersLight === "boolean") return prefersLight ? "light" : "dark";
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

export function applyResolvedColorScheme(resolved: ResolvedColorScheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

export function persistColorSchemePreference(preference: ColorSchemePreference) {
  try {
    window.localStorage.setItem(DG_COLOR_SCHEME_KEY, preference);
  } catch {
    /* private mode */
  }
  applyResolvedColorScheme(resolveColorScheme(preference));
}

/** Inline boot script — prevents light/dark flash before React hydrates. */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(DG_COLOR_SCHEME_KEY)};var p=localStorage.getItem(k)||"dark";var t=p;if(p==="system"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}if(t!=="light")t="dark";document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;}catch(e){}})();`;
