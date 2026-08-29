/**
 * Founding 10 post-acceptance emails.
 * Application ack stays in founding-10-emails.ts and must never imply acceptance.
 */

import type { EmailBodyBlock } from "../communications/email-html";
import { composeEmailBody } from "../communications/email-html";
import { FOUNDING_PERSONAL_INVITE_BENEFITS } from "./types";

const ACCENT = "#3B82F6";

const FOUNDING_BENEFITS = [
  "Founding Customer status — limited access, not discounted access",
  "Priority onboarding",
  "Early access to selected Apps",
  "Direct input into product development",
  "Direct relationship with the DigitalGate team",
  "Founding recognition, with your permission",
  "Standard published Platform + Apps pricing (14-day trial; annual ≈ 10 months)",
  "Selected members may be invited into the DigitalGate Founding Acquisition Partner Programme (invitation only)",
];

function appOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.digitalgate.com.au";
  return raw.replace(/\/$/, "");
}

export function foundingSetupUrl(inviteToken: string): string {
  const token = encodeURIComponent(inviteToken.trim());
  return `${appOrigin()}/founding/setup?invite=${token}`;
}

export function foundingAgreementUrl(inviteToken: string): string {
  const token = encodeURIComponent(inviteToken.trim());
  return `${appOrigin()}/founding/agreement?invite=${token}`;
}

export function foundingOnboardingUrl(inviteToken?: string | null): string {
  const base = `${appOrigin()}/onboarding`;
  const token = inviteToken?.trim();
  return token ? `${base}?invite=${encodeURIComponent(token)}` : base;
}

export function foundingImplementationUrl(): string {
  return `${appOrigin()}/implementation`;
}

function publicSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://digitalgate.com.au";
  return raw.replace(/\/$/, "");
}

/** Personal invitation — public site, not the generic application form. */
export function foundingPersonalInviteUrl(inviteToken: string): string {
  const token = encodeURIComponent(inviteToken.trim());
  return `${publicSiteOrigin()}/founding-customers/invite/${token}`;
}

function signoffBlocks(): EmailBodyBlock[] {
  return [
    {
      type: "signoff",
      lines: [
        "Ben Roe",
        "Founder & Platform Architect",
        "DigitalGate",
        "The Gateway to Your Digital World™",
        "0405 227 227",
        "hello@digitalgate.com.au",
        "https://digitalgate.com.au",
      ],
    },
    { type: "divider" },
    { type: "paragraph", text: "DigitalGate", muted: true },
    {
      type: "paragraph",
      text: "AI-powered Business Operating Platform",
      muted: true,
    },
    {
      type: "paragraph",
      text: "Connect · Centralise · Understand · Decide · Act · Learn · Grow",
      muted: true,
    },
  ];
}

export function renderFoundingAcceptanceEmail(input: {
  firstName: string;
  businessName?: string | null;
  inviteToken: string;
}): { subject: string; body: string; bodyHtml: string; footerNote: string } {
  const name = input.firstName?.trim() || "there";
  const business = input.businessName?.trim() || "your business";
  const setupUrl = foundingSetupUrl(input.inviteToken);
  const subject = "You're officially a DigitalGate Founding 10 customer";

  const body = [
    `Hi ${name},`,
    ``,
    `I'm pleased to let you know that we've accepted ${business} into the DigitalGate Founding 10 Programme.`,
    ``,
    `You're now one of the first 10 businesses helping shape DigitalGate as we build the Business Operating Platform for modern Australian businesses.`,
    ``,
    `Your Founding 10 benefits include:`,
    ``,
    ...FOUNDING_BENEFITS.map((item) => `• ${item}`),
    ``,
    `Your next steps`,
    ``,
    `There are three things we'll now complete:`,
    ``,
    `1. Founding Agreement`,
    `We'll confirm your commercial terms and programme participation.`,
    ``,
    `2. DigitalGate Onboarding`,
    `Once the agreement is completed, you'll be guided through the information we need to configure your DigitalGate environment.`,
    ``,
    `3. Platform Setup & Go-Live`,
    `We'll configure your Core platform, selected Apps, integrations and initial workflows before taking you live.`,
    ``,
    `Start your onboarding: ${setupUrl}`,
    ``,
    `If you'd prefer, we can also go through the onboarding process together during your next Platform Consultation.`,
    ``,
    `Welcome to DigitalGate.`,
    ``,
    `I'm looking forward to building this with you.`,
    ``,
    `Ben Roe`,
    `Founder & Platform Architect`,
    `DigitalGate`,
  ].join("\n");

  const nextStepsHtml = `<ol style="margin:0 0 18px;padding-left:1.25rem;color:#E2E8F0;">
<li style="margin:0 0 14px;color:#E2E8F0;line-height:1.55;"><strong style="color:#F8FAFC;">Founding Agreement</strong><br><span style="color:#CBD5E1;">We'll confirm your commercial terms and programme participation.</span></li>
<li style="margin:0 0 14px;color:#E2E8F0;line-height:1.55;"><strong style="color:#F8FAFC;">DigitalGate Onboarding</strong><br><span style="color:#CBD5E1;">Once the agreement is completed, you'll be guided through the information we need to configure your DigitalGate environment.</span></li>
<li style="margin:0 0 14px;color:#E2E8F0;line-height:1.55;"><strong style="color:#F8FAFC;">Platform Setup &amp; Go-Live</strong><br><span style="color:#CBD5E1;">We'll configure your Core platform, selected Apps, integrations and initial workflows before taking you live.</span></li>
</ol>`;

  const blocks: EmailBodyBlock[] = [
    { type: "kicker", text: "Founding 10" },
    { type: "heading", text: "You're officially a DigitalGate Founding 10 customer" },
    { type: "paragraph", text: `Hi ${name},` },
    {
      type: "paragraph",
      text: `I'm pleased to let you know that we've accepted ${business} into the DigitalGate Founding 10 Programme.`,
    },
    {
      type: "paragraph",
      text: "You're now one of the first 10 businesses helping shape DigitalGate as we build the Business Operating Platform for modern Australian businesses.",
    },
    { type: "heading", text: "Your Founding 10 benefits include", level: 2 },
    { type: "list", items: FOUNDING_BENEFITS },
    { type: "heading", text: "Your next steps", level: 2 },
    {
      type: "paragraph",
      text: "There are three things we'll now complete:",
    },
    { type: "html", html: nextStepsHtml },
    { type: "button", label: "Complete Your Founding Customer Setup →", href: setupUrl },
    {
      type: "paragraph",
      text: "If you'd prefer, we can also go through the onboarding process together during your next Platform Consultation.",
    },
    { type: "paragraph", text: "Welcome to DigitalGate." },
    { type: "paragraph", text: "I'm looking forward to building this with you." },
    ...signoffBlocks(),
  ];

  return {
    subject,
    body,
    bodyHtml: composeEmailBody(blocks, { accentColor: ACCENT }),
    footerNote:
      "You're receiving this email because DigitalGate accepted your Founding 10 application.",
  };
}

export function renderFoundingAgreementEmail(input: {
  firstName: string;
  businessName?: string | null;
  inviteToken: string;
}): { subject: string; body: string; bodyHtml: string; footerNote: string } {
  const name = input.firstName?.trim() || "there";
  const business = input.businessName?.trim() || "your business";
  const href = foundingAgreementUrl(input.inviteToken);
  const subject = "Founding 10 Agreement — DigitalGate";

  const body = [
    `Hi ${name},`,
    ``,
    `Please review and confirm the Founding 10 commercial terms for ${business}.`,
    ``,
    `The agreement is separate from onboarding. Once it's confirmed, we'll open the guided DigitalGate onboarding in the app.`,
    ``,
    `Review agreement: ${href}`,
    ``,
    `Ben Roe`,
    `Founder & Platform Architect`,
    `DigitalGate`,
  ].join("\n");

  const blocks: EmailBodyBlock[] = [
    { type: "kicker", text: "Founding 10 agreement" },
    { type: "heading", text: "Confirm your Founding 10 terms" },
    { type: "paragraph", text: `Hi ${name},` },
    {
      type: "paragraph",
      text: `Please review and confirm the Founding 10 commercial terms for ${business}.`,
    },
    {
      type: "paragraph",
      text: "The agreement is separate from onboarding. Once it's confirmed, we'll open the guided DigitalGate onboarding in the app.",
    },
    { type: "button", label: "Review Founding Agreement →", href },
    ...signoffBlocks(),
  ];

  return {
    subject,
    body,
    bodyHtml: composeEmailBody(blocks, { accentColor: ACCENT }),
    footerNote: "Sent because a Founding 10 agreement was issued for your business.",
  };
}

export function renderFoundingOnboardingInviteEmail(input: {
  firstName: string;
  inviteToken: string;
}): { subject: string; body: string; bodyHtml: string; footerNote: string } {
  const name = input.firstName?.trim() || "there";
  const href = foundingOnboardingUrl(input.inviteToken);
  const subject = "Start your DigitalGate onboarding";

  const body = [
    `Hi ${name},`,
    ``,
    `Your Founding Agreement is in place. Next we'll configure DigitalGate around your business.`,
    ``,
    `This is a guided, signed-in onboarding — not a 12-page workbook. You can save and return. Estimated 20–30 minutes.`,
    ``,
    `Start onboarding: ${href}`,
    ``,
    `Ben Roe`,
    `DigitalGate`,
  ].join("\n");

  const blocks: EmailBodyBlock[] = [
    { type: "kicker", text: "Founding 10 onboarding" },
    { type: "heading", text: "Let's configure your DigitalGate environment" },
    { type: "paragraph", text: `Hi ${name},` },
    {
      type: "paragraph",
      text: "Your Founding Agreement is in place. Next we'll configure DigitalGate around your business.",
    },
    {
      type: "paragraph",
      text: "This is a guided, signed-in onboarding — not a 12-page workbook. You can save and return. Estimated 20–30 minutes.",
    },
    { type: "button", label: "Start DigitalGate Onboarding →", href },
    ...signoffBlocks(),
  ];

  return {
    subject,
    body,
    bodyHtml: composeEmailBody(blocks, { accentColor: ACCENT }),
    footerNote: "Sent after your Founding 10 agreement was confirmed.",
  };
}

export function renderFoundingSetupPlanEmail(input: {
  firstName: string;
  businessName?: string | null;
  priorities: string[];
  recommendedCore: string[];
  recommendedGrowth: string[];
  recommendedIndustry: string[];
}): { subject: string; body: string; bodyHtml: string; footerNote: string } {
  const name = input.firstName?.trim() || "there";
  const business = input.businessName?.trim() || "your business";
  const href = foundingImplementationUrl();
  const subject = "Your DigitalGate Setup Plan";

  const body = [
    `Hi ${name},`,
    ``,
    `We've received your onboarding information for ${business}.`,
    ``,
    `DigitalGate has created your initial implementation plan.`,
    ``,
    `First priorities:`,
    ...input.priorities.slice(0, 3).map((item, i) => `${i + 1}. ${item}`),
    ``,
    `View your plan: ${href}`,
    ``,
    `Ben Roe`,
    `DigitalGate`,
  ].join("\n");

  const kv: Array<{ label: string; value: string }> = [];
  if (input.recommendedCore.length) kv.push({ label: "Core", value: input.recommendedCore.join(" · ") });
  if (input.recommendedGrowth.length)
    kv.push({ label: "Growth", value: input.recommendedGrowth.join(" · ") });
  if (input.recommendedIndustry.length)
    kv.push({ label: "Industry", value: input.recommendedIndustry.join(" · ") });

  const blocks: EmailBodyBlock[] = [
    { type: "kicker", text: "Implementation plan" },
    { type: "heading", text: "Your DigitalGate Setup Plan" },
    { type: "paragraph", text: `Hi ${name},` },
    {
      type: "paragraph",
      text: `We've received your onboarding information for ${business}. DigitalGate has analysed your requirements and created your initial implementation plan.`,
    },
    { type: "heading", text: "Your first three priorities", level: 2 },
    {
      type: "list",
      ordered: true,
      items: input.priorities.slice(0, 3).length
        ? input.priorities.slice(0, 3)
        : ["Configure organisation and Core", "Connect key systems", "Set Goals and first automations"],
    },
  ];
  if (kv.length) {
    blocks.push({ type: "heading", text: "Recommended starting platform", level: 2 }, { type: "kv", rows: kv });
  }
  blocks.push(
    { type: "button", label: "Open implementation status →", href },
    ...signoffBlocks(),
  );

  return {
    subject,
    body,
    bodyHtml: composeEmailBody(blocks, { accentColor: ACCENT }),
    footerNote: "Sent because you submitted DigitalGate Founding Customer onboarding.",
  };
}

export function renderFoundingPersonalInvitationEmail(input: {
  firstName: string;
  businessName?: string | null;
  inviteToken: string;
}): { subject: string; body: string; bodyHtml: string; footerNote: string } {
  const name = input.firstName?.trim() || "there";
  const business = input.businessName?.trim() || "your business";
  const inviteUrl = foundingPersonalInviteUrl(input.inviteToken);
  const subject = "I'd like to invite you to join DigitalGate's Founding 10";

  const body = [
    `Hi ${name},`,
    ``,
    `It was great speaking with you about ${business}.`,
    ``,
    `As I mentioned, I'm currently opening the first 10 businesses into the DigitalGate Founding Customer Programme, and after our conversation I think ${business} would be a strong fit for the first cohort.`,
    ``,
    `I'd therefore like to personally invite you to participate in the Founding 10.`,
    ``,
    `As a Founding 10 business, you'll receive:`,
    ``,
    ...FOUNDING_PERSONAL_INVITE_BENEFITS.map((item) => `• ${item}`),
    ``,
    `The idea isn't a discount programme. I'm looking for a small group of businesses who are prepared to actually operate on DigitalGate and help shape the platform through real-world use.`,
    ``,
    `If you're interested, the next step is a short Platform Consultation where we'll look at your current systems, how the business operates and where DigitalGate could fit.`,
    ``,
    `Accept Your Founding 10 Invitation: ${inviteUrl}`,
    ``,
    `Once you've accepted the invitation, we'll take you through the consultation and formal onboarding process.`,
    ``,
    `I'd be very pleased to have ${business} among the first 10.`,
    ``,
    `Regards,`,
    `Ben Roe`,
    `Founder & Platform Architect`,
    `DigitalGate`,
    `The Gateway to Your Digital World™`,
  ].join("\n");

  const bodyHtml = composeEmailBody(
    [
      { type: "kicker", text: "Personal invitation" },
      { type: "heading", text: "Join DigitalGate's Founding 10" },
      { type: "paragraph", text: `Hi ${name},` },
      { type: "paragraph", text: `It was great speaking with you about ${business}.` },
      {
        type: "paragraph",
        text: `As I mentioned, I'm currently opening the first 10 businesses into the DigitalGate Founding Customer Programme, and after our conversation I think ${business} would be a strong fit for the first cohort.`,
      },
      {
        type: "paragraph",
        text: `I'd therefore like to personally invite you to participate in the Founding 10.`,
      },
      { type: "heading", text: "As a Founding 10 business, you'll receive", level: 2 },
      { type: "list", items: FOUNDING_PERSONAL_INVITE_BENEFITS },
      {
        type: "paragraph",
        text: `The idea isn't a discount programme. I'm looking for a small group of businesses who are prepared to actually operate on DigitalGate and help shape the platform through real-world use.`,
      },
      {
        type: "paragraph",
        text: `If you're interested, the next step is a short Platform Consultation where we'll look at your current systems, how the business operates and where DigitalGate could fit.`,
      },
      { type: "button", label: "Accept Your Founding 10 Invitation →", href: inviteUrl },
      {
        type: "paragraph",
        text: `Once you've accepted the invitation, we'll take you through the consultation and formal onboarding process.`,
      },
      {
        type: "paragraph",
        text: `I'd be very pleased to have ${business} among the first 10.`,
      },
      ...signoffBlocks(),
    ],
    { accentColor: ACCENT },
  );

  return {
    subject,
    body,
    bodyHtml,
    footerNote:
      "You're receiving this because Ben Roe personally invited you to DigitalGate's Founding 10. This is not automatic acceptance into the programme.",
  };
}
