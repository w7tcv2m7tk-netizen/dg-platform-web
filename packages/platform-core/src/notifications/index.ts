import type { Prisma } from "@dg/database";

import { platformEvents } from "../events";
import type { PlatformEvent, PlatformEventType } from "../events/types";

export type NotificationDto = {
  id: string;
  organisationId: string;
  recipientUserId: string | null;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

function serialize(row: {
  id: string;
  organisationId: string;
  recipientUserId: string | null;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationDto {
  return {
    id: row.id,
    organisationId: row.organisationId,
    recipientUserId: row.recipientUserId,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    entityType: row.entityType,
    entityId: row.entityId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function hrefForEvent(event: PlatformEvent): string | null {
  const id = event.entityId;
  if (!id) return null;
  switch (event.entityType) {
    case "Contact":
      return `/apps/crm/contacts/${id}`;
    case "Company":
      return `/apps/crm/companies/${id}`;
    case "Lead":
      return event.type === "lead.converted" &&
        typeof event.payload.opportunityId === "string"
        ? `/apps/crm/opportunities/${event.payload.opportunityId}`
        : `/apps/re/vendor-leads/${id}`;
    case "Opportunity":
      return `/apps/crm/opportunities/${id}`;
    case "PlatformReferral":
      return `/dashboard/settings/referrals`;
    default:
      return null;
  }
}

const TITLE_FOR: Partial<Record<PlatformEventType, (e: PlatformEvent) => string>> = {
  "contact.created": () => "New contact",
  "contact.updated": () => "Contact updated",
  "company.created": () => "New company",
  "lead.created": () => "New lead",
  "lead.converted": () => "Lead converted to opportunity",
  "lead.stage_changed": (e) =>
    `Lead moved to ${String(e.payload.stage ?? "new stage").replace(/_/g, " ")}`,
  "opportunity.created": () => "New opportunity",
  "opportunity.stage_changed": (e) =>
    `Opportunity moved to ${String(e.payload.stage ?? "new stage").replace(/_/g, " ")}`,
  "opportunity.won": () => "Opportunity won",
  "opportunity.lost": () => "Opportunity lost",
  "platform_referral.invited": () => "Referral invite sent",
  "platform_referral.signed_up": () => "Referral signed up",
  "platform_referral.paid": () => "Referral converted (paid)",
  "platform_referral.credit_accrued": () => "Referral credit accrued",
  "organisation.created": () => "Organisation provisioned",
};

const NOTIFY_TYPES = new Set<PlatformEventType>([
  "contact.created",
  "company.created",
  "lead.created",
  "lead.converted",
  "lead.stage_changed",
  "opportunity.created",
  "opportunity.stage_changed",
  "opportunity.won",
  "opportunity.lost",
  "platform_referral.invited",
  "platform_referral.signed_up",
  "platform_referral.paid",
  "platform_referral.credit_accrued",
]);

export async function createNotification(input: {
  organisationId: string;
  recipientUserId?: string | null;
  type: string;
  title: string;
  body?: string;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!process.env.DATABASE_URL) return null;
  const { prisma } = await import("@dg/database");
  const row = await prisma.notification.create({
    data: {
      organisationId: input.organisationId,
      recipientUserId: input.recipientUserId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
  return serialize(row);
}

export async function listNotifications(input: {
  organisationId: string;
  recipientUserId?: string;
  unreadOnly?: boolean;
  limit?: number;
}) {
  if (!process.env.DATABASE_URL) {
    return { items: [] as NotificationDto[], unreadCount: 0 };
  }
  const { prisma } = await import("@dg/database");
  const limit = Math.min(input.limit ?? 30, 50);

  const where: Prisma.NotificationWhereInput = {
    organisationId: input.organisationId,
    OR: [
      { recipientUserId: null },
      ...(input.recipientUserId
        ? [{ recipientUserId: input.recipientUserId }]
        : []),
    ],
    ...(input.unreadOnly ? { readAt: null } : {}),
  };

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: {
        organisationId: input.organisationId,
        readAt: null,
        OR: [
          { recipientUserId: null },
          ...(input.recipientUserId
            ? [{ recipientUserId: input.recipientUserId }]
            : []),
        ],
      },
    }),
  ]);

  return {
    items: items.map(serialize),
    unreadCount,
  };
}

export async function markNotificationsRead(input: {
  organisationId: string;
  recipientUserId?: string;
  ids?: string[];
  all?: boolean;
}) {
  if (!process.env.DATABASE_URL) return { updated: 0 };
  const { prisma } = await import("@dg/database");
  const now = new Date();

  if (input.all) {
    const result = await prisma.notification.updateMany({
      where: {
        organisationId: input.organisationId,
        readAt: null,
        OR: [
          { recipientUserId: null },
          ...(input.recipientUserId
            ? [{ recipientUserId: input.recipientUserId }]
            : []),
        ],
      },
      data: { readAt: now },
    });
    return { updated: result.count };
  }

  const ids = (input.ids ?? []).filter(Boolean);
  if (!ids.length) return { updated: 0 };

  const result = await prisma.notification.updateMany({
    where: {
      organisationId: input.organisationId,
      id: { in: ids },
      readAt: null,
    },
    data: { readAt: now },
  });
  return { updated: result.count };
}

async function onPlatformEvent(event: PlatformEvent) {
  if (!NOTIFY_TYPES.has(event.type)) return;
  if (!process.env.DATABASE_URL) return;

  const titleFn = TITLE_FOR[event.type];
  const title = titleFn ? titleFn(event) : event.type;
  const body =
    typeof event.payload.email === "string"
      ? event.payload.email
      : typeof event.payload.stage === "string"
        ? `Stage: ${String(event.payload.stage).replace(/_/g, " ")}`
        : undefined;

  try {
    await createNotification({
      organisationId: event.organisationId,
      type: event.type,
      title,
      body,
      href: hrefForEvent(event),
      entityType: event.entityType ?? null,
      entityId: event.entityId ?? null,
      metadata: { payload: event.payload, actorId: event.actorId },
    });
  } catch (err) {
    console.warn("[notifications] failed to persist from event", event.type, err);
  }
}

let handlersRegistered = false;

/** Idempotent — register in-process notification fan-out from the event bus. */
export function registerNotificationEventHandlers() {
  if (handlersRegistered) return;
  handlersRegistered = true;
  platformEvents.subscribe("*", onPlatformEvent);
}

// Auto-register on module load (serverless-safe; re-binds per cold start).
registerNotificationEventHandlers();
