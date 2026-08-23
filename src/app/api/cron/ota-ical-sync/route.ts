import { syncAllOrganisationsOtaCalendars } from "@dg/platform-core";
import { NextResponse } from "next/server";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization")?.trim() || "";
  const headerSecret = req.headers.get("x-cron-secret")?.trim() || "";
  const isVercelCron = Boolean(req.headers.get("x-vercel-cron"));

  if (secret) {
    if (auth === `Bearer ${secret}`) return true;
    if (headerSecret === secret) return true;
    return false;
  }

  return isVercelCron;
}

/** OTA iCal pulls can take a while across multiple units/orgs. */
export const maxDuration = 120;

/**
 * Every 15 minutes — pull Airbnb / Booking.com iCal feeds into Neon StayBooking.
 * Secure with CRON_SECRET (Authorization: Bearer …) or Vercel Cron header.
 *
 * Note: reduces double-book risk; does not eliminate iCal export polling lag on the OTA side.
 */
export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid cron secret" } },
      { status: 401 },
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
