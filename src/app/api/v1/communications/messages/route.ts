import {
  communicationsHealthCheck,
  getCompany,
  getContact,
  getOpportunity,
  scheduleOutboundEmail,
  sendMessage,
  type CommsChannel,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  rejectDemoLiveAction,
  requireFeature,
  requirePlatformAuth,
} from "@/lib/platform-api";

const CHANNELS = new Set<CommsChannel>(["email", "sms", "voice", "chat"]);

type PlatformSession = Exclude<Awaited<ReturnType<typeof requirePlatformAuth>>, NextResponse>;

async function validateLinkedCrmTargets(options: {
  session: PlatformSession;
  contactId?: string;
  opportunityId?: string;
  companyId?: string;
}) {
  const { session, contactId, opportunityId, companyId } = options;

  if (contactId) {
    const denied = requireFeature(session, "crm.contacts.read");
    if (denied) return denied;
    const contact = await getContact(session.organisationId, contactId);
    if (!contact) {
      return NextResponse.json(
        { error: { code: "linked_contact_not_found", message: "Linked contact not found" } },
        { status: 422 },
      );
    }
  }

  if (opportunityId) {
    const denied = requireFeature(session, "crm.opportunities.read");
    if (denied) return denied;
    const opportunity = await getOpportunity(session.organisationId, opportunityId);
    if (!opportunity) {
      return NextResponse.json(
        {
          error: {
            code: "linked_opportunity_not_found",
            message: "Linked opportunity not found",
          },
        },
        { status: 422 },
      );
    }
  }

  if (companyId) {
    const denied = requireFeature(session, "crm.companies.read");
    if (denied) return denied;
    const company = await getCompany(session.organisationId, companyId);
    if (!company) {
      return NextResponse.json(
        { error: { code: "linked_company_not_found", message: "Linked company not found" } },
        { status: 422 },
      );
    }
  }

  return null;
}

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "communications.read");
  if (denied) return denied;

  const health = await communicationsHealthCheck(session.organisationId);
  return NextResponse.json({ data: health });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const blocked = await rejectDemoLiveAction(session);
  if (blocked) return blocked;

  const body = await req.json().catch(() => null);
  const channel = body?.channel as CommsChannel | undefined;
  const to = body?.to as string | undefined;
  const messageBody = body?.body as string | undefined;

  if (!channel || !CHANNELS.has(channel) || !to?.trim() || !messageBody?.trim()) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "channel, to, and body are required",
        },
      },
      { status: 422 },
    );
  }

  const sendDenied = requireFeature(
    session,
    channel === "email" ? "communications.email.send" : "communications.write",
  );
  if (sendDenied) return sendDenied;

  const metadata =
    body?.metadata && typeof body.metadata === "object"
      ? (body.metadata as Record<string, unknown>)
      : {};
  const contactId = typeof body?.contactId === "string" ? body.contactId.trim() : undefined;
  const opportunityId =
    typeof metadata.opportunityId === "string" ? metadata.opportunityId.trim() : undefined;
  const companyId =
    typeof metadata.companyId === "string" ? metadata.companyId.trim() : undefined;

  const linkedTargetDenied = await validateLinkedCrmTargets({
    session,
    contactId: contactId || undefined,
    opportunityId: opportunityId || undefined,
    companyId: companyId || undefined,
  });
  if (linkedTargetDenied) return linkedTargetDenied;

  const scheduledRaw =
    typeof body?.scheduledAt === "string" ? body.scheduledAt.trim() : "";
  if (scheduledRaw) {
    if (channel !== "email") {
      return NextResponse.json(
        {
          error: {
            code: "validation_error",
            message: "Scheduling is only supported for email",
          },
        },
        { status: 422 },
      );
    }
    const scheduledAt = new Date(scheduledRaw);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json(
        {
          error: {
            code: "validation_error",
            message: "scheduledAt must be a future datetime",
          },
        },
        { status: 422 },
      );
    }

    try {
      const record = await scheduleOutboundEmail({
        organisationId: session.organisationId,
        to: to.trim(),
        subject: typeof body?.subject === "string" ? body.subject : undefined,
        body: messageBody.trim(),
        scheduledAt,
        contactId: contactId || undefined,
        opportunityId: opportunityId || undefined,
        companyId: companyId || undefined,
        sentBy: session.clerkUserId,
        source: "manual",
        whySent:
          typeof metadata.whySent === "string"
            ? metadata.whySent
            : "Scheduled send from Communications",
        metadata,
      });
      return NextResponse.json(
        {
          data: {
            id: record?.id ?? `sched_${Date.now()}`,
            channel: "email",
            status: "scheduled",
            provider: "resend",
            scheduledAt: scheduledAt.toISOString(),
          },
        },
        { status: 202 },
      );
    } catch (err) {
      return NextResponse.json(
        {
          error: {
            code: "validation_error",
            message: err instanceof Error ? err.message : "Could not schedule email",
          },
        },
        { status: 422 },
      );
    }
  }

  const result = await sendMessage({
    organisationId: session.organisationId,
    channel,
    contactId: contactId || undefined,
    to: to.trim(),
    subject: body?.subject,
    body: messageBody.trim(),
    metadata: {
      ...metadata,
      sentBy: session.clerkUserId,
      source: typeof metadata.source === "string" ? metadata.source : "manual",
    },
  });

  return NextResponse.json({ data: result }, { status: 202 });
}
