/**
 * Platform Consultation intake: Contact + Opportunity pipeline +
 * confirmation email/calendar + reminder sequence stamp.
 */

import type { Prisma } from "@dg/database";

import { createActivity } from "../activities";
import { runClaimedLeadFollowup } from "../automation/followup-claim";
import { sendMessage } from "../communications";
import { createNotification } from "../notifications";
import { convertLeadToOpportunity } from "../opportunities";
import { createTask, listTasks } from "../tasks";
import {
  DG_CONSULT_PIPELINE,
  consultationEmailCc,
  buildConsultationSequence,
  dueConsultationReminderSteps,
  isConsultationLead,
  parseConsultationAppointment,
  renderConsultationConfirmation,
  renderConsultationReminder,
  type ConsultationAppointment,
  type ConsultationSequenceMeta,
} from "./consultation-emails";

export async function handlePlatformConsultationIntake(input: {
  organisationId: string;
  leadId: string;
  actorId?: string;
}): Promise<boolean> {
  const { prisma } = await import("@dg/database");
  const lead = await prisma.lead.findFirst({
    where: { id: input.leadId, organisationId: input.organisationId },
  });
  if (!lead) return false;

  const metadata = (lead.metadata as Record<string, unknown> | null) ?? {};
  if (
    !isConsultationLead({
      source: lead.source,
      title: lead.title,
      description: lead.description,
      metadata,
    })
  ) {
    return false;
  }

  const appointment = parseConsultationAppointment({
    description: lead.description,
    metadata,
  });

  const contact = lead.contactId
    ? await prisma.contact.findFirst({
        where: { id: lead.contactId, organisationId: input.organisationId },
        select: { id: true, email: true, firstName: true },
      })
    : null;
  const firstName =
    contact?.firstName?.trim() ||
    (typeof metadata.contact_name === "string"
      ? metadata.contact_name.trim().split(/\s+/)[0]
      : "") ||
    "there";
  const email =
    (typeof metadata.email === "string" && metadata.email.trim()) ||
    contact?.email?.trim() ||
    "";

  const slotLabel = appointment
    ? `${appointment.date} ${appointment.timeLabel} ${appointment.timezone}`
    : "time TBC";
  const opportunity = await convertLeadToOpportunity({
    organisationId: input.organisationId,
    leadId: lead.id,
    actorId: input.actorId,
    stage: "booked",
    pipelineId: DG_CONSULT_PIPELINE,
    title: `Platform Consultation — ${firstName === "there" ? lead.title : firstName} — ${slotLabel}`,
    metadata: appointment
      ? {
          appointment,
          meeting_link: appointment.meetingLink,
          pipeline: DG_CONSULT_PIPELINE,
        }
      : { pipeline: DG_CONSULT_PIPELINE },
  });

  const existingTasks = await listTasks({
    organisationId: input.organisationId,
    entityType: opportunity ? "Opportunity" : "Lead",
    entityId: opportunity?.id ?? lead.id,
    status: "open",
    limit: 8,
  });
  const hasHostTask = existingTasks.items.some((t) =>
    /platform consultation/i.test(t.title),
  );
  if (!hasHostTask) {
    await createTask({
      organisationId: input.organisationId,
      actorId: input.actorId,
      title: `Host Platform Consultation — ${slotLabel}`,
      description: appointment
        ? `Zoom: ${appointment.meetingLink}`
        : "Confirm the meeting time with the contact.",
      dueAt: appointment ? new Date(appointment.startsAt) : undefined,
      entityType: opportunity ? "Opportunity" : "Lead",
      entityId: opportunity?.id ?? lead.id,
      sourceApp: "automation",
      priority: "high",
      metadata: {
        automationRuleId: "dg.consultation.intake",
        leadId: lead.id,
      },
      createRelatedActivity: true,
    });
  }

  if (email && appointment) {
    const rendered = renderConsultationConfirmation({ firstName, appointment });
    const delivery = await sendMessage({
      organisationId: input.organisationId,
      channel: "email",
      to: email,
      cc: consultationEmailCc(email),
      subject: rendered.subject,
      body: rendered.body,
      bodyHtml: rendered.bodyHtml,
      attachments: [
        {
          filename: "digitalgate-consultation.ics",
          content: rendered.ics,
          contentType: "text/calendar; charset=utf-8; method=REQUEST",
        },
      ],
      metadata: {
        purpose: "consultation_confirmation",
        leadId: lead.id,
      },
    });

    const sequence = buildConsultationSequence({
      email,
      firstName,
      fullName:
        (typeof metadata.contact_name === "string" && metadata.contact_name) ||
        firstName,
      appointment,
    });
    sequence.confirmation_sent = delivery.status === "sent";

    const current = await prisma.lead.findFirst({ where: { id: lead.id } });
    const prev = (current?.metadata as Record<string, unknown> | null) ?? metadata;
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        metadata: {
          ...prev,
          lead_type: "consultation",
          requested_date: appointment.date,
          requested_time: appointment.time,
          meeting_link: appointment.meetingLink,
          consultation_sequence: sequence,
        } as Prisma.InputJsonValue,
      },
    });

    await createActivity({
      organisationId: input.organisationId,
      entityType: "Lead",
      entityId: lead.id,
      activityType: delivery.status === "sent" ? "email_sent" : "email_queued",
      title:
        delivery.status === "sent"
          ? "Consultation confirmation sent"
          : "Consultation confirmation queued",
      body: `${email} · ${delivery.provider}${delivery.error ? ` · ${delivery.error}` : ""}`,
      sourceApp: "automation",
      actorId: input.actorId,
      metadata: {
        automationRuleId: "dg.consultation.intake",
        emailStatus: delivery.status,
      },
    });
  }

  await createNotification({
    organisationId: input.organisationId,
    type: "automation.consultation_booked",
    title: "Platform Consultation booked",
    body: appointment
      ? `${firstName} booked ${slotLabel}`
      : `${firstName} requested a Platform Consultation`,
    href: opportunity
      ? `/apps/crm/opportunities/${opportunity.id}`
      : `/apps/crm/contacts`,
    entityType: "Lead",
    entityId: lead.id,
    metadata: { automationRuleId: "dg.consultation.intake" },
  });

  return true;
}

function consultationReminderSentKey(step: "24h" | "1h" | "followup") {
  if (step === "24h") return "reminder_24h_sent";
  if (step === "1h") return "reminder_1h_sent";
  return "followup_sent";
}

export async function processConsultationReminders(options?: {
  limit?: number;
}): Promise<{ processed: number; sent: number; failed: number }> {
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
    const due = dueConsultationReminderSteps(sequence, now);
    if (!due.length) continue;

    const appointment = parseConsultationAppointment({
      description: lead.description,
      metadata: meta,
    });
    if (!appointment) continue;

    for (const step of due) {
      if (processed >= limit) break;
      const rendered = renderConsultationReminder(step, {
        firstName: sequence.firstName,
        appointment,
      });
      const result = await runClaimedLeadFollowup({
        spec: {
          organisationId: lead.organisationId,
          leadId: lead.id,
          sequenceKey: "consultation_sequence",
          sentKey: consultationReminderSentKey(step),
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
        continue;
      }

      failed += 1;
      console.warn("[consultation-reminders] failed", {
        leadId: lead.id,
        step,
        status: result.status,
        error:
          result.status === "delivery_failed" ? result.error : undefined,
      });
    }
  }

  return { processed, sent, failed };
}

export type ConsultationAgendaItem = {
  opportunityId: string;
  title: string;
  stage: string;
  status: string;
  contactId: string | null;
  contactName: string;
  contactEmail: string | null;
  appointment: ConsultationAppointment | null;
  startsAt: string | null;
  meetingLink: string | null;
};

function appointmentFromOpportunityMetadata(
  metadata: Record<string, unknown> | null,
): ConsultationAppointment | null {
  const nested = metadata?.appointment;
  if (nested && typeof nested === "object" && nested !== null) {
    const a = nested as Record<string, unknown>;
    if (typeof a.startsAt === "string" && typeof a.date === "string") {
      return {
        date: a.date,
        time: typeof a.time === "string" ? a.time : "",
        timeLabel: typeof a.timeLabel === "string" ? a.timeLabel : "",
        timezone: typeof a.timezone === "string" ? a.timezone : "AEST",
        meetingLink:
          (typeof a.meetingLink === "string" && a.meetingLink) ||
          (typeof metadata?.meeting_link === "string" && metadata.meeting_link) ||
          "",
        startsAt: a.startsAt,
        endsAt: typeof a.endsAt === "string" ? a.endsAt : a.startsAt,
      };
    }
  }
  return parseConsultationAppointment({ metadata });
}

export async function listConsultationAgenda(options: {
  organisationId: string;
  limit?: number;
}): Promise<{
  upcoming: ConsultationAgendaItem[];
  past: ConsultationAgendaItem[];
  unscheduled: ConsultationAgendaItem[];
}> {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options.limit ?? 150, 200);
  const rows = await prisma.opportunity.findMany({
    where: {
      organisationId: options.organisationId,
      pipelineId: DG_CONSULT_PIPELINE,
    },
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const items: ConsultationAgendaItem[] = rows.map((row) => {
    const metadata = (row.metadata as Record<string, unknown> | null) ?? {};
    const appointment = appointmentFromOpportunityMetadata(metadata);
    const contactName = [row.contact?.firstName, row.contact?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return {
      opportunityId: row.id,
      title: row.title,
      stage: row.stage,
      status: row.status,
      contactId: row.contactId,
      contactName: contactName || row.title.replace(/^Platform Consultation — /i, ""),
      contactEmail: row.contact?.email ?? null,
      appointment,
      startsAt: appointment?.startsAt ?? null,
      meetingLink:
        appointment?.meetingLink ||
        (typeof metadata.meeting_link === "string" ? metadata.meeting_link : null),
    };
  });

  const now = Date.now();
  const upcoming: ConsultationAgendaItem[] = [];
  const past: ConsultationAgendaItem[] = [];
  const unscheduled: ConsultationAgendaItem[] = [];

  for (const item of items) {
    if (!item.startsAt) {
      unscheduled.push(item);
      continue;
    }
    const startMs = new Date(item.startsAt).getTime();
    if (Number.isNaN(startMs)) {
      unscheduled.push(item);
      continue;
    }
    if (startMs >= now) upcoming.push(item);
    else past.push(item);
  }

  upcoming.sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""));
  past.sort((a, b) => (b.startsAt || "").localeCompare(a.startsAt || ""));

  return { upcoming, past, unscheduled };
}
