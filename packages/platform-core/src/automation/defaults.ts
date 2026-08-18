import { createActivity } from "../activities";
import { ensureContactForLeadFields } from "../contacts";
import { platformEvents } from "../events";
import type { PlatformEvent } from "../events/types";
import { handlePlatformConsultationIntake } from "../marketing/consultation-automation";
import { createNotification } from "../notifications";
import { convertLeadToOpportunity } from "../opportunities";
import { createTask, listTasks } from "../tasks";
import { registerAutomationRule, runAutomationForEvent } from "./engine";

/** Wire default cross-app automations (real founding-path actions, not console stubs). */
export function bootDefaultAutomations() {
  if ((globalThis as { __dgAutomationBooted?: boolean }).__dgAutomationBooted) {
    return;
  }
  (globalThis as { __dgAutomationBooted?: boolean }).__dgAutomationBooted = true;

  // CRM / RE events arrive via the bus; commerce still calls runAutomationForEvent directly.
  const busTypes = [
    "lead.created",
    "lead.converted",
    "opportunity.created",
    "opportunity.won",
  ] as const;
  for (const type of busTypes) {
    platformEvents.subscribe(type, async (event) => {
      await runAutomationForEvent(event);
    });
  }

  registerAutomationRule({
    id: "re.vendor_enquiry.intake",
    trigger: "lead.created",
    action: "ensure_contact_opportunity_task_ack",
    handler: handleVendorEnquiryIntake,
  });

  registerAutomationRule({
    id: "crm.opportunity.follow_up_task",
    trigger: "opportunity.created",
    action: "create_follow_up_task",
    handler: handleOpportunityFollowUp,
  });

  registerAutomationRule({
    id: "commerce.payment.completed.notify",
    trigger: "commerce.payment.completed",
    action: "notify_payment_completed",
    handler: handlePaymentCompleted,
  });

  // Keep quiet log companion for quote accepted (honest, low-noise).
  registerAutomationRule({
    id: "commerce.quote.accepted.notify",
    trigger: "commerce.quote.accepted",
    action: "notify_and_task_quote_accepted",
    handler: handleQuoteAccepted,
  });

  registerAutomationRule({
    id: "commerce.invoice.overdue.notify",
    trigger: "commerce.invoice.overdue",
    action: "notify_invoice_overdue",
    handler: handleInvoiceOverdue,
  });
}

async function handleVendorEnquiryIntake(event: PlatformEvent) {
  const leadId = event.entityId;
  if (!leadId) return;

  const handled = await handlePlatformConsultationIntake({
    organisationId: event.organisationId,
    leadId,
    actorId: event.actorId,
  });
  if (handled) return;

  const { prisma } = await import("@dg/database");
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organisationId: event.organisationId },
  });
  if (!lead) return;

  const metadata = (lead.metadata as Record<string, unknown> | null) ?? {};
  const leadType =
    typeof metadata.lead_type === "string" ? metadata.lead_type : "vendor";

  let contactId = lead.contactId;
  if (!contactId) {
    const ensured = await ensureContactForLeadFields({
      organisationId: event.organisationId,
      actorId: event.actorId,
      name:
        (metadata.contact_name as string | undefined) ||
        (metadata.wp_name as string | undefined) ||
        lead.title ||
        undefined,
      email: metadata.email as string | undefined,
      phone: metadata.phone as string | undefined,
      source: lead.source,
    });
    contactId = ensured?.id ?? null;
    if (contactId) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { contactId },
      });
    }
  }

  const opportunity = await convertLeadToOpportunity({
    organisationId: event.organisationId,
    leadId: lead.id,
    actorId: event.actorId,
  });

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 1);

  const existingTasks = await listTasks({
    organisationId: event.organisationId,
    entityType: opportunity ? "Opportunity" : "Lead",
    entityId: opportunity?.id ?? lead.id,
    status: "open",
    limit: 5,
  });
  const hasFollowUp = existingTasks.items.some((t) =>
    /follow.?up/i.test(t.title),
  );

  if (!hasFollowUp) {
    await createTask({
      organisationId: event.organisationId,
      actorId: event.actorId,
      title:
        leadType === "buyer"
          ? "Follow up buyer enquiry"
          : "Follow up vendor enquiry",
      description: `Auto-created from lead ${lead.title ?? lead.id}. Contact within 24 hours.`,
      dueAt,
      entityType: opportunity ? "Opportunity" : "Lead",
      entityId: opportunity?.id ?? lead.id,
      sourceApp: "automation",
      priority: "high",
      metadata: { automationRuleId: "re.vendor_enquiry.intake", leadId: lead.id },
      createRelatedActivity: true,
    });
  }

  const contactEmail =
    typeof metadata.email === "string" ? metadata.email.trim() : "";
  let contactRowEmail = contactEmail;
  let contactFirstName = "";
  if (contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, organisationId: event.organisationId },
      select: { email: true, firstName: true },
    });
    if (!contactRowEmail) {
      contactRowEmail = contact?.email?.trim() ?? "";
    }
    contactFirstName = contact?.firstName?.trim() ?? "";
  }
  if (!contactFirstName) {
    const rawName =
      (typeof metadata.contact_name === "string" && metadata.contact_name) ||
      (typeof metadata.wp_name === "string" && metadata.wp_name) ||
      (typeof metadata.first_name === "string" && metadata.first_name) ||
      (typeof metadata.firstName === "string" && metadata.firstName) ||
      "";
    contactFirstName = rawName.trim().split(/\s+/)[0] || "";
  }
  const greetingName = contactFirstName || "there";

  if (contactRowEmail) {
    const { sendMessage } = await import("../communications");
    const { composeEmailBody } = await import("../communications/email-html");
    const org = await prisma.organisation.findUnique({
      where: { id: event.organisationId },
      select: { name: true },
    });
    const agency = org?.name?.trim() || "our team";
    const body = [
      `Hi ${greetingName},`,
      ``,
      `Thanks for getting in touch with ${agency}. We've received your enquiry`,
      lead.title ? `about "${lead.title}"` : "and",
      `someone from the team will follow up shortly.`,
      ``,
      `— ${agency} via DigitalGate`,
    ].join("\n");
    const result = await sendMessage({
      organisationId: event.organisationId,
      channel: "email",
      to: contactRowEmail,
      subject: `Thanks for your enquiry — ${agency}`,
      body,
      bodyHtml: composeEmailBody(
        [
          { type: "paragraph", text: `Hi ${greetingName},` },
          {
            type: "heading",
            text: `Thanks for getting in touch with ${agency}`,
            level: 2,
          },
          {
            type: "paragraph",
            text: lead.title
              ? `We've received your enquiry about "${lead.title}" and someone from the team will follow up shortly.`
              : "We've received your enquiry and someone from the team will follow up shortly.",
          },
          {
            type: "signoff",
            lines: [`— ${agency} via DigitalGate`],
          },
        ],
        { accentColor: "#3B82F6" },
      ),
      metadata: { purpose: "automation_lead_ack" },
    });

    await createActivity({
      organisationId: event.organisationId,
      entityType: "Lead",
      entityId: lead.id,
      activityType: result.status === "sent" ? "email_sent" : "email_queued",
      title:
        result.status === "sent"
          ? "Acknowledgement email sent"
          : "Acknowledgement email queued",
      body: `${contactRowEmail} · ${result.provider}${result.error ? ` · ${result.error}` : ""}`,
      sourceApp: "automation",
      actorId: event.actorId,
      metadata: {
        automationRuleId: "re.vendor_enquiry.intake",
        emailStatus: result.status,
        provider: result.provider,
      },
    });
  }

  await createNotification({
    organisationId: event.organisationId,
    type: "automation.lead_intake",
    title: leadType === "buyer" ? "Buyer enquiry intake ran" : "Vendor enquiry intake ran",
    body: opportunity
      ? `Contact + opportunity + follow-up task ready for ${lead.title ?? "lead"}.`
      : `Contact + follow-up task ready for ${lead.title ?? "lead"}.`,
    href: opportunity
      ? `/apps/crm/opportunities/${opportunity.id}`
      : `/apps/re/vendor-leads/${lead.id}`,
    entityType: "Lead",
    entityId: lead.id,
    metadata: { automationRuleId: "re.vendor_enquiry.intake" },
  });
}

async function handleOpportunityFollowUp(event: PlatformEvent) {
  const opportunityId = event.entityId;
  if (!opportunityId) return;

  // Lead intake already creates the follow-up when converting — skip duplicates.
  if (event.payload?.leadId) return;

  const existing = await listTasks({
    organisationId: event.organisationId,
    entityType: "Opportunity",
    entityId: opportunityId,
    status: "open",
    limit: 10,
  });
  if (existing.items.some((t) => /follow.?up/i.test(t.title))) {
    return;
  }

  const title =
    typeof event.payload?.title === "string"
      ? event.payload.title
      : "Opportunity";

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 2);

  await createTask({
    organisationId: event.organisationId,
    actorId: event.actorId,
    title: `Follow up: ${title}`,
    description: "Auto-created when the opportunity was opened.",
    dueAt,
    entityType: "Opportunity",
    entityId: opportunityId,
    sourceApp: "automation",
    metadata: { automationRuleId: "crm.opportunity.follow_up_task" },
    createRelatedActivity: true,
  });
}

async function handlePaymentCompleted(event: PlatformEvent) {
  await createNotification({
    organisationId: event.organisationId,
    type: "automation.payment_completed",
    title: "Payment completed",
    body: "A commerce payment completed — check invoices and CRM if needed.",
    href: "/apps/commerce",
    entityType: event.entityType ?? "Payment",
    entityId: event.entityId,
    metadata: {
      automationRuleId: "commerce.payment.completed.notify",
      payload: event.payload,
    },
  });

  console.info("[automation] payment completed", {
    organisationId: event.organisationId,
    entityId: event.entityId,
  });
}

async function handleQuoteAccepted(event: PlatformEvent) {
  const quoteId = event.entityId;
  const quoteNumber =
    typeof event.payload?.quoteNumber === "string"
      ? event.payload.quoteNumber
      : quoteId?.slice(0, 8) || "quote";

  await createNotification({
    organisationId: event.organisationId,
    type: "automation.quote_accepted",
    title: "Quote accepted",
    body: `${quoteNumber} was accepted — convert to invoice or schedule the job.`,
    href: quoteId ? `/apps/commerce/quotes/${quoteId}` : "/apps/commerce/quotes",
    entityType: "CommerceQuote",
    entityId: quoteId,
    metadata: { automationRuleId: "commerce.quote.accepted.notify" },
  });

  if (quoteId) {
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 1);
    await createTask({
      organisationId: event.organisationId,
      actorId: event.actorId,
      title: `Follow up accepted quote ${quoteNumber}`,
      description: "Auto-created when the quote was accepted.",
      dueAt,
      entityType: "CommerceQuote",
      entityId: quoteId,
      sourceApp: "automation",
      priority: "high",
      metadata: { automationRuleId: "commerce.quote.accepted.notify" },
      createRelatedActivity: true,
    });
  }
}

async function handleInvoiceOverdue(event: PlatformEvent) {
  const invoiceId = event.entityId;
  const invoiceNumber =
    typeof event.payload?.invoiceNumber === "string"
      ? event.payload.invoiceNumber
      : invoiceId?.slice(0, 8) || "invoice";

  await createNotification({
    organisationId: event.organisationId,
    type: "automation.invoice_overdue",
    title: "Invoice overdue",
    body: `${invoiceNumber} is overdue — send a reminder or follow up.`,
    href: invoiceId
      ? `/apps/commerce/invoices/${invoiceId}`
      : "/apps/commerce/invoices",
    entityType: "CommerceInvoice",
    entityId: invoiceId,
    metadata: { automationRuleId: "commerce.invoice.overdue.notify" },
  });
}

/**
 * Mark past-due open invoices as overdue and emit automation events.
 * Call from a cron / Command health job — safe to run repeatedly.
 */
export async function scanOverdueCommerceInvoices(organisationId?: string) {
  const { prisma } = await import("@dg/database");
  const now = new Date();
  const where = {
    status: { in: ["sent", "viewed", "partially_paid"] as string[] },
    dueAt: { lt: now },
    ...(organisationId ? { organisationId } : {}),
  };

  const due = await prisma.commerceInvoice.findMany({
    where,
    select: {
      id: true,
      organisationId: true,
      invoiceNumber: true,
      totalCents: true,
    },
    take: 100,
  });

  let marked = 0;
  for (const invoice of due) {
    await prisma.commerceInvoice.update({
      where: { id: invoice.id },
      data: { status: "overdue" },
    });
    marked += 1;
    const event: PlatformEvent = {
      type: "commerce.invoice.overdue",
      organisationId: invoice.organisationId,
      entityType: "CommerceInvoice",
      entityId: invoice.id,
      payload: {
        invoiceNumber: invoice.invoiceNumber,
        totalCents: invoice.totalCents,
      },
      occurredAt: now,
    };
    await runAutomationForEvent(event);
  }

  return { scanned: due.length, marked };
}
