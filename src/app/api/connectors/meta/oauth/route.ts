import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ enabled: false, reason: "organisation_token_store_pending" }, { status: 503 }); }
