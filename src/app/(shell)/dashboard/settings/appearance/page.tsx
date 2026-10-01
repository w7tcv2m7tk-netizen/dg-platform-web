import Link from "next/link";
import { SectionPageHeader } from "@/components/ui/SectionPageHeader";

import { AppearanceSettings } from "@/components/settings/AppearanceSettings";

export default function AppearanceSettingsPage() {
  return (
    <>
      <SectionPageHeader section="Settings" title="Appearance" />
      <main className="dg-page-main max-w-2xl space-y-6">
        <AppearanceSettings />
      </main>
    </>
  );
}
