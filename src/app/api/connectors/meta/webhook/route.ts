import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ enabled: false, message: "Meta webhooks are not enabled yet." }, { status: 503 }); }
export async function POST() { return NextResponse.json({ enabled: false }, { status: 503 }); }
