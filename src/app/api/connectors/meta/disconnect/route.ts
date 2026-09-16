import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function POST() {
  return NextResponse.json({ error: { code: "meta_not_connected", message: "Meta OAuth is not enabled yet." } }, { status: 409 });
}
