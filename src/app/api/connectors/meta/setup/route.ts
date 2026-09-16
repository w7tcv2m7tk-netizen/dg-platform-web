import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ requiredEnvironment: ["META_APP_ID", "META_APP_SECRET"], redirectUri: "https://app.digitalgate.com.au/api/connectors/meta/callback" }); }
