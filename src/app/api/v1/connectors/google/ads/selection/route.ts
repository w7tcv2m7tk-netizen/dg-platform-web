import { selectOrgGoogleAdsAccounts } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
export async function POST(req:Request){const session=await requirePlatformAuth(req);if(isNextResponse(session))return session;const body=await req.json().catch(()=>({}));const customerIds=Array.isArray(body?.customerIds)?body.customerIds.filter((x:unknown):x is string=>typeof x==="string"):[];const result=await selectOrgGoogleAdsAccounts(session.organisationId,customerIds);if(!result.ok)return NextResponse.json({error:result.message},{status:400});return NextResponse.json({data:result})}
