import {

  canAccessCommandCentre,

  type PlatformSession,

} from "@dg/platform-core";

import { NextResponse } from "next/server";



import { getOrgEnabledAppIdsCached } from "@/lib/org-apps";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";



/**

 * Growth App / Prospecting Engine access — uniform for every organisation.

 * Allowed when:

 * - Prospecting app is enabled on the active org, or

 * - Active org is DigitalGate Command Centre (staff GTM)

 * Feature check uses command.growth.* (maps to intelligence permissions).

 */

export async function requireProspectingEngine(

  req: Request,

  feature: "command.growth.read" | "command.growth.manage" = "command.growth.read",

): Promise<PlatformSession | NextResponse> {

  const session = await requirePlatformAuth(req);

  if (isNextResponse(session)) return session;



  const denied = requireFeature(session, feature);

  if (denied) return denied;



  const isOperator = canAccessCommandCentre({

    organisationId: session.organisationId,

    organisationName: session.organisationName,

    organisationSlug: session.organisationSlug,

    role: session.role,

    principalId: session.clerkUserId,

  });



  if (isOperator) return session;



  const enabledIds = await getOrgEnabledAppIdsCached();

  if (!enabledIds.includes("prospecting")) {

    return NextResponse.json(

      {

        error: {

          code: "forbidden",

          message: "Enable Prospecting & Opportunity Engine under Apps to use Discovery",

        },

      },

      { status: 403 },

    );

  }



  return session;

}


