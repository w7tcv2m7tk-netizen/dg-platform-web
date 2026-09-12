import { listReBookings } from "@dg/platform-core";

import { ReBookingsPanel } from "@/components/re/ReBookingsPanel";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { canManageRealEstate } from "@/lib/real-estate-page-access";
import { SERVICES_DEFAULT_TZ } from "@/lib/services-dates";

export default async function ReBookingsPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const { prisma } = await import("@dg/database");
  const [bookings, organisation] = await Promise.all([
    listReBookings(session.organisationId, 50),
    prisma.organisation.findUnique({
      where: { id: session.organisationId },
      select: { timezone: true },
    }),
  ]);
  const canManage = canManageRealEstate(session);
  const timeZone = organisation?.timezone || SERVICES_DEFAULT_TZ;

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Appraisal bookings · {timeZone.replace(/_/g, " ")}
        </p>
        {!canManage ? (
          <p className="mt-1 text-xs text-slate-500">
            Read-only bookings. Organisation-wide Real Estate edit access is required to create appointments.
          </p>
        ) : null}
      </div>
      <ReBookingsPanel bookings={bookings} canCreate={canManage} timeZone={timeZone} />
    </main>
  );
}
