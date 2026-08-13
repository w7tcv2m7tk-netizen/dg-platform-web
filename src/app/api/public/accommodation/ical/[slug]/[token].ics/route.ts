import {
  buildUnitIcalFeed,
  findUnitForPublicIcal,
  parseIcalForChannel,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string; token: string }> };

/**
 * Public DigitalGate → OTA iCal export (Airbnb / Booking.com import URL).
 * Token matches the unit’s WordPress `/ical/{slug}/{token}.ics` secret.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { slug, token: rawToken } = await ctx.params;
  const token = rawToken.replace(/\.ics$/i, "");
  const forChannel = parseIcalForChannel(new URL(req.url).searchParams.get("for"));

  const unit = await findUnitForPublicIcal(slug, token);
  if (!unit) {
    return new NextResponse("Unauthorized", {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  }

  const body = await buildUnitIcalFeed(unit, forChannel);
  const filename = `${unit.slug || "calendar"}.ics`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-cache, must-revalidate",
      "X-Robots-Tag": "noindex",
      // OTAs fetch without cookies; allow any Origin for calendar clients.
      "Access-Control-Allow-Origin": "*",
    },
  });
}
