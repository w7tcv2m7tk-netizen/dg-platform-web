import type { Prisma } from "@dg/database";

import {
  dueHideawayCircleFollowupSteps,
  hideawayCircleFollowupFlag,
  renderHideawayCircleFollowup,
  type HideawayCircleSequenceMeta,
} from "../accommodation/hideaway-circle-emails";
import { runClaimedLeadFollowup } from "../automation/followup-claim";
import { sendMessage } from "../communications";
import {
  dueFreeAuditFollowupSteps,
  renderFreeAuditFollowup,
  type FreeAuditSequenceMeta,
} from "../marketing/business-audit-emails";
import {
  consultationEmailCc,
  dueConsultationReminderSteps,
  parseConsultationAppointment,
  renderConsultationReminder,
  type ConsultationSequenceMeta,
} from "../marketing/consultation-emails";

export type CronFollowupResult = {
  processed: number;
  sent: number;
  failed: number;
};

/**
 * Cron-only claimed version of the free-audit nurture runner.
 * The shared dispatcher uses this instead of the legacy unclaimed export.
 */
export async function processClaimedFreeAuditFollowups(options?: {
  limit?: number;
}): Promise<CronFollowupResult> {
  const { prisma } = await import("@dg/database");
  const limit = options?.limit ?? 40;

  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { source: "free_audit" },
        {
          metadata: {
            path: ["capture_path"],
            equals: "gen2_public_business_audit",
          },
        },
      ],
    },
    take: 300,
    orderBy: { updatedAt: "asc" },
  });

  let processed = 0;
  let sent = 0;
  let failed = 0;
  const now = new Date();

  for (const lead of leads) {
    if (processed >= limit) break;
    const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
    const sequence = meta.free_audit_sequence as FreeAuditSequenceMeta | undefined;
    if (!sequence?.email || !sequence.email_1_sent || !sequence.activatedAt) continue;

    for (const step of dueFreeAuditFollowupSteps(sequence, now)) {
      if (processed >= limit) break;
      const rendered = renderFreeAuditFollowup(step, {
        firstName: sequence.firstName,
        fullName: sequence.fullName,
        companyName: sequence.companyName,
        websiteUrl: sequence.websiteUrl,
        aiScore: sequence.aiScore,
        websiteScore: sequence.websiteScore,
        seoScore: sequence.seoScore,
        overallScore: sequence.overallScore,
        opportunityCount: sequence.opportunityCount,
      });

      const result = await runClaimedLeadFollowup({
        spec: {
          organisationId: lead.organisationId,
          leadId: lead.id,
          sequenceKey: "free_audit_sequence",
          sentKey: `email_${step}_sent`,
          sentAtKey: `email_${step}_sent_at`,
        },
        deliver: () =>
          sendMessage({
            organisationId: lead.organisationId,
            channel: "email",
            to: sequence.email,
            subject: rendered.subject,
            body: rendered.body,
            bodyHtml: rendered.bodyHtml,
            metadata: {
              purpose: `free_audit_followup_${step}`,
              leadId: lead.id,
              ctaLabel: "Book a free strategy session",
            },
          }),
        delivered: (delivery) => delivery.status === "sent",
      });

      if (result.status === "not_claimed") continue;
      processed += 1;

      if (result.status !== "delivered") {
        failed += 1;
        console.warn("[free-audit-followups] not sent", {
          leadId: lead.id,
          step,
          status: result.status,
          error: result.status === "delivery_failed" ? result.error : undefined,
        });
        continue;
      }

      const delivery = result.delivery;
      sent += 1;
      Object.assign(sequence, {
        [`email_${step}_sent`]: true,
        [`email_${step}_sent_at`]: new Date().toISOString(),
      });

      await prisma.activity
        .create({
          data: {
            organisationId: lead.organisationId,
            entityType: "Lead",
            entityId: lead.id,
            activityType: "email_sent",
            title: `Business audit follow-up ${step}`,
            body: `${sequence.email} · ${rendered.subject}`,
            sourceApp: "marketing",
            metadata: {
              step,
              deliveryId: delivery.id,
              deliveryStatus: delivery.status,
            } as Prisma.InputJsonValue,
          },
        })
        .catch((err) =>
          console.warn("[free-audit-followups] activity failed", lead.id, step, err),
        );
    }
  }

  return { processed, sent, failed };
}

/**
 * Cron-only claimed version of the Hideaway Circle nurture runner.
 * Existing future-stay suppression remains tenant-scoped before claiming.
 */
export async function processClaimedHideawayCircleFollowups(options?: {
  limit?: number;
}): Promise<CronFollowupResult> {
  const { prisma } = await import("@dg/database");
  const limit = options?.limit ?? 40;
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { source: "hideaway_circle" },
        {
          metadata: {
            path: ["capture_path"],
            equals: "gen2_hideaway_circle",
          },
        },
      ],
    },
    take: 300,
    orderBy: { updatedAt: "asc" },
  });

  let processed = 0;
  let sent = 0;
  let failed = 0;
  const now = new Date();

  for (const lead of leads) {
    if (processed >= limit) break;
    const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
    const sequence = meta.hideaway_circle_sequence as
      | HideawayCircleSequenceMeta
      | undefined;
    if (!sequence?.email || !sequence.activatedAt) continue;
    if (!sequence.marketingConsent || !sequence.welcome_sent) continue;

    if (lead.contactId) {
      const upcoming = await prisma.stayBooking.findFirst({
        where: {
          organisationId: lead.organisationId,
          contactId: lead.contactId,
          status: { notIn: ["cancelled", "canceled"] },
          checkin: { gt: now },
        },
        select: { id: true },
      });
      if (upcoming) continue;
    }

    for (const step of dueHideawayCircleFollowupSteps(sequence, now)) {
      if (processed >= limit) break;
      const rendered = renderHideawayCircleFollowup(step, {
        firstName: sequence.firstName,
        email: sequence.email,
        bookUrl: sequence.bookUrl,
      });
      const flags = hideawayCircleFollowupFlag(step);

      const result = await runClaimedLeadFollowup({
        spec: {
          organisationId: lead.organisationId,
          leadId: lead.id,
          sequenceKey: "hideaway_circle_sequence",
          sentKey: flags.sent,
          sentAtKey: flags.sentAt,
        },
        deliver: () =>
          sendMessage({
            organisationId: lead.organisationId,
            channel: "email",
            to: sequence.email,
            subject: rendered.subject,
            body: rendered.body,
            bodyHtml: rendered.bodyHtml,
            metadata: {
              purpose: `hideaway_circle_${step}`,
              leadId: lead.id,
              ctaLabel: "Book your return stay",
            },
          }),
        delivered: (delivery) => delivery.status !== "failed",
      });

      if (result.status === "not_claimed") continue;
      processed += 1;

      if (result.status !== "delivered") {
        failed += 1;
        console.error("[hideaway-circle-followups] send failed", {
          leadId: lead.id,
          step,
          status: result.status,
          error: result.status === "delivery_failed" ? result.error : undefined,
        });
        continue;
      }

      const delivery = result.delivery;
      sent += 1;
      Object.assign(sequence, {
        [flags.sent]: true,
        [flags.sentAt]: new Date().toISOString(),
      });

      await prisma.activity
        .create({
          data: {
            organisationId: lead.organisationId,
            entityType: "Lead",
            entityId: lead.id,
            activityType:
              delivery.status === "sent" ? "email_sent" : "email_queued",
            title: `Hideaway Circle ${step}`,
            body: `${sequence.email} · ${rendered.subject}`,
            sourceApp: "accommodation",
            metadata: {
              step,
              deliveryId: delivery.id,
              deliveryStatus: delivery.status,
            } as Prisma.InputJsonValue,
          },
        })
        .catch((err) =>
          console.warn("[hideaway-circle-followups] activity failed", lead.id, step, err),
        );
    }
  }

  return { processed, sent, failed };
}

export async function processClaimedConsultationReminders(options?: {
  limit?: number;
}): Promise<CronFollowupResult> {
  const { prisma } = await import("@dg/database");
  const limit = options?.limit ?? 40;
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { metadata: { path: ["lead_type"], equals: "consultation" } },
        { metadata: { path: ["page_slug"], equals: "strategy-session" } },
      ],
    },
    take: 300,
    orderBy: { updatedAt: "asc" },
  });

  let processed = 0;
  let sent = 0;
  let failed = 0;
  const now = new Date();

  for (const lead of leads) {
    if (processed >= limit) break;
    const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
    const sequence = meta.consultation_sequence as ConsultationSequenceMeta | undefined;
    if (!sequence?.email || !sequence.startsAt || !sequence.confirmation_sent) continue;
    const appointment = parseConsultationAppointment({
      description: lead.description,
      metadata: meta,
    });
    if (!appointment) continue;

    for (const step of dueConsultationReminderSteps(sequence, now)) {
      if (processed >= limit) break;
      const rendered = renderConsultationReminder(step, {
        firstName: sequence.firstName,
        appointment,
      });
      const sentKey =
        step === "24h"
          ? "reminder_24h_sent"
          : step === "1h"
            ? "reminder_1h_sent"
            : "followup_sent";

      const result = await runClaimedLeadFollowup({
        spec: {
          organisationId: lead.organisationId,
          leadId: lead.id,
          sequenceKey: "consultation_sequence",
          sentKey,
        },
        deliver: () =>
          sendMessage({
            organisationId: lead.organisationId,
            channel: "email",
            to: sequence.email,
            cc: consultationEmailCc(sequence.email),
            subject: rendered.subject,
            body: rendered.body,
            bodyHtml: rendered.bodyHtml,
            metadata: {
              purpose: `consultation_reminder_${step}`,
              leadId: lead.id,
            },
          }),
        delivered: (delivery) => delivery.status === "sent",
      });

      if (result.status === "not_claimed") continue;
      processed += 1;
      if (result.status === "delivered") {
        sent += 1;
        Object.assign(sequence, { [sentKey]: true });
        continue;
      }

      failed += 1;
      console.warn("[consultation-reminders] failed", {
        leadId: lead.id,
        step,
        status: result.status,
        error: result.status === "delivery_failed" ? result.error : undefined,
      });
    }
  }

  return { processed, sent, failed };
}
