#!/usr/bin/env node
/**
 * Roe RE flow diagnostics — vendor lead, property, contact links.
 * Usage: node scripts/roe-flow-diagnose.mjs [leadId]
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const prisma = new PrismaClient();
const leadId = process.argv[2] ?? "cmsfmvrnw000jif04188h6qmg";

async function main() {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });

  if (!lead) {
    console.log("Lead not found:", leadId);
    return;
  }

  const contact = lead.contactId
    ? await prisma.contact.findUnique({
        where: { id: lead.contactId },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : null;

  const property = await prisma.property.findFirst({
    where: { leadId: lead.id },
    select: {
      id: true,
      addressLine1: true,
      suburb: true,
      state: true,
      postcode: true,
      status: true,
    },
  });

  const meta = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : {};

  console.log("Vendor lead:", {
    id: lead.id,
    status: lead.status,
    source: lead.source,
    title: lead.title,
    address: meta.address ?? meta.propertyAddress ?? null,
    contact: contact
      ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() +
        (contact.email ? ` <${contact.email}>` : "")
      : null,
    property: property
      ? `${property.addressLine1}, ${property.suburb} ${property.state} (${property.status})`
      : null,
  });

  const paymentRequests = await prisma.commercePaymentRequest.findMany({
    where: { sourceEntityType: "Lead", sourceEntityId: leadId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      totalCents: true,
      providerSessionId: true,
      createdAt: true,
    },
  });

  console.log("\nPayment requests:", paymentRequests.length);
  for (const r of paymentRequests) {
    const mode = r.providerSessionId?.startsWith("cs_live_") ? "LIVE" : "TEST";
    console.log(
      `  [${mode}] ${r.status} $${(r.totalCents / 100).toFixed(0)} — ${r.providerSessionId?.slice(0, 24)}…`,
    );
  }

  const payments = await prisma.commercePayment.count({
    where: {
      paymentRequest: { sourceEntityType: "Lead", sourceEntityId: leadId },
    },
  });
  console.log("\nRecorded payments:", payments);

  const gaps = [];
  if (!contact) gaps.push("No contact linked");
  if (!property) gaps.push("No property linked");
  if (paymentRequests.every((r) => r.status !== "paid")) {
    gaps.push("No paid payment request");
  }
  if (payments === 0) gaps.push("No commerce_payments row");

  if (gaps.length) {
    console.log("\nGaps:", gaps.join("; "));
  } else {
    console.log("\nFlow complete ✓");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
