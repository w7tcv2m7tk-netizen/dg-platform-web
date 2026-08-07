import { NextResponse } from "next/server";
import {
  buildAiSystemPrompt,
  buildLiveTwinWithScores,
  gatherOverviewLiveMetrics,
  generateFromBusinessContext,
  getBusinessContext,
  getContact,
  getLead,
  getOpportunity,
  getOrganisationBusinessProfile,
  listContactActivities,
  listLeadActivities,
  metricsContextFromLiveMetrics,
  type AiGenerateAction,
  type CrmAssistEntity,
} from "@dg/platform-core";

import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds } from "@/lib/org-apps";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

const VALID_ACTIONS: AiGenerateAction[] = [
  "social_post",
  "email_draft",
  "briefing",
  "lead_follow_up",
  "lead_summary",
  "opportunity_follow_up",
  "opportunity_summary",
];

async function loadTwinContext(session: {
  organisationId: string;
  organisationName: string;
  email: string;
  clerkUserId: string;
}) {
  const enabledAppIds = await getOrgEnabledAppIds();
  const [metrics, connectors, profile] = await Promise.all([
    gatherOverviewLiveMetrics(session.organisationId),
    fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
    getOrganisationBusinessProfile(session.organisationId),
  ]);

  if (!metrics) {
    return { enabledAppIds, twinSnapshot: null, profile };
  }

  const { snapshot } = buildLiveTwinWithScores({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    enabledAppIds,
    metrics,
    connectors,
    profile,
    metricsContext: metricsContextFromLiveMetrics(metrics),
  });

  return { enabledAppIds, twinSnapshot: snapshot, profile };
}

async function resolveCrmEntity(
  organisationId: string,
  body: {
    leadId?: string;
    opportunityId?: string;
    contactId?: string;
  },
): Promise<CrmAssistEntity | null> {
  if (body.opportunityId) {
    const opportunity = await getOpportunity(organisationId, body.opportunityId);
    if (!opportunity) return null;
    const [contact, lead, leadActivities] = await Promise.all([
      opportunity.contactId
        ? getContact(organisationId, opportunity.contactId)
        : Promise.resolve(null),
      opportunity.leadId
        ? getLead(organisationId, opportunity.leadId)
        : Promise.resolve(null),
      opportunity.leadId
        ? listLeadActivities(organisationId, opportunity.leadId)
        : Promise.resolve([]),
    ]);
    return {
      kind: "opportunity",
      id: opportunity.id,
      title: opportunity.title,
      status: opportunity.status,
      stage: opportunity.stage,
      description: lead?.description,
      propertyAddress: lead?.propertyAddress,
      contactName: contact
        ? [contact.firstName, contact.lastName].filter(Boolean).join(" ")
        : (lead?.metadata?.contact_name as string | undefined) ?? null,
      contactEmail: contact?.email ?? (lead?.metadata?.email as string | undefined) ?? null,
      contactPhone: contact?.phone ?? (lead?.metadata?.phone as string | undefined) ?? null,
      valueCents: opportunity.valueCents,
      currency: opportunity.currency,
      notes: (leadActivities ?? []).slice(0, 5).map((a) => a.title),
    };
  }

  if (body.leadId) {
    const lead = await getLead(organisationId, body.leadId);
    if (!lead) return null;
    const [contact, activities] = await Promise.all([
      lead.contactId
        ? getContact(organisationId, lead.contactId)
        : Promise.resolve(null),
      listLeadActivities(organisationId, lead.id),
    ]);
    const contactName =
      (contact
        ? [contact.firstName, contact.lastName].filter(Boolean).join(" ")
        : null) ||
      (lead.metadata?.contact_name as string | undefined) ||
      (lead.metadata?.wp_name as string | undefined) ||
      null;
    return {
      kind: "lead",
      id: lead.id,
      title: lead.title,
      status: lead.status,
      stage: lead.stage,
      source: lead.source,
      description: lead.description,
      propertyAddress: lead.propertyAddress,
      contactName,
      contactEmail:
        contact?.email ?? (lead.metadata?.email as string | undefined) ?? null,
      contactPhone:
        contact?.phone ?? (lead.metadata?.phone as string | undefined) ?? null,
      notes: (activities ?? []).slice(0, 5).map((a) => a.title),
    };
  }

  if (body.contactId) {
    const contact = await getContact(organisationId, body.contactId);
    if (!contact) return null;
    const activities = await listContactActivities(organisationId, contact.id);
    return {
      kind: "contact",
      id: contact.id,
      title: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
      contactName: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
      contactEmail: contact.email,
      contactPhone: contact.phone,
      source: contact.source,
      notes: (activities ?? []).slice(0, 5).map((a) => a.title),
    };
  }

  return null;
}

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { enabledAppIds, twinSnapshot, profile } = await loadTwinContext(session);

  const context = await getBusinessContext({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    enabledAppIds,
    twinSnapshot,
    profileOverride: profile,
  });

  return NextResponse.json({
    data: {
      context,
      systemPrompt: buildAiSystemPrompt(context),
    },
  });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  let body: {
    action?: AiGenerateAction;
    leadId?: string;
    opportunityId?: string;
    contactId?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const action = body.action ?? "social_post";
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: { code: "invalid_action", message: "Unknown action" } },
      { status: 400 },
    );
  }

  const crmActions: AiGenerateAction[] = [
    "lead_follow_up",
    "lead_summary",
    "opportunity_follow_up",
    "opportunity_summary",
  ];
  if (
    crmActions.includes(action) &&
    !body.leadId &&
    !body.opportunityId &&
    !body.contactId
  ) {
    return NextResponse.json(
      {
        error: {
          code: "missing_entity",
          message: "leadId, opportunityId, or contactId required for CRM assist",
        },
      },
      { status: 422 },
    );
  }

  const [{ enabledAppIds, twinSnapshot, profile }, entity] = await Promise.all([
    loadTwinContext(session),
    resolveCrmEntity(session.organisationId, body),
  ]);

  if (crmActions.includes(action) && !entity) {
    return NextResponse.json(
      { error: { code: "not_found", message: "CRM entity not found" } },
      { status: 404 },
    );
  }

  const context = await getBusinessContext({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    enabledAppIds,
    twinSnapshot,
    profileOverride: profile,
  });

  const output = generateFromBusinessContext(context, action, entity);

  return NextResponse.json({
    data: {
      action,
      output,
      entity,
      systemPrompt: buildAiSystemPrompt(context),
    },
  });
}
