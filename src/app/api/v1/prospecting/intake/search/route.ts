import { AcquisitionError, searchProspectIntake } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { isNextResponse } from "@/lib/platform-api";
import { requireProspectingEngine } from "@/lib/prospecting-api";

export async function POST(req: Request) {
  const session = await requireProspectingEngine(req, "command.growth.manage");
  if (isNextResponse(session)) return session;
  const body = await req.json().catch(() => null);
  if (!body || !["name", "abn"].includes(body.mode) || typeof body.query !== "string" || (body.location !== undefined && typeof body.location !== "string"))
    return NextResponse.json({ error: { code: "validation_error", message: "Business name or ABN search is required" } }, { status: 422 });
  try {
    return NextResponse.json({ data: await searchProspectIntake({ mode: body.mode, query: body.query, location: body.location }) });
  } catch (error) {
    if (error instanceof AcquisitionError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    return NextResponse.json({ error: { code: "search_unavailable", message: "Business search is unavailable. Try again shortly." } }, { status: 503 });
  }
}
