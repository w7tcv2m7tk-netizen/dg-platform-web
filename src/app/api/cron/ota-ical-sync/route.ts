import { syncAllOrganisationsOtaCalendars } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/lib/cron-auth";


/** OTA iCal pulls can take a while across multiple units/orgs. */
export const maxDuration = 120;

/**
 * Every 15 minutes — pull Airbnb / Booking.com iCal feeds into Neon StayBooking.
 * Secure with CRON_SECRET (Authorization: Bearer …) or Vercel Cron header.
 *
 * Note: reduces double-book risk; does not eliminate iCal export polling lag on the OTA side.
 */
export async function GET(req: Request) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.message } },
      { status: auth.code === "cron_not_configured" ? 503 : 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        error: {
          code: "database_not_configured",
          message: "DATABASE_URL not set",
        },
      },
      { status: 503 },
    );
  }

  const result = await syncAllOrganisationsOtaCalendars({ limitOrgs: 50 });
  return NextResponse.json({ data: result });
}

export async function POST(req: Request) {
  return GET(req);
}
