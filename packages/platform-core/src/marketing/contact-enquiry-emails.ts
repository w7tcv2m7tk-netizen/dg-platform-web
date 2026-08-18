/**
 * DigitalGate general contact / Founding 10 enquiry acknowledgement.
 * Consultation bookings use consultation-emails.ts instead.
 */

import { composeEmailBody, type EmailBodyBlock } from "../communications/email-html";

const ACCENT = "#3B82F6";

const DG_CONTACT_STEPS = [
  "We'll review your enquiry and current requirements.",
  "We'll identify where DigitalGate may be able to help.",
  "Where appropriate, we'll arrange a free Platform Consultation to discuss your business and digital systems in more detail.",
];

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function humanizeLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/[A-Z]/.test(trimmed) || trimmed.includes(" ") || trimmed.includes("/")) {
    return trimmed;
  }
  return trimmed.replace(/_/g, " ");
}

export function formatEnquiryInterest(values: unknown): string | null {
  const labels = asStringList(values).map(humanizeLabel).filter(Boolean);
  if (!labels.length) return null;
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/** Customer-facing topic — never the internal CRM lead title. */
export function humanEnquiryTopic(
  metadata?: Record<string, unknown> | null,
): string {
  const meta = metadata ?? {};
  const topic =
    formatEnquiryInterest(meta.interested_in) ||
    formatEnquiryInterest(meta.apps_interest) ||
    "DigitalGate";
  return sanitizeEnquiryTopic(topic);
}

export function sanitizeEnquiryTopic(topic: string): string {
  const value = topic.trim();
  if (!value) return "DigitalGate";
  if (
    /^(contact enquiry|website enquiry|founding 10|platform consultation|funnel enquiry)\b/i.test(
      value,
    )
  ) {
    return "DigitalGate";
  }
  return value;
}

export function isDigitalGateGeneralEnquiry(input: {
  leadType?: string | null;
  leadTitle?: string | null;
  metadata?: Record<string, unknown> | null;
  orgBrandKey?: string | null;
  orgSlug?: string | null;
  orgName?: string | null;
}): boolean {
  const leadType = (input.leadType || "").trim().toLowerCase();
  if (leadType === "consultation") return false;

  const meta = input.metadata ?? {};
  const siteSlug =
    typeof meta.site_slug === "string" ? meta.site_slug.trim().toLowerCase() : "";
  const capturePath =
    typeof meta.capture_path === "string" ? meta.capture_path.trim() : "";
  const brand = (input.orgBrandKey || "").trim();
  const slug = (input.orgSlug || "").trim().toLowerCase();
  const name = (input.orgName || "").trim().toLowerCase();
  const title = (input.leadTitle || "").trim();

  if (
    leadType === "contact" ||
    leadType === "founding_10" ||
    leadType === "enquiry" ||
    leadType === "funnel_enquiry"
  ) {
    return true;
  }
  if (capturePath === "gen2_dg_enquiry" || capturePath === "website_builder_form") {
    return siteSlug === "digitalgate" || brand === "digitalgate" || slug.includes("digitalgate");
  }
  if (siteSlug === "digitalgate") return true;
  if (brand === "digitalgate") return true;
  if (slug.includes("digitalgate") || name.includes("digitalgate")) return true;
  if (/^(contact enquiry|founding 10|website enquiry)\b/i.test(title)) return true;
  return false;
}

export function renderDgContactEnquiryAck(input: {
  firstName: string;
  topic?: string;
}): { subject: string; body: string; bodyHtml: string; footerNote: string } {
  const name = input.firstName?.trim() || "there";
  const topic = sanitizeEnquiryTopic(input.topic?.trim() || "DigitalGate");
  const subject = "We've received your enquiry — DigitalGate";
  const body = [
    `Hi ${name},`,
    ``,
    `Thanks for getting in touch with DigitalGate.`,
    ``,
    `We've received your enquiry about ${topic} and will review the information you've provided before getting back to you.`,
    ``,
    `What happens next:`,
    ``,
    `1. ${DG_CONTACT_STEPS[0]}`,
    `2. ${DG_CONTACT_STEPS[1]}`,
    `3. ${DG_CONTACT_STEPS[2]}`,
    ``,
    `We aim to respond within one business day.`,
    ``,
    `If you'd prefer to speak with us directly, you can also contact Ben on 0405 227 227.`,
    ``,
    `We look forward to learning more about your business.`,
    ``,
    `Ben Roe`,
    `Founder · DigitalGate`,
    `The Gateway to Your Digital World™`,
    ``,
    `0405 227 227`,
    `hello@digitalgate.com.au`,
    `https://digitalgate.com.au`,
    ``,
    `DigitalGate`,
    `AI-powered Business Operating Platform`,
    `Connect · Centralise · Understand · Automate · Grow`,
  ].join("\n");

  const blocks: EmailBodyBlock[] = [
    { type: "kicker", text: "Enquiry received" },
    { type: "heading", text: "We've received your enquiry" },
    { type: "paragraph", text: `Hi ${name},` },
    {
      type: "paragraph",
      text: "Thanks for getting in touch with DigitalGate.",
    },
    {
      type: "paragraph",
      text: `We've received your enquiry about ${topic} and will review the information you've provided before getting back to you.`,
    },
    { type: "heading", text: "What happens next", level: 2 },
    { type: "list", items: DG_CONTACT_STEPS, ordered: true },
    {
      type: "highlight",
      text: "We aim to respond within one business day.",
    },
    {
      type: "html",
      html: `<p style="margin:0 0 16px;line-height:1.65;color:#E2E8F0;font-size:16px;">If you'd prefer to speak with us directly, you can also contact Ben on <a href="tel:+61405227227" style="color:#93C5FD;text-decoration:underline;">0405 227 227</a>.</p>`,
    },
    {
      type: "paragraph",
      text: "We look forward to learning more about your business.",
    },
    {
      type: "signoff",
      lines: [
        "Ben Roe",
        "Founder · DigitalGate",
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
      text: "Connect · Centralise · Understand · Automate · Grow",
      muted: true,
    },
  ];

  return {
    subject,
    body,
    bodyHtml: composeEmailBody(blocks, { accentColor: ACCENT }),
    footerNote:
      "You're receiving this email because you submitted an enquiry through DigitalGate.",
  };
}
