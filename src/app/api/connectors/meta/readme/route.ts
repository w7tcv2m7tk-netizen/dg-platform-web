import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ phase: "setup", next: "configure META_APP_ID and META_APP_SECRET, then implement organisation-scoped OAuth" }); }
