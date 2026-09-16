import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ targets: ["Facebook Pages", "Instagram Professional accounts", "Meta ad accounts"], note: "Final OAuth permissions depend on enabled DigitalGate capabilities and Meta App Review/Advanced Access." });
}
