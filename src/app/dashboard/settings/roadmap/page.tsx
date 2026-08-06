import Link from "next/link";

import { PlatformRoadmapBar } from "@/components/platform/PlatformRoadmapBar";
import { PlatformRoadmapPanel } from "@/components/platform/PlatformRoadmapPanel";

export default function PlatformRoadmapSettingsPage() {
  return (
    <>
      <PlatformRoadmapBar />
      <header className="dg-page-header">
        <Link href="/dashboard/settings" className="text-sm text-blue-400 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Platform roadmap</h1>
        <p className="text-sm text-slate-400">
          What&apos;s shipped and what&apos;s next across Platform Gen 2
        </p>
      </header>
      <main className="dg-page-main">
        <PlatformRoadmapPanel />
      </main>
    </>
  );
}
