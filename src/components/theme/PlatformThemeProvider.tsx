"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  applyResolvedColorScheme,
  persistColorSchemePreference,
  readColorSchemePreference,
  resolveColorScheme,
  type ColorSchemePreference,
  type ResolvedColorScheme,
} from "@/lib/theme";

type ThemeContextValue = {
  preference: ColorSchemePreference;
  resolved: ResolvedColorScheme;
  setPreference: (next: ColorSchemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function usePlatformTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("usePlatformTheme must be used within PlatformThemeProvider");
  }
  return ctx;
}

export function usePlatformThemeOptional() {
  return useContext(ThemeContext);
}

export function PlatformThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ColorSchemePreference>("dark");
  const [resolved, setResolved] = useState<ResolvedColorScheme>("dark");

  useEffect(() => {
    const initial = readColorSchemePreference();
    setPreferenceState(initial);
    const next = resolveColorScheme(initial);
    setResolved(next);
    applyResolvedColorScheme(next);
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const next = resolveColorScheme("system", mq.matches);
      setResolved(next);
      applyResolvedColorScheme(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((next: ColorSchemePreference) => {
    setPreferenceState(next);
    persistColorSchemePreference(next);
    setResolved(resolveColorScheme(next));
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
