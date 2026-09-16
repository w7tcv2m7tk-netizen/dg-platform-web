import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function POST() {
  return NextResponse.json({ error: { code: "meta_not_connected", message: "Connect Meta before selecting business resources." } }, { status: 409 });
}
