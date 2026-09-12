import { AccommodationUnitsTable } from "@/components/accommodation/AccommodationUnitsTable";
import { loadUnitsForOps } from "@/lib/accommodation-units";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import type { WpAccUnitProp } from "@/lib/dg-api";

export default async function AccommodationUnitsPage() {
  const { session } = await getPlatformPageContext();
  const loaded = await loadUnitsForOps(session);
  const siteLabel = loaded.siteLabel ?? session?.organisationName ?? "Accommodation";

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · {siteLabel} · AccommodationUnit (Neon) · all
          listings including coming soon
        </p>
      </div>
      <AccommodationUnitsTable
        units={loaded.units as unknown as WpAccUnitProp[]}
        error={loaded.error}
        siteLabel={siteLabel}
        wpImportAvailable={loaded.wpImportAvailable}
        source={loaded.source}
      />
    </main>
  );
}
