import {
  communicationsHealthCheck,
  scheduleOutboundEmail,
  sendMessage,
  type CommsChannel,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, rejectDemoLiveAction, requirePlatformAuth } from "@/lib/platform-api";

const CHANNELS = new Set<CommsChannel>(["email", "sms", "voice", "chat"]);

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

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

  const metadata =
    body?.metadata && typeof body.metadata === "object"
      ? (body.metadata as Record<string, unknown>)
      : {};

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
        contactId: typeof body?.contactId === "string" ? body.contactId : undefined,
        opportunityId:
          typeof metadata.opportunityId === "string" ? metadata.opportunityId : undefined,
        companyId: typeof metadata.companyId === "string" ? metadata.companyId : undefined,
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
    contactId: body?.contactId,
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
