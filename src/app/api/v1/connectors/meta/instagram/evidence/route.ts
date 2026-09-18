import { fetchOrgMetaInstagramEvidence } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
export const dynamic = "force-dynamic";
export async function GET(req:Request){const session=await requirePlatformAuth(req);if(isNextResponse(session))return session;const result=await fetchOrgMetaInstagramEvidence(session.organisationId);if(!result.ok)return NextResponse.json({error:result.message},{status:400});return NextResponse.json({data:result.data})}
