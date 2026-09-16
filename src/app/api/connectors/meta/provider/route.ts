import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ name: "Meta", products: ["Facebook", "Instagram", "Ads"], connectionModel: "organisation_scoped_oauth", ready: false }); }
