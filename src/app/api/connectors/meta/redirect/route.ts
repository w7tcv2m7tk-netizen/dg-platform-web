import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ redirectUri: "https://app.digitalgate.com.au/api/connectors/meta/callback" }); }
