import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ error: { code: "meta_oauth_not_enabled", message: "Meta OAuth is being configured. Add the DigitalGate Meta app credentials before enabling connections." } }, { status: 503 });
}
