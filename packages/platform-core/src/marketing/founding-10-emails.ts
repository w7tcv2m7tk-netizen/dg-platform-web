/**
 * DigitalGate Founding 10 application acknowledgement.
 * Confirms receipt and process — never implies acceptance.
 */

import { composeEmailBody, escapeHtml, type EmailBodyBlock } from "../communications/email-html";

const ACCENT = "#3B82F6";

const FOUNDING_STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Application review",
    body: "We'll review your business, current systems, goals and the areas where you're looking for DigitalGate to help.",
  },
  {
    title: "Platform consultation",
    body: "Where appropriate, we'll arrange a short consultation to understand your business in more detail and explore how DigitalGate could fit into your operations.",
  },
  {
    title: "Founding 10 acceptance",
    body: "If DigitalGate is a suitable fit, we'll confirm your Founding 10 place and provide your specific founding commercial terms.",
  },
  {
    title: "Onboarding",
    body: "Once accepted, you'll complete a signed-in DigitalGate onboarding to configure your environment — not a public 12-section form.",
  },
];

const FOUNDING_ADVANTAGES = [
  "30% off initial Platform + Apps for 24 months",
  "Priority onboarding",
  "Early access to selected Apps",
  "Direct roadmap input",
  "Founding recognition",
  "Selected members may be invited into the Founding Reseller Programme (not automatic)",
];

function metaString(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[],
): string {
  const meta = metadata ?? {};
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function isFounding10Application(input: {
  leadType?: string | null;
  leadTitle?: string | null;
  metadata?: Record<string, unknown> | null;
}): boolean {
  const leadType = (input.leadType || "").trim().toLowerCase();
  if (leadType === "founding_10") return true;
  const meta = input.metadata ?? {};
  const metaType = typeof meta.lead_type === "string" ? meta.lead_type.trim().toLowerCase() : "";
  if (metaType === "founding_10") return true;
  const pageSlug =
    typeof meta.page_slug === "string" ? meta.page_slug.trim().toLowerCase() : "";
  if (pageSlug === "founding-customers" || pageSlug === "founding") return true;
  const formType = typeof meta.form_type === "string" ? meta.form_type.trim().toLowerCase() : "";
  if (formType.includes("founding")) return true;
  if (meta.agreed_founding_terms === true || meta.agreed_founding_terms === "yes") {
    return true;
  }
  return /founding 10/i.test(input.leadTitle || "");
}

function foundingNextStepsHtml(): string {
  const items = FOUNDING_STEPS.map(
    (step) =>
      `<li style="margin:0 0 14px;color:#E2E8F0;line-height:1.55;"><strong style="color:#F8FAFC;">${escapeHtml(step.title)}</strong><br><span style="color:#CBD5E1;">${escapeHtml(step.body)}</span></li>`,
  ).join("");
  return `<ol style="margin:0 0 18px;padding-left:1.25rem;color:#E2E8F0;">${items}</ol>`;
}

export function renderDgFounding10ApplicationAck(input: {
  firstName: string;
  businessName?: string | null;
  industry?: string | null;
  teamSize?: string | null;
}): { subject: string; body: string; bodyHtml: string; footerNote: string } {
  const name = input.firstName?.trim() || "there";
  const business = input.businessName?.trim() || "";
  const industry = input.industry?.trim() || "";
  const teamSize = input.teamSize?.trim() || "";
  const subject = "Founding 10 Application Received — DigitalGate";

  const summaryLines: string[] = [];
  if (business) summaryLines.push(`Business: ${business}`);
  if (industry) summaryLines.push(`Industry: ${industry}`);
  if (teamSize) summaryLines.push(`Team size: ${teamSize}`);

  const body = [
    `Hi ${name},`,
    ``,
    `Thank you for applying to join the DigitalGate Founding 10.`,
    ``,
    `We've received your application and will review the information you've provided to determine whether DigitalGate is a good fit for your business and current requirements.`,
    ``,
    `What happens next`,
    ``,
    ...FOUNDING_STEPS.flatMap((step, index) => [
      `${index + 1}. ${step.title}`,
      step.body,
      ``,
    ]),
    ...(summaryLines.length
      ? [`Your Founding 10 application`, ``, ...summaryLines, ``]
      : []),
    `The Founding 10 is limited to the first 10 accepted businesses and provides the highest founding commercial advantage:`,
    ``,
    ...FOUNDING_ADVANTAGES.map((item) => `• ${item}`),
    ``,
    `Your application does not constitute acceptance into the Founding 10. If accepted, your exact commercial terms will be confirmed in your Founding Customer offer.`,
    ``,
    `If you have any questions in the meantime, simply reply to this email or contact me directly.`,
    ``,
    `I look forward to learning more about your business.`,
    ``,
    `Ben Roe`,
    `Founder & Platform Architect`,
    `DigitalGate`,
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

  const kvRows = [
    business ? { label: "Business", value: business } : null,
    industry ? { label: "Industry", value: industry } : null,
    teamSize ? { label: "Team size", value: teamSize } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const blocks: EmailBodyBlock[] = [
    { type: "kicker", text: "Founding 10 application" },
    { type: "heading", text: "We've received your application" },
    { type: "paragraph", text: `Hi ${name},` },
    {
      type: "paragraph",
      text: "Thank you for applying to join the DigitalGate Founding 10.",
    },
    {
      type: "paragraph",
      text: "We've received your application and will review the information you've provided to determine whether DigitalGate is a good fit for your business and current requirements.",
    },
    { type: "heading", text: "What happens next", level: 2 },
    { type: "html", html: foundingNextStepsHtml() },
  ];

  if (kvRows.length) {
    blocks.push(
      { type: "heading", text: "Your Founding 10 application", level: 2 },
      { type: "kv", rows: kvRows },
    );
  }

  blocks.push(
    {
      type: "paragraph",
      text: "The Founding 10 is limited to the first 10 accepted businesses and provides the highest founding commercial advantage:",
    },
    { type: "list", items: FOUNDING_ADVANTAGES },
    {
      type: "highlight",
      text: "Your application does not constitute acceptance into the Founding 10. If accepted, your exact commercial terms will be confirmed in your Founding Customer offer.",
    },
    {
      type: "html",
      html: `<p style="margin:0 0 16px;line-height:1.65;color:#E2E8F0;font-size:16px;">If you have any questions in the meantime, simply reply to this email or contact me directly on <a href="tel:+61405227227" style="color:#93C5FD;text-decoration:underline;">0405 227 227</a>.</p>`,
    },
    {
      type: "paragraph",
      text: "I look forward to learning more about your business.",
    },
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
      text: "Connect · Centralise · Understand · Automate · Grow",
      muted: true,
    },
  );

  return {
    subject,
    body,
    bodyHtml: composeEmailBody(blocks, { accentColor: ACCENT }),
    footerNote:
      "You're receiving this email because you submitted a Founding 10 application through DigitalGate.",
  };
}

export function founding10AckFromLeadMetadata(
  firstName: string,
  metadata?: Record<string, unknown> | null,
) {
  return renderDgFounding10ApplicationAck({
    firstName,
    businessName: metaString(metadata, ["business_name", "businessName"]),
    industry: metaString(metadata, ["industry"]),
    teamSize: metaString(metadata, ["team_size", "teamSize"]),
  });
}
