import { listReBookings } from "@dg/platform-core";

import { ReBookingsPanel } from "@/components/re/ReBookingsPanel";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function ReBookingsPage() {
  const { session } = await getPlatformPageContext();
  const bookings = session ? await listReBookings(session.organisationId, 50) : [];

  return (
    <main className="dg-page-main space-y-6">
      <p className="text-sm text-slate-400">
        {session?.organisationName ?? "Real Estate"} · Platform Core / Neon bookings
      </p>
      <ReBookingsPanel bookings={bookings} />
    </main>
  );
}
