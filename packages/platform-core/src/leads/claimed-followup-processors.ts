import type { Prisma } from "@dg/database";

import {
  dueHideawayCircleFollowupSteps,
  hideawayCircleFollowupFlag,
  renderHideawayCircleFollowup,
  type HideawayCircleSequenceMeta,
} from "../accommodation/hideaway-circle-emails";
import { sendMessage } from "../communications";
import {
  dueConsultationReminderSteps,
  consultationEmailCc,
  parseConsultationAppointment,
  renderConsultationReminder,
  type ConsultationSequenceMeta,
} from "../marketing/consultation-emails";
import {
  dueFreeAuditFollowupSteps,
  renderFreeAuditFollowup,
  type FreeAuditSequenceMeta,
} from "../marketing/business-audit-emails";
import {
  duePropertyReportFollowupSteps,
  renderPropertyReportFollowup,
  type PropertyReportSequenceMeta,
} from "../real-estate/property-report-emails";
import {
  createPrismaFollowupClaimStore,
  runClaimedFollowup,
} from "./followup-claim";

export type ClaimedFollowupProcessResult = {
  processed: number;
  sent: number;
  failed: number;
};

export async function processClaimedPropertyReportFollowups(options?: {
  limit?: number;
}): Promise<ClaimedFollowupProcessResult> {
  const { prisma } = await import("@dg/database");
  const store = createPrismaFollowupClaimStore(prisma);
  const limit = options?.limit ?? 40;
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { source: "property_report" },
        {
          metadata: {
            path: ["capture_path"],
            equals: "gen2_public_property_report",
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
    const sequence = meta.property_report_sequence as
      | PropertyReportSequenceMeta
      | undefined;
    if (!sequence?.email || !sequence.activatedAt) continue;

    for (const step of duePropertyReportFollowupSteps(sequence, now)) {
      if (processed >= limit) break;
      const rendered = renderPropertyReportFollowup(step, {
        firstName: sequence.firstName,
        fullName: sequence.fullName,
        propertyAddress: sequence.propertyAddress,
        email: sequence.email,
      });

      const result = await runClaimedFollowup({
        store,
        claim: {
          organisationId: lead.organisationId,
          leadId: lead.id,
          sequenceKey: "property_report_sequence",
          sentFlag: `email_${step}_sent`,
          sentAtFlag: `email_${step}_sent_at`,
          now,
        },
        send: async () => {
          const delivery = await sendMessage({
            organisationId: lead.organisationId,
            channel: "email",
            to: sequence.email,
            subject: rendered.subject,
            body: rendered.body,
            bodyHtml: rendered.bodyHtml,
            metadata: {
              purpose: `property_report_followup_${step}`,
              leadId: lead.id,
              ctaLabel: "Book a free appraisal",
            },
          });
          return { accepted: delivery.status !== "failed", value: delivery };
        },
      }).catch((err) => {
        console.error("[property-report-followups] send failed", lead.id, step, err);
        return null;
      });

      if (!result || result.status === "failed") {
        processed += 1;
        failed += 1;
        continue;
      }
      if (result.status === "not_claimed") continue;

      processed += 1;
      sent += 1;
      const delivery = result.value;
      await prisma.activity
        .create({
          data: {
            organisationId: lead.organisationId,
            entityType: "Lead",
            entityId: lead.id,
            activityType:
              delivery.status === "sent" ? "email_sent" : "email_queued",
            title: `Property report follow-up ${step}`,
            body: `${sequence.email} · ${rendered.subject}`,
            sourceApp: "real-estate",
            metadata: {
              step,
              deliveryId: delivery.id,
              deliveryStatus: delivery.status,
            } as Prisma.InputJsonValue,
          },
        })
        .catch((err) =>
          console.warn("[property-report-followups] activity failed", lead.id, step, err),
        );
    }
  }

  return { processed, sent, failed };
}

export async function processClaimedFreeAuditFollowups(options?: {
  limit?: number;
}): Promise<ClaimedFollowupProcessResult> {
  const { prisma } = await import("@dg/database");
  const store = createPrismaFollowupClaimStore(prisma);
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

      const result = await runClaimedFollowup({
        store,
        claim: {
          organisationId: lead.organisationId,
          leadId: lead.id,
          sequenceKey: "free_audit_sequence",
          sentFlag: `email_${step}_sent`,
          sentAtFlag: `email_${step}_sent_at`,
          now,
        },
        send: async () => {
          const delivery = await sendMessage({
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
          });
          return { accepted: delivery.status === "sent", value: delivery };
        },
      }).catch((err) => {
        console.error("[free-audit-followups] send failed", lead.id, step, err);
        return null;
      });

      if (!result || result.status === "failed") {
        processed += 1;
        failed += 1;
        continue;
      }
      if (result.status === "not_claimed") continue;

      processed += 1;
      sent += 1;
      const delivery = result.value;
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

export async function processClaimedHideawayCircleFollowups(options?: {
  limit?: number;
}): Promise<ClaimedFollowupProcessResult> {
  const { prisma } = await import("@dg/database");
  const store = createPrismaFollowupClaimStore(prisma);
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

      const result = await runClaimedFollowup({
        store,
        claim: {
          organisationId: lead.organisationId,
          leadId: lead.id,
          sequenceKey: "hideaway_circle_sequence",
          sentFlag: flags.sent,
          sentAtFlag: flags.sentAt,
          now,
        },
        send: async () => {
          const delivery = await sendMessage({
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
          });
          return { accepted: delivery.status !== "failed", value: delivery };
        },
      }).catch((err) => {
        console.error("[hideaway-circle-followups] send failed", lead.id, step, err);
        return null;
      });

      if (!result || result.status === "failed") {
        processed += 1;
        failed += 1;
        continue;
      }
      if (result.status === "not_claimed") continue;

      processed += 1;
      sent += 1;
      const delivery = result.value;
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
}): Promise<ClaimedFollowupProcessResult> {
  const { prisma } = await import("@dg/database");
  const store = createPrismaFollowupClaimStore(prisma);
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
      const sentFlag =
        step === "24h"
          ? "reminder_24h_sent"
          : step === "1h"
            ? "reminder_1h_sent"
            : "followup_sent";

      const result = await runClaimedFollowup({
        store,
        claim: {
          organisationId: lead.organisationId,
          leadId: lead.id,
          sequenceKey: "consultation_sequence",
          sentFlag,
          now,
        },
        send: async () => {
          const delivery = await sendMessage({
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
          });
          return { accepted: delivery.status === "sent", value: delivery };
        },
      }).catch((err) => {
        console.warn("[consultation-reminders] failed", {
          leadId: lead.id,
          step,
          err,
        });
        return null;
      });

      if (!result || result.status === "failed") {
        processed += 1;
        failed += 1;
        continue;
      }
      if (result.status === "not_claimed") continue;
      processed += 1;
      sent += 1;
    }
  }

  return { processed, sent, failed };
}
