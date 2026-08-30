/**
 * Public Gen 2 Hideaway Circle join (CVH):
 * Contact + Acc guest profile + Lead nurture + welcome email.
 */

import type { Prisma } from "@dg/database";

import { claimLeadFollowupStep } from "../leads/followup-claim";

import { sendMessage } from "../communications";
import { ensureContactForLeadFields } from "../contacts";
import { findDomainByHostname } from "../infrastructure/domains/inventory";
import { createLead } from "../leads";
import { getWebsiteBySlug, createWebsitePage, updateWebsitePage } from "../websites/crud";
import { PRODUCT_FUNNEL_URLS } from "../websites/types";
import {
  buildHideawayCircleSequenceStamp,
  dueHideawayCircleFollowupSteps,
  hideawayCircleFollowupFlag,
  HIDEAWAY_CIRCLE_REWARD_PERCENT,
  parseHideawayCircleMeta,
  renderHideawayCircleFollowup,
  renderHideawayCircleWelcome,
  type HideawayCircleInterestId,
  type HideawayCircleMeta,
  type HideawayCircleSequenceMeta,
  type HideawayCircleTopicId,
} from "./hideaway-circle-emails";

async function resolveCvhOrgId(input: {
  siteSlug?: string;
  hostname?: string;
}): Promise<string | null> {
  const slug = input.siteSlug?.trim() || "currumbin-valley-hideaway";
  const site =
    (await getWebsiteBySlug(slug, { publishedOnly: true })) ||
    (await getWebsiteBySlug(slug));
  if (site?.organisationId) return site.organisationId;

  if (input.hostname?.trim()) {
    const found = await findDomainByHostname(input.hostname.trim());
    if (found?.website?.organisationId) return found.website.organisationId;
  }

  const { resolveOrganisationIdForStaySync } = await import("./bookings");
  return resolveOrganisationIdForStaySync({
    siteUrl: input.hostname
      ? `https://${input.hostname}`
      : "https://currumbinvalleyhideaway.com.au",
  });
}

/** Ensure published CVH WebsitePage slug=hideaway-circle exists. */
export async function ensureHideawayCircleWebsitePage(input: {
  siteSlug?: string;
  organisationId?: string;
}): Promise<{ ok: true; pageId: string; created: boolean } | { ok: false }> {
  const slug = input.siteSlug?.trim() || "currumbin-valley-hideaway";
  if (slug !== "currumbin-valley-hideaway") {
    return { ok: false };
  }
  const site =
    (await getWebsiteBySlug(slug, { publishedOnly: true })) ||
    (await getWebsiteBySlug(slug));
  if (!site) return { ok: false };
  if (
    input.organisationId &&
    site.organisationId !== input.organisationId
  ) {
    return { ok: false };
  }

  const { prisma } = await import("@dg/database");
  await ensureHideawayCircleFooterLink(site.id).catch(() => null);

  const existing = await prisma.websitePage.findFirst({
    where: { websiteId: site.id, slug: "hideaway-circle" },
  });
  const seo = {
    title: "The Hideaway Circle | Currumbin Valley Hideaway",
    description:
      "Join The Hideaway Circle for private offers, first access, and 10% off your next direct stay.",
    showHeader: false,
    showFooter: false,
  };
  if (existing) {
    const prevSeo = (existing.seo as Record<string, unknown> | null) ?? {};
    const needsChromeFix =
      prevSeo.showHeader === true || prevSeo.showFooter === true;
    if (existing.status !== "published" || needsChromeFix) {
      await updateWebsitePage({
        organisationId: site.organisationId,
        websiteId: site.id,
        pageId: existing.id,
        status: "published",
        title: "The Hideaway Circle",
        seo,
      });
    }
    return { ok: true, pageId: existing.id, created: false };
  }

  const page = await createWebsitePage({
    organisationId: site.organisationId,
    websiteId: site.id,
    title: "The Hideaway Circle",
    slug: "hideaway-circle",
    intent: "custom",
    components: [],
    seo,
  });
  if (!page) return { ok: false };
  await updateWebsitePage({
    organisationId: site.organisationId,
    websiteId: site.id,
    pageId: page.id,
    status: "published",
    seo,
  });
  return { ok: true, pageId: page.id, created: true };
}

/** Add Hideaway Circle to CVH chrome footer Quick Links when missing. */
export async function ensureHideawayCircleFooterLink(
  websiteId: string,
): Promise<{ updated: boolean }> {
  const { prisma } = await import("@dg/database");
  const site = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { id: true, metadata: true },
  });
  if (!site) return { updated: false };
  const meta =
    site.metadata && typeof site.metadata === "object" && !Array.isArray(site.metadata)
      ? ({ ...(site.metadata as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const chrome =
    meta.chrome && typeof meta.chrome === "object" && !Array.isArray(meta.chrome)
      ? ({ ...(meta.chrome as Record<string, unknown>) } as Record<string, unknown>)
      : null;
  if (!chrome || typeof chrome.footerHtml !== "string") return { updated: false };
  const before = chrome.footerHtml;
  if (/hideaway-circle/i.test(before)) return { updated: false };

  const link = `<li><a href="${PRODUCT_FUNNEL_URLS.hideaway_circle}">Hideaway Circle</a></li>`;
  let after = before;
  if (/<li><a href="\/contact\/?">Contact<\/a><\/li>/i.test(before)) {
    after = before.replace(
      /(<li><a href="\/contact\/?">Contact<\/a><\/li>)/i,
      `$1\n            ${link}`,
    );
  } else if (/<\/ul>\s*<\/div>\s*<!--\s*=====?\s*COLUMN\s*4:\s*Social/i.test(before)) {
    after = before.replace(
      /(<\/ul>\s*<\/div>\s*<!--\s*=====?\s*COLUMN\s*4:\s*Social)/i,
      `            ${link}\n          $1`,
    );
  } else {
    return { updated: false };
  }
  if (after === before) return { updated: false };

  chrome.footerHtml = after;
  meta.chrome = chrome;
  await prisma.website.update({
    where: { id: websiteId },
    data: { metadata: meta as Prisma.InputJsonValue },
  });
  return { updated: true };
}

export async function lookupHideawayCircleReward(input: {
  organisationId: string;
  email: string;
}): Promise<{ member: boolean; rewardPercent: number }> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { member: false, rewardPercent: 0 };
  }
  const { prisma } = await import("@dg/database");
  const contact = await prisma.contact.findFirst({
    where: {
      organisationId: input.organisationId,
      email,
      deletedAt: null,
    },
    include: { accommodationGuestProfile: true },
  });
  const circle = parseHideawayCircleMeta(
    contact?.accommodationGuestProfile?.metadata,
  );
  if (!circle) return { member: false, rewardPercent: 0 };
  return {
    member: true,
    rewardPercent: circle.rewardPercent || HIDEAWAY_CIRCLE_REWARD_PERCENT,
  };
}

export async function lookupHideawayCircleRewardForSite(input: {
  siteSlug?: string;
  hostname?: string;
  email: string;
}): Promise<
  | { ok: true; member: boolean; rewardPercent: number }
  | { ok: false; code: string; message: string }
> {
  const organisationId = await resolveCvhOrgId(input);
  if (!organisationId) {
    return {
      ok: false,
      code: "org_not_resolved",
      message: "Could not resolve Currumbin Valley Hideaway organisation",
    };
  }
  const result = await lookupHideawayCircleReward({
    organisationId,
    email: input.email,
  });
  return { ok: true, ...result };
}

function appendTag(existing: string | null | undefined, tag: string): string {
  const parts = (existing || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (!parts.includes(tag)) parts.push(tag);
  return parts.join(",");
}

export type SubmitHideawayCircleResult =
  | {
      ok: true;
      contactId: string;
      leadId: string;
      welcomeSent: boolean;
      stage: "email" | "complete";
      message: string;
    }
  | { ok: false; code: string; message: string };

export async function submitHideawayCircleJoin(input: {
  siteSlug?: string;
  hostname?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  birthdayMonth?: number | null;
  anniversaryDate?: string | null;
  interests?: string[];
  topics?: string[];
  joinSource?: string;
  stage?: "email" | "complete";
  /** honeypot */
  website?: string;
}): Promise<SubmitHideawayCircleResult> {
  if (input.website?.trim()) {
    return {
      ok: true,
      contactId: "honeypot",
      leadId: "honeypot",
      welcomeSent: false,
      stage: input.stage === "email" ? "email" : "complete",
      message: "Welcome to The Hideaway Circle.",
    };
  }

  const firstName = input.firstName?.trim() || "";
  const lastName = input.lastName?.trim() || "";
  const email = input.email?.trim().toLowerCase() || "";
  const phone = input.phone?.trim() || "";
  const stage: "email" | "complete" =
    input.stage === "email" || (!firstName && !phone) ? "email" : "complete";

  if (!email || !email.includes("@")) {
    return {
      ok: false,
      code: "validation_error",
      message: "A valid email is required.",
    };
  }
  if (stage === "complete") {
    if (!firstName) {
      return {
        ok: false,
        code: "validation_error",
        message: "First name is required.",
      };
    }
    if (!phone) {
      return {
        ok: false,
        code: "validation_error",
        message: "Mobile number is required.",
      };
    }
  }

  const birthdayMonth =
    typeof input.birthdayMonth === "number" &&
    input.birthdayMonth >= 1 &&
    input.birthdayMonth <= 12
      ? input.birthdayMonth
      : undefined;
  const anniversaryDate = input.anniversaryDate?.trim() || undefined;
  const interests = (input.interests || []).filter(
    (id): id is HideawayCircleInterestId => typeof id === "string" && !!id,
  );
  const topics = (input.topics || []).filter(
    (id): id is HideawayCircleTopicId => typeof id === "string" && !!id,
  );
  const joinSource = (input.joinSource || "website").trim().slice(0, 64);
  const marketingConsent = true;

  const organisationId = await resolveCvhOrgId(input);
  if (!organisationId) {
    return {
      ok: false,
      code: "org_not_resolved",
      message: "Could not resolve Currumbin Valley Hideaway organisation",
    };
  }

  await ensureHideawayCircleWebsitePage({
    siteSlug: input.siteSlug,
    organisationId,
  }).catch(() => null);

  const displayName = [firstName, lastName].filter(Boolean).join(" ");
  const ensured = await ensureContactForLeadFields({
    organisationId,
    name: displayName || email.split("@")[0] || "Guest",
    email,
    phone,
    source: "hideaway_circle",
  });
  if (!ensured) {
    return {
      ok: false,
      code: "contact_failed",
      message: "Could not save your details. Please try again.",
    };
  }

  const { prisma } = await import("@dg/database");
  const contact = await prisma.contact.findFirst({
    where: { id: ensured.id, organisationId },
  });
  if (!contact) {
    return {
      ok: false,
      code: "contact_failed",
      message: "Could not save your details. Please try again.",
    };
  }

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      tags: appendTag(contact.tags, "hideaway-circle"),
      phone: phone || contact.phone,
      firstName: firstName || contact.firstName,
      lastName: lastName || contact.lastName,
      source: contact.source || "hideaway_circle",
    },
  });

  const existingLead = await prisma.lead.findFirst({
    where: {
      organisationId,
      contactId: contact.id,
      source: "hideaway_circle",
    },
    orderBy: { createdAt: "desc" },
  });
  const prevLeadMeta =
    existingLead?.metadata && typeof existingLead.metadata === "object"
      ? (existingLead.metadata as Record<string, unknown>)
      : {};
  const prevSequence = prevLeadMeta.hideaway_circle_sequence as
    | HideawayCircleSequenceMeta
    | undefined;

  if (stage === "email") {
    const leadMeta = {
      ...prevLeadMeta,
      lead_type: "accommodation",
      capture_path: "gen2_hideaway_circle",
      capture_stage: "email",
      contact_name: displayName || email,
      email,
      phone: phone || prevLeadMeta.phone || "",
    };
    let leadId = existingLead?.id;
    if (existingLead) {
      await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          title: existingLead.title || `Hideaway Circle — ${email}`,
          description: email,
          metadata: leadMeta as Prisma.InputJsonValue,
        },
      });
    } else {
      const lead = await createLead({
        organisationId,
        source: "hideaway_circle",
        title: `Hideaway Circle — ${email}`,
        description: email,
        contactId: contact.id,
        status: "new",
        metadata: leadMeta,
        externalRefs: { capture_path: "gen2_hideaway_circle" },
      });
      leadId = lead.id;
    }
    return {
      ok: true,
      contactId: contact.id,
      leadId: leadId || "pending",
      welcomeSent: false,
      stage: "email",
      message: "Continue to finish joining The Hideaway Circle.",
    };
  }

  const circle: HideawayCircleMeta = {
    joinedAt:
      (prevLeadMeta.hideaway_circle as HideawayCircleMeta | undefined)?.joinedAt ||
      new Date().toISOString(),
    rewardPercent: HIDEAWAY_CIRCLE_REWARD_PERCENT,
    permanent: true,
    birthdayMonth,
    anniversaryDate,
    interests,
    topics,
    joinSource,
  };

  const existingProfile = await prisma.accommodationGuestProfile.findUnique({
    where: { contactId: contact.id },
  });
  const prevMeta =
    existingProfile?.metadata && typeof existingProfile.metadata === "object"
      ? (existingProfile.metadata as Record<string, unknown>)
      : {};

  if (existingProfile) {
    await prisma.accommodationGuestProfile.update({
      where: { contactId: contact.id },
      data: {
        marketingConsent,
        metadata: {
          ...prevMeta,
          hideawayCircle: circle,
        } as Prisma.InputJsonValue,
      },
    });
  } else {
    await prisma.accommodationGuestProfile.create({
      data: {
        organisationId,
        contactId: contact.id,
        marketingConsent,
        metadata: { hideawayCircle: circle } as Prisma.InputJsonValue,
      },
    });
  }

  const bookUrl = "https://currumbinvalleyhideaway.com.au/stay";
  const alreadyWelcomed = Boolean(prevSequence?.welcome_sent);
  let welcomeSent = alreadyWelcomed;
  if (!alreadyWelcomed) {
    const welcome = renderHideawayCircleWelcome({
      firstName,
      email,
      bookUrl,
    });
    try {
      const delivery = await sendMessage({
        organisationId,
        channel: "email",
        to: email,
        subject: welcome.subject,
        body: welcome.body,
        bodyHtml: welcome.bodyHtml,
        metadata: {
          purpose: "hideaway_circle_welcome",
          contactId: contact.id,
          ctaLabel: "Book your return stay",
          footerNote: "You're receiving this because you joined The Hideaway Circle.",
        },
      });
      welcomeSent = delivery.status === "sent" || delivery.status === "queued";
    } catch (err) {
      console.info("[hideaway-circle] welcome email failed", err);
    }
  }

  const sequence = buildHideawayCircleSequenceStamp({
    firstName,
    lastName,
    email,
    birthdayMonth: birthdayMonth ?? null,
    bookUrl,
    welcomeSent,
    marketingConsent,
  });

  const leadMeta = {
    ...prevLeadMeta,
    lead_type: "accommodation",
    capture_path: "gen2_hideaway_circle",
    capture_stage: "complete",
    contact_name: displayName,
    email,
    phone,
    hideaway_circle: circle,
    hideaway_circle_sequence: sequence,
  };

  let leadId = existingLead?.id;
  if (existingLead) {
    await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        title: `Hideaway Circle — ${displayName || firstName}`,
        description: email,
        metadata: leadMeta as Prisma.InputJsonValue,
      },
    });
  } else {
    const lead = await createLead({
      organisationId,
      source: "hideaway_circle",
      title: `Hideaway Circle — ${displayName || firstName}`,
      description: email,
      contactId: contact.id,
      status: "new",
      metadata: leadMeta,
      externalRefs: { capture_path: "gen2_hideaway_circle" },
    });
    leadId = lead.id;
  }

  return {
    ok: true,
    contactId: contact.id,
    leadId: leadId || contact.id,
    welcomeSent,
    stage: "complete",
    message: welcomeSent
      ? "You're in The Hideaway Circle — check your inbox for your 10% return-stay reward."
      : "You're in The Hideaway Circle. Your 10% return-stay reward applies on your next direct booking.",
  };
}

export async function processHideawayCircleFollowups(options?: {
  limit?: number;
}): Promise<{ processed: number; sent: number; failed: number }> {
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
    if (!sequence.marketingConsent) continue;
    if (!sequence.welcome_sent) continue;

    // Skip nurture if they have a future stay booked
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

    const due = dueHideawayCircleFollowupSteps(sequence, now);
    if (!due.length) continue;

    for (const step of due) {
      if (processed >= limit) break;

      // Claim this (lead, step) before sending so two concurrent cron
      // invocations cannot both deliver it.
      const flags = hideawayCircleFollowupFlag(step);
      const owned = await claimLeadFollowupStep({
        leadId: lead.id,
        organisationId: lead.organisationId,
        sequenceKey: "hideaway_circle",
        step,
        sentPath: ["hideaway_circle_sequence", flags.sent],
      });
      if (!owned) continue;

      processed += 1;
      const rendered = renderHideawayCircleFollowup(step, {
        firstName: sequence.firstName,
        email: sequence.email,
        bookUrl: sequence.bookUrl,
      });

      try {
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

        const nextSeq = {
          ...sequence,
          [flags.sent]: true,
          [flags.sentAt]: new Date().toISOString(),
        } as HideawayCircleSequenceMeta;

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            metadata: {
              ...meta,
              hideaway_circle_sequence: nextSeq,
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
            title: `Hideaway Circle ${step}`,
            body: `${sequence.email} · ${rendered.subject}`,
            sourceApp: "accommodation",
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
        console.error("[hideaway-circle-followups] send failed", lead.id, step, err);
      }
    }
  }

  return { processed, sent, failed };
}
