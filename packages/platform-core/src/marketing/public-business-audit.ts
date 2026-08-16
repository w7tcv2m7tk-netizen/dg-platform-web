/**
 * Public Gen 2 free Business Audit funnel (DigitalGate):
 * probe website → capture lead → presence audit email → follow-up sequence.
 */

import type { Prisma } from "@dg/database";

import { sendMessage } from "../communications";
import { runPresenceAudit } from "../command-centre/growth-engine/presence-audit";
import type { PresenceAuditResult } from "../command-centre/growth-engine/presence-audit";
import { getTransactionalEmailProvider } from "../infrastructure/email/transactional";
import { findDomainByHostname } from "../infrastructure/domains/inventory";
import { createLead } from "../leads";
import { createContact } from "../contacts";
import { getWebsiteBySlug } from "../websites/crud";
import {
  buildFreeAuditSequenceStamp,
  dueFreeAuditFollowupSteps,
  renderFreeAuditFollowup,
  type FreeAuditSequenceMeta,
} from "./business-audit-emails";

function normaliseWebsiteUrl(raw: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withScheme);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

async function resolveDgOrgId(input: {
  siteSlug?: string;
  hostname?: string;
}): Promise<string | null> {
  const slug = input.siteSlug?.trim() || "digitalgate";
  const site =
    (await getWebsiteBySlug(slug, { publishedOnly: true })) ||
    (await getWebsiteBySlug(slug));
  if (site?.organisationId) return site.organisationId;

  if (input.hostname?.trim()) {
    const found = await findDomainByHostname(input.hostname.trim());
    if (found?.website?.organisationId) return found.website.organisationId;
  }

  const { prisma } = await import("@dg/database");
  const { resolveOrgBrandPresetKey } = await import("../org/brand-presets");
  const orgs = await prisma.organisation.findMany({
    select: { id: true, name: true, slug: true, industry: true, settings: true },
    take: 100,
  });
  for (const org of orgs) {
    if (resolveOrgBrandPresetKey(org) === "digitalgate") return org.id;
  }
  return null;
}

export type PublicBusinessAuditProbeResult =
  | {
      ok: true;
      websiteUrl: string;
      reachable: boolean | null;
      title: string | null;
      https: boolean | null;
    }
  | { ok: false; code: string; message: string };

export type PublicBusinessAuditSubmitResult =
  | {
      ok: true;
      leadId: string;
      auditSent: boolean;
      overallScore: number;
      message: string;
    }
  | { ok: false; code: string; message: string };

export async function probePublicBusinessAuditWebsite(input: {
  websiteUrl: string;
  siteSlug?: string;
  hostname?: string;
}): Promise<PublicBusinessAuditProbeResult> {
  const websiteUrl = normaliseWebsiteUrl(input.websiteUrl);
  if (!websiteUrl) {
    return {
      ok: false,
      code: "validation_error",
      message: "Enter a valid website URL (e.g. youragency.com.au).",
    };
  }

  const orgId = await resolveDgOrgId(input);
  if (!orgId) {
    return {
      ok: false,
      code: "org_not_resolved",
      message: "Could not resolve DigitalGate organisation for this site",
    };
  }

  const audit = await runPresenceAudit({
    businessName: "Prospect",
    websiteUrl,
  });

  return {
    ok: true,
    websiteUrl,
    reachable: audit.probes.reachable,
    title: audit.probes.title,
    https: audit.probes.https,
  };
}

function renderAuditEmailBody(input: {
  firstName: string;
  companyName: string;
  websiteUrl: string;
  audit: PresenceAuditResult;
}): { subject: string; body: string; overall: number } {
  const scores = input.audit.scores;
  const overall = Math.round(
    (scores.businessHealth ?? 0) * 0.4 +
      (scores.websiteHealth ?? 0) * 0.25 +
      (scores.seo ?? 0) * 0.2 +
      (scores.aiVisibility ?? 0) * 0.15,
  );
  const findings = (input.audit.findings || [])
    .slice(0, 8)
    .map(
      (f) =>
        `- [${f.severity}] ${f.title}${f.detail ? ` — ${f.detail}` : ""}`,
    )
    .join("\n");

  const body = `Hi ${input.firstName},

Your free Business Audit for ${input.companyName} is ready.

Website: ${input.websiteUrl}

SCORES (live presence probe)
- Overall: ${overall}/100
- Digital Business Health: ${scores.businessHealth ?? "—"}/100
- Website Health: ${scores.websiteHealth ?? "—"}/100
- SEO signals: ${scores.seo ?? "—"}/100
- AI visibility signals: ${scores.aiVisibility ?? "—"}/100

${
  input.audit.probes.title
    ? `Homepage title: ${input.audit.probes.title}\n`
    : ""
}Reachable: ${input.audit.probes.reachable === true ? "Yes" : input.audit.probes.reachable === false ? "No" : "Unknown"}
HTTPS: ${input.audit.probes.https ? "Yes" : "No"}

KEY FINDINGS
${findings || "- No critical findings from this probe."}

These scores reflect observable website signals only — we never invent SEO or AI rankings.

I'll send a short series of follow-ups with breakdowns and next steps. Or book a free strategy session anytime:
https://digitalgate.com.au/strategy-session

— Ben Roe | DigitalGate
https://digitalgate.com.au`;

  return {
    subject: `Your Business Audit Results — ${input.companyName}`,
    body,
    overall,
  };
}

export async function submitPublicBusinessAudit(input: {
  siteSlug?: string;
  hostname?: string;
  websiteUrl: string;
  businessName: string;
  fullName: string;
  email?: string;
  phone?: string;
  website?: string;
}): Promise<PublicBusinessAuditSubmitResult> {
  if (input.website?.trim()) {
    return {
      ok: true,
      leadId: "honeypot",
      auditSent: false,
      overallScore: 0,
      message: "Audit request received.",
    };
  }

  const fullName = input.fullName?.trim() || "";
  const businessName = input.businessName?.trim() || "";
  const email = input.email?.trim() || "";
  const phone = input.phone?.trim() || "";
  const websiteUrl = normaliseWebsiteUrl(input.websiteUrl);

  if (!websiteUrl) {
    return {
      ok: false,
      code: "validation_error",
      message: "Enter a valid website URL.",
    };
  }
  if (!businessName) {
    return {
      ok: false,
      code: "validation_error",
      message: "Business name is required.",
    };
  }
  if (!fullName) {
    return {
      ok: false,
      code: "validation_error",
      message: "Full name is required.",
    };
  }
  if (!email && !phone) {
    return {
      ok: false,
      code: "validation_error",
      message: "Please provide either an email or mobile number.",
    };
  }

  const organisationId = await resolveDgOrgId(input);
  if (!organisationId) {
    return {
      ok: false,
      code: "org_not_resolved",
      message: "Could not resolve DigitalGate organisation for this site",
    };
  }

  const firstName = fullName.split(/\s+/)[0] || fullName;
  const parts = fullName.split(/\s+/);

  let contactId: string | undefined;
  if (email || phone) {
    try {
      const contact = await createContact({
        organisationId,
        firstName: parts[0] ?? fullName,
        lastName: parts.slice(1).join(" ") || undefined,
        email: email || undefined,
        phone: phone || undefined,
        source: "free_audit",
      });
      contactId = contact.id;
    } catch (err) {
      console.info("[public-business-audit] contact create", err);
    }
  }

  const audit = await runPresenceAudit({
    businessName,
    websiteUrl,
    contactEmail: email || null,
    contactPhone: phone || null,
  });

  const report = renderAuditEmailBody({
    firstName,
    companyName: businessName,
    websiteUrl,
    audit,
  });

  const lead = await createLead({
    organisationId,
    source: "free_audit",
    title: `Business Audit — ${businessName}`,
    description: websiteUrl,
    contactId,
    status: "new",
    metadata: {
      lead_type: "marketing",
      capture_path: "gen2_public_business_audit",
      website_url: websiteUrl,
      business_name: businessName,
      contact_name: fullName,
      email: email || undefined,
      phone: phone || undefined,
      audit_scores: audit.scores,
      audit_findings: audit.findings,
      audit_probes: audit.probes,
      overall_score: report.overall,
    },
    externalRefs: {
      capture_path: "gen2_public_business_audit",
    },
  });

  let auditSent = false;
  if (email) {
    try {
      const delivery = await sendMessage({
        organisationId,
        channel: "email",
        to: email,
        subject: report.subject,
        body: report.body,
        metadata: {
          purpose: "free_audit_report",
          leadId: lead.id,
          footerNote:
            "Scores from a live website presence probe. Not a formal SEO ranking report.",
        },
      });
      auditSent = delivery.status === "sent" || delivery.status === "queued";
    } catch (err) {
      console.info("[public-business-audit] report email failed", err);
    }

    const sequence = buildFreeAuditSequenceStamp({
      firstName,
      fullName,
      companyName: businessName,
      websiteUrl,
      email,
      aiScore: audit.scores.aiVisibility ?? 0,
      websiteScore: audit.scores.websiteHealth ?? 0,
      seoScore: audit.scores.seo ?? 0,
      overallScore: report.overall,
      email1Sent: auditSent,
    });

    const { prisma } = await import("@dg/database");
    const current = await prisma.lead.findFirst({ where: { id: lead.id } });
    if (current) {
      const prev = (current.metadata as Record<string, unknown> | null) ?? {};
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          metadata: {
            ...prev,
            free_audit_sequence: sequence,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  // Admin notify
  const adminTo =
    process.env.DG_BUSINESS_AUDIT_ADMIN_EMAIL?.trim() ||
    "hello@digitalgate.com.au";
  try {
    const mail = getTransactionalEmailProvider();
    const text = [
      "New free Business Audit request",
      "",
      `Business: ${businessName}`,
      `Website: ${websiteUrl}`,
      `Name: ${fullName}`,
      `Email: ${email || "Not provided"}`,
      `Phone: ${phone || "Not provided"}`,
      `Overall score: ${report.overall}`,
      `Audit emailed: ${auditSent ? "yes" : "no"}`,
    ].join("\n");
    if (mail.isConfigured()) {
      await mail.send({
        organisationId,
        to: adminTo,
        subject: `Business Audit Request - ${businessName}`,
        text,
        tags: ["business-audit", "admin"],
      });
    } else {
      await sendMessage({
        organisationId,
        channel: "email",
        to: adminTo,
        subject: `Business Audit Request - ${businessName}`,
        body: text,
        metadata: { purpose: "free_audit_admin" },
      });
    }
  } catch (err) {
    console.info("[public-business-audit] admin notify failed", err);
  }

  return {
    ok: true,
    leadId: lead.id,
    auditSent,
    overallScore: report.overall,
    message: auditSent
      ? "Your Business Audit is on its way — check your inbox shortly."
      : "Audit request received! We'll be in touch shortly.",
  };
}

export async function processFreeAuditFollowups(options?: {
  limit?: number;
}): Promise<{ processed: number; sent: number; failed: number }> {
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
    if (!sequence?.email || !sequence.activatedAt) continue;

    const due = dueFreeAuditFollowupSteps(sequence, now);
    if (!due.length) continue;

    for (const step of due) {
      if (processed >= limit) break;
      processed += 1;
      const rendered = renderFreeAuditFollowup(step, {
        firstName: sequence.firstName,
        fullName: sequence.fullName,
        companyName: sequence.companyName,
        websiteUrl: sequence.websiteUrl,
        aiScore: sequence.aiScore,
        websiteScore: sequence.websiteScore,
        seoScore: sequence.seoScore,
        overallScore: sequence.overallScore,
      });

      try {
        const delivery = await sendMessage({
          organisationId: lead.organisationId,
          channel: "email",
          to: sequence.email,
          subject: rendered.subject,
          body: rendered.body,
          metadata: {
            purpose: `free_audit_followup_${step}`,
            leadId: lead.id,
          },
        });

        const nextSeq = {
          ...sequence,
          [`email_${step}_sent`]: true,
          [`email_${step}_sent_at`]: new Date().toISOString(),
        } as FreeAuditSequenceMeta;

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            metadata: {
              ...meta,
              free_audit_sequence: nextSeq,
            } as Prisma.InputJsonValue,
          },
        });

        await prisma.activity.create({
          data: {
            organisationId: lead.organisationId,
            entityType: "Lead",
            entityId: lead.id,
            activityType:
              delivery.status === "sent" ? "email_sent" : "email_queued",
            title: `Business audit follow-up ${step}`,
            body: `${sequence.email} · ${rendered.subject}`,
            sourceApp: "marketing",
            metadata: {
              step,
              deliveryId: delivery.id,
              deliveryStatus: delivery.status,
            } as Prisma.InputJsonValue,
          },
        });

        if (delivery.status === "failed") failed += 1;
        else sent += 1;
        Object.assign(sequence, nextSeq);
      } catch (err) {
        failed += 1;
        console.error("[free-audit-followups] send failed", lead.id, step, err);
      }
    }
  }

  return { processed, sent, failed };
}
