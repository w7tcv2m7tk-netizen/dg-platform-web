import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ phase: "credentials_and_contract", oauth: false, evidenceSync: false }); }
