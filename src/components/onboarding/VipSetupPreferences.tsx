"use client";

import { useMemo, useState } from "react";

const TIMEZONES = [
  "Australia/Brisbane",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Adelaide",
  "Australia/Perth",
  "Pacific/Auckland",
  "UTC",
];

export function VipSetupPreferences() {
  const [appearance, setAppearance] = useState("system");
  const [timezone, setTimezone] = useState("Australia/Brisbane");
  const [primary, setPrimary] = useState("#3b82f6");
  const [accent, setAccent] = useState("#10b981");
  const preview = useMemo(() => ({ "--vip-primary": primary, "--vip-accent": accent }) as React.CSSProperties, [primary, accent]);

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5" style={preview}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Platform preferences</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Make the workspace feel like yours</h3>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/45">VIP setup</span>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <label className="text-sm text-white/70">
          Appearance
          <select value={appearance} onChange={(e) => setAppearance(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-white">
            <option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option>
          </select>
        </label>
        <label className="text-sm text-white/70">
          Timezone
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-white">
            {TIMEZONES.map((zone) => <option key={zone}>{zone}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-5 rounded-xl border border-white/[0.08] bg-black/20 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Brand palette</p>
            <p className="mt-1 text-xs leading-5 text-white/45">When your logo is uploaded, DigitalGate will propose colours from the artwork. You can always override them.</p>
          </div>
          <div className="flex gap-2">
            <span className="h-9 w-9 rounded-full border border-white/15" style={{ background: primary }} />
            <span className="h-9 w-9 rounded-full border border-white/15" style={{ background: accent }} />
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-white/55">Primary colour<input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-transparent p-1" /></label>
          <label className="text-xs text-white/55">Accent colour<input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-transparent p-1" /></label>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-white/35">Currency and locale are prepared in the setup profile so they can become customer-configurable without changing the onboarding model later.</p>
    </section>
  );
}
