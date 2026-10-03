import { getGrowthProspect, organisationGrowthScope, researchProspectDecisionMaker } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams { params: Promise<{ id: string }>; }

export async function POST(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "prospecting.prospects.write");
  if (denied) return denied;
  const { id } = await params;
  const prospect = await getGrowthProspect(id, organisationGrowthScope(session.organisationId));
  if (!prospect || prospect.archivedAt) return NextResponse.json({ error: { code: "not_found", message: "Prospect not found" } }, { status: 404 });
  if (prospect.stage !== "audit_created") return NextResponse.json({ error: { code: "invalid_stage", message: "Decision-maker research is only available during Research." } }, { status: 409 });
  const result = await researchProspectDecisionMaker(prospect.websiteUrl);
  // Safe diagnostics deliberately contain counts/booleans only — never raw HTML
  // or recovered contact values. This makes extraction failures observable in
  // authenticated production runtime logs without leaking public contact data.
  console.info("[prospecting:decision-maker-research]", {
    prospectId: id,
    websiteHost: prospect.websiteUrl ? (() => { try { return new URL(/^https?:\/\//i.test(prospect.websiteUrl) ? prospect.websiteUrl : `https://${prospect.websiteUrl}`).host; } catch { return "invalid"; } })() : null,
    diagnostics: result.diagnostics,
    candidateCount: result.candidates.length,
    candidateFields: result.candidates.map(candidate => ({
      hasName: Boolean(candidate.name),
      hasEmail: Boolean(candidate.email),
      hasPhone: Boolean(candidate.phone),
      hasImage: Boolean(candidate.imageUrl),
    })),
  });
  return NextResponse.json({ data: result });
}
