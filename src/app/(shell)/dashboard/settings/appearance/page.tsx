import Link from "next/link";

import { AppearanceSettings } from "@/components/settings/AppearanceSettings";

export default function AppearanceSettingsPage() {
  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard/settings" className="text-sm text-sky-400 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Appearance</h1>
        <p className="mt-1 text-sm text-slate-400">
          Light or dark shell for this device — DigitalGate default stays dark.
        </p>
      </header>
      <main className="dg-page-main max-w-2xl space-y-6">
        <AppearanceSettings />
      </main>
    </>
  );
}
