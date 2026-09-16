import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ META_APP_ID: process.env.META_APP_ID ? "configured" : "missing", META_APP_SECRET: process.env.META_APP_SECRET ? "configured" : "missing", META_REDIRECT_URI: process.env.META_REDIRECT_URI ? "configured" : "using_default" }); }
