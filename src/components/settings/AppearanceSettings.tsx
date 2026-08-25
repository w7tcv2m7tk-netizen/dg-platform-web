"use client";

import {
  COLOR_SCHEME_OPTIONS,
  type ColorSchemePreference,
} from "@/lib/theme";
import { usePlatformThemeOptional } from "@/components/theme/PlatformThemeProvider";

export function AppearanceSettings() {
  const theme = usePlatformThemeOptional();

  if (!theme) {
    return (
      <div className="dg-card">
        <h2 className="font-semibold text-white">Appearance</h2>
        <p className="mt-2 text-sm text-slate-400">Theme controls are loading…</p>
      </div>
    );
  }

  const { preference, setPreference } = theme;

  return (
    <div className="dg-card border-sky-500/25">
      <p className="text-xs font-medium uppercase tracking-wide text-sky-400">Display</p>
      <h2 className="mt-1 font-semibold text-white">Appearance</h2>
      <p className="mt-2 text-sm text-slate-400">
        Choose how DigitalGate looks on this device. Light mode is for daytime work; dark remains
        the default.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {COLOR_SCHEME_OPTIONS.map((option) => {
          const active = preference === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setPreference(option.id as ColorSchemePreference)}
              aria-pressed={active}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? "border-sky-500/60 bg-sky-500/10 ring-1 ring-sky-500/30"
                  : "border-slate-700 bg-slate-950/40 hover:border-slate-500"
              }`}
            >
              <p className="text-sm font-semibold text-white">{option.label}</p>
              <p className="mt-1 text-xs text-slate-400">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
