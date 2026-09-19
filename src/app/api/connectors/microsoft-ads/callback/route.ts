import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { exchangeMicrosoftAdsCode, getOrgMicrosoftAdsTokens, saveOrgMicrosoftAdsTokens } from "@dg/platform-core";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { parseGoogleOAuthState } from "@/lib/google-oauth-state";
import { requirePermission } from "@/lib/platform-api";
import { tenantWriteEntitlementBlock } from "@/lib/write-entitlement";

export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const base=req.nextUrl.origin,fail=(m:string)=>NextResponse.redirect(new URL(`/apps/advertising?microsoftAds=error&message=${encodeURIComponent(m)}`,base));
 const err=req.nextUrl.searchParams.get("error");if(err)return fail(req.nextUrl.searchParams.get("error_description")||err);
 const code=req.nextUrl.searchParams.get("code"),state=req.nextUrl.searchParams.get("state");if(!code||!state)return fail("Missing code or state from Microsoft Advertising");
 const parsed=parseGoogleOAuthState(state);if(!parsed.ok)return fail(parsed.message);
 const {userId}=await auth();if(!userId)return fail("Sign in again before connecting Microsoft Advertising");
 const user=await currentUser(),email=user?.primaryEmailAddress?.emailAddress??"",name=user?.fullName??[user?.firstName,user?.lastName].filter(Boolean).join(" ")??email;
 const session=await resolveActivePlatformSession({clerkUserId:userId,email,name});if(!session||session.organisationId!==parsed.organisationId)return fail("Active organisation changed or is no longer available");
 const denied=requirePermission(session,{module:"settings",action:"manage",scope:"organisation"});if(denied)return fail("You do not have permission to manage organisation connections");
 const block=await tenantWriteEntitlementBlock(session);if(block)return fail(block.message);
 const x=await exchangeMicrosoftAdsCode(code);if(!x.ok)return fail(x.message);
 const existing=await getOrgMicrosoftAdsTokens(session.organisationId);await saveOrgMicrosoftAdsTokens(session.organisationId,{...(existing??{}),accessToken:x.accessToken,refreshToken:x.refreshToken||existing?.refreshToken,expiresAt:x.expiresAt,scope:x.scope||existing?.scope,connectedAt:new Date().toISOString(),lastError:undefined});
 return NextResponse.redirect(new URL("/apps/advertising?microsoftAds=connected",base));
}
