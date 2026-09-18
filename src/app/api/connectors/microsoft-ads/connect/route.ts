import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildMicrosoftAdsAuthorizeUrl, microsoftAdsCredentialsConfigured } from "@dg/platform-core";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { requirePermission } from "@/lib/platform-api";
import { tenantWriteEntitlementBlock, writeEntitlementResponse } from "@/lib/write-entitlement";
import { createGoogleOAuthState } from "@/lib/google-oauth-state";

export const dynamic="force-dynamic";
export async function GET(req:Request){
 const base=new URL(req.url).origin,{userId}=await auth();if(!userId)return NextResponse.redirect(new URL("/login",base));
 if(!microsoftAdsCredentialsConfigured())return NextResponse.json({error:{code:"microsoft_ads_not_configured",message:"Microsoft Advertising OAuth credentials are not configured"}},{status:503});
 const user=await currentUser(),email=user?.primaryEmailAddress?.emailAddress??"",name=user?.fullName??[user?.firstName,user?.lastName].filter(Boolean).join(" ")??email;
 const session=await resolveActivePlatformSession({clerkUserId:userId,email,name});if(!session)return NextResponse.json({error:{code:"no_org",message:"No active organisation"}},{status:400});
 const denied=requirePermission(session,{module:"settings",action:"manage",scope:"organisation"});if(denied)return denied;
 const block=await tenantWriteEntitlementBlock(session);if(block)return writeEntitlementResponse(block);
 const state=createGoogleOAuthState(session.organisationId,{returnTo:"/apps/advertising"});
 const a=buildMicrosoftAdsAuthorizeUrl(state);if(!a.ok)return NextResponse.json({error:{code:"microsoft_ads_config",message:a.message}},{status:503});
 return NextResponse.redirect(a.url);
}
