import { getConsultationAvailability } from "@dg/platform-core";
import { NextResponse } from "next/server";

/**
 * Public Platform Consultation availability (AEST).
 * Booked slots and the 30-minute buffer after each booking are omitted.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateIso = url.searchParams.get("date")?.trim() || "";
  const siteSlug = url.searchParams.get("site")?.trim() || "digitalgate";

  const result = await getConsultationAvailability({ dateIso, siteSlug });
  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 422;
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status },
    );
  }

  return NextResponse.json({
    data: {
      date: result.date,
      timezone: result.timezone,
      slots: result.slots,
      closed: result.closed,
    },
  });
}
