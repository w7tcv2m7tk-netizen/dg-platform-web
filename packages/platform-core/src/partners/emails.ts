import type { EmailBodyBlock } from "../communications/email-html";
import { composeEmailBody } from "../communications/email-html";
import {
  APPROVED_PARTNER_MESSAGING,
  FOUNDING_RESELLER_PROGRAMME_NAME,
  RESELLER_MAY,
} from "./programme";
import { PARTNER_COMMISSION_CONFIG } from "./types";

const ACCENT = "#3B82F6";

function appOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.digitalgate.com.au";
  return raw.replace(/\/$/, "");
}

function publicSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://digitalgate.com.au";
  return raw.replace(/\/$/, "");
}

export function foundingResellerInviteUrl(inviteToken: string): string {
  const token = encodeURIComponent(inviteToken.trim());
  return `${publicSiteOrigin()}/founding-resellers/invite/${token}`;
}

export function foundingResellerPortalUrl(): string {
  return `${appOrigin()}/partner`;
}

export function deliveryPartnerInviteUrl(inviteToken: string): string {
  const token = encodeURIComponent(inviteToken.trim());
  return `${publicSiteOrigin()}/delivery-partners/invite/${token}`;
}

export function deliveryPartnerPortalUrl(): string {
  return `${appOrigin()}/partner/delivery`;
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
  ];
}

const RESELLER = PARTNER_COMMISSION_CONFIG.FOUNDING_RESELLER;

export const FOUNDING_RESELLER_INVITE_POINTS = [
  `${RESELLER.commissionBps / 100}% commission on qualifying Platform + App subscription fees`,
  `Paid for the first ${RESELLER.durationMonths} months of each new customer you directly refer`,
  "DigitalGate qualifies, demonstrates, contracts, onboards, and bills",
  "You introduce suitable Australian businesses — you do not sell, implement, or support",
  "Invitation only. Not an affiliate programme. Not automatic with Founding 10 membership",
] as const;

export function renderFoundingResellerInvitationEmail(input: {
  firstName: string;
  businessName?: string | null;
  inviteToken: string;
}): { subject: string; body: string; bodyHtml: string; footerNote: string } {
  const name = input.firstName?.trim() || "there";
  const business = input.businessName?.trim() || "your network";
  const inviteUrl = foundingResellerInviteUrl(input.inviteToken);
  const subject = `I'd like to invite you into the ${FOUNDING_RESELLER_PROGRAMME_NAME}`;

  const body = [
    `Hi ${name},`,
    ``,
    `I'm opening a small first wave of DigitalGate Founding Resellers, and I'd like to personally invite you.`,
    ``,
    APPROVED_PARTNER_MESSAGING.body,
    ``,
    APPROVED_PARTNER_MESSAGING.close,
    ``,
    `As a Founding Reseller you can:`,
    ``,
    ...RESELLER_MAY.map((item) => `• ${item}`),
    ``,
    `This is not an affiliate programme, and it is not automatic. Accepting the invitation starts the conversation — DigitalGate still approves you into the programme.`,
    ``,
    `Accept Your Founding Reseller Invitation: ${inviteUrl}`,
    ``,
    `I'd be pleased to have ${business} among the first introducers.`,
    ``,
    `Regards,`,
    `Ben Roe`,
    `Founder & Platform Architect`,
    `DigitalGate`,
  ].join("\n");

  const bodyHtml = composeEmailBody(
    [
      { type: "kicker", text: "Personal invitation" },
      { type: "heading", text: `Join the ${FOUNDING_RESELLER_PROGRAMME_NAME}` },
      { type: "paragraph", text: `Hi ${name},` },
      {
        type: "paragraph",
        text: `I'm opening a small first wave of DigitalGate Founding Resellers, and I'd like to personally invite you.`,
      },
      { type: "paragraph", text: APPROVED_PARTNER_MESSAGING.body },
      { type: "paragraph", text: APPROVED_PARTNER_MESSAGING.close },
      { type: "heading", text: "What Founding Resellers do", level: 2 },
      { type: "list", items: [...RESELLER_MAY] },
      { type: "heading", text: "How it works", level: 2 },
      { type: "list", items: [...FOUNDING_RESELLER_INVITE_POINTS] },
      {
        type: "paragraph",
        text: "Accepting this invitation does not activate commission. DigitalGate still approves you into the programme.",
      },
      { type: "button", label: "Accept Founding Reseller Invitation →", href: inviteUrl },
      {
        type: "paragraph",
        text: `I'd be pleased to have ${business} among the first introducers.`,
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
      "You're receiving this because Ben Roe personally invited you into the DigitalGate Founding Reseller Programme. This is not automatic acceptance, and it is not an affiliate programme.",
  };
}

export const DELIVERY_PARTNER_INVITE_POINTS = [
  "You help DigitalGate deliver customer onboarding — configuration, migration support, training and go-live",
  "You work on customers assigned to you (or all delivery work if you are a Delivery Manager)",
  "DigitalGate owns the customer relationship, platform, billing and quality standard",
  "Head of Implementation / Delivery Managers allocate work and run QA",
  "Invitation only. Not a reseller commission role. Not a public marketplace listing",
] as const;

export function renderDeliveryPartnerInvitationEmail(input: {
  firstName: string;
  businessName?: string | null;
  inviteToken: string;
  deliveryRole: "lead" | "member";
}): { subject: string; body: string; bodyHtml: string; footerNote: string } {
  const name = input.firstName?.trim() || "there";
  const business = input.businessName?.trim() || "your practice";
  const inviteUrl = deliveryPartnerInviteUrl(input.inviteToken);
  const roleLabel = input.deliveryRole === "lead" ? "Delivery Manager" : "Delivery Partner";
  const subject = `I'd like to invite you as a DigitalGate ${roleLabel}`;

  const body = [
    `Hi ${name},`,
    ``,
    `I'm building DigitalGate's Delivery capability — the team that onboards founding customers onto the platform — and I'd like to personally invite you as a ${roleLabel}.`,
    ``,
    `Delivery Partners help configure DigitalGate for each customer, support migration, train teams, and take implementations through QA to go-live. Resellers introduce; Delivery delivers.`,
    ``,
    `As a ${roleLabel} you will:`,
    ``,
    ...DELIVERY_PARTNER_INVITE_POINTS.map((item) => `• ${item}`),
    ``,
    `Accepting this invitation starts partner setup. DigitalGate still approves you into the Delivery programme.`,
    ``,
    `Accept Your Delivery Partner Invitation: ${inviteUrl}`,
    ``,
    `I'd be pleased to have ${business} on the founding Delivery team.`,
    ``,
    `Regards,`,
    `Ben Roe`,
    `Founder & Platform Architect`,
    `DigitalGate`,
  ].join("\n");

  const bodyHtml = composeEmailBody(
    [
      { type: "kicker", text: "Personal invitation" },
      { type: "heading", text: `Join DigitalGate as a ${roleLabel}` },
      { type: "paragraph", text: `Hi ${name},` },
      {
        type: "paragraph",
        text: `I'm building DigitalGate's Delivery capability — the team that onboards founding customers onto the platform — and I'd like to personally invite you as a ${roleLabel}.`,
      },
      {
        type: "paragraph",
        text: "Delivery Partners help configure DigitalGate for each customer, support migration, train teams, and take implementations through QA to go-live. Resellers introduce; Delivery delivers.",
      },
      { type: "heading", text: "How Delivery Partners work", level: 2 },
      { type: "list", items: [...DELIVERY_PARTNER_INVITE_POINTS] },
      {
        type: "paragraph",
        text: "Accepting this invitation does not activate Delivery access automatically. DigitalGate still approves you into the programme.",
      },
      { type: "button", label: "Accept Delivery Partner Invitation →", href: inviteUrl },
      {
        type: "paragraph",
        text: `I'd be pleased to have ${business} on the founding Delivery team.`,
      },
      ...signoffBlocks(),
    ],
    { accentColor: "#10B981" },
  );

  return {
    subject,
    body,
    bodyHtml,
    footerNote:
      "You're receiving this because Ben Roe personally invited you into DigitalGate Delivery. This is not a reseller invitation, and it is not automatic acceptance.",
  };
}
