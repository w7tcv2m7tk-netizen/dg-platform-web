/**
 * Free DigitalGate Business Audit™ nurture emails 2–5.
 * Email 1 is the instant DigitalGate Business Health Score™ report.
 */

import { composeEmailBody } from "../communications/email-html";

export type FreeAuditEmailVars = {
  firstName: string;
  fullName: string;
  companyName: string;
  websiteUrl: string;
  aiScore: number;
  websiteScore: number;
  seoScore: number;
  overallScore: number;
  opportunityCount?: number;
  strategyUrl?: string;
};

/** Hours after activation for emails 2–5 (email 1 sent immediately). */
export const FREE_AUDIT_FOLLOWUP_DELAYS_HOURS: Record<2 | 3 | 4 | 5, number> = {
  2: 24,
  3: 48,
  4: 72,
  5: 96,
};

const STRATEGY_DEFAULT = "https://digitalgate.com.au/strategy-session";
const ACCENT = "#3B82F6";

export function renderFreeAuditFollowup(
  step: 2 | 3 | 4 | 5,
  vars: FreeAuditEmailVars,
): { subject: string; body: string; bodyHtml: string } {
  const first = vars.firstName || "there";
  const company = vars.companyName || "your business";
  const ai = vars.aiScore;
  const web = vars.websiteScore;
  const overall = vars.overallScore;
  const opps = vars.opportunityCount ?? 3;
  const strategy = vars.strategyUrl || STRATEGY_DEFAULT;

  if (step === 2) {
    const body = `Hi ${first},

Let's break down AI Visibility for ${company}.

Your AI Visibility score is ${ai}/100 ${
      ai < 50
        ? "— which means search and AI answer engines may not clearly understand or recommend your business yet."
        : "— a solid foundation, with room to strengthen how AI systems interpret your business."
    }

We analyse structured data, entity clarity, machine-readable business information and other signals that influence how clearly your business can be understood by Google and AI search.

Want DigitalGate to show you how we'd raise this score?
${strategy}

— Ben Roe | DigitalGate`;

    return {
      subject: "Your AI Visibility Score™ — what it means",
      body,
      bodyHtml: composeEmailBody(
        [
          { type: "paragraph", text: `Hi ${first},` },
          {
            type: "heading",
            text: "Your AI Visibility Score™ — what it means",
            level: 2,
          },
          {
            type: "paragraph",
            text: `Let's break down AI Visibility for ${company}.`,
          },
          {
            type: "score",
            title: "AI Visibility",
            score: ai,
          },
          {
            type: "paragraph",
            text:
              ai < 50
                ? "Search and AI answer engines may not clearly understand or recommend your business yet."
                : "A solid foundation, with room to strengthen how AI systems interpret your business.",
          },
          {
            type: "paragraph",
            text: "We analyse structured data, entity clarity, machine-readable business information and other signals that influence how clearly your business can be understood by Google and AI search.",
            muted: true,
          },
          {
            type: "button",
            label: "Book a free strategy session",
            href: strategy,
          },
          { type: "signoff", lines: ["— Ben Roe | DigitalGate"] },
        ],
        { accentColor: ACCENT },
      ),
    };
  }

  if (step === 3) {
    const body = `Hi ${first},

Your Website Health score for ${company} is ${web}/100 ${
      web < 50
        ? "— below where we'd want it for trust and lead capture."
        : "— a workable foundation we can still sharpen."
    }

Your DigitalGate Business Health Score™ overall sits at ${overall}/100.

We look at HTTPS, mobile readiness, homepage structure, calls to action, contact pathways and whether the site is designed to turn visitors into enquiries.

See how we'd improve this on a strategy call:
${strategy}

— Ben Roe | DigitalGate`;

    return {
      subject: "Website Health & Conversion Readiness",
      body,
      bodyHtml: composeEmailBody(
        [
          { type: "paragraph", text: `Hi ${first},` },
          {
            type: "heading",
            text: "Website Health & Conversion Readiness",
            level: 2,
          },
          {
            type: "score",
            title: "Website Health",
            score: web,
            pillars: [{ label: "Overall Business Health", score: overall }],
          },
          {
            type: "paragraph",
            text:
              web < 50
                ? "Below where we'd want it for trust and lead capture."
                : "A workable foundation we can still sharpen.",
          },
          {
            type: "paragraph",
            text: "We look at HTTPS, mobile readiness, homepage structure, calls to action, contact pathways and whether the site is designed to turn visitors into enquiries.",
            muted: true,
          },
          {
            type: "button",
            label: "See how we'd improve this",
            href: strategy,
          },
          { type: "signoff", lines: ["— Ben Roe | DigitalGate"] },
        ],
        { accentColor: ACCENT },
      ),
    };
  }

  if (step === 4) {
    const body = `Hi ${first},

Based on your DigitalGate Business Audit™ for ${company}, the highest-leverage moves usually sit in three places:

1. Technical & conversion foundations — HTTPS, mobile readiness, clear CTAs and enquiry paths
2. Search & local presence — titles, descriptions, structured data and Google Business Profile signals
3. AI Visibility — entity clarity and machine-readable business information for Google and AI search

Your business has ${opps} significant opportunities. Would you like DigitalGate to show you how we'd address them?

Book your free strategy session:
${strategy}

— Ben Roe | DigitalGate`;

    return {
      subject: `You have ${opps} opportunities — here's what we'd fix first`,
      body,
      bodyHtml: composeEmailBody(
        [
          { type: "paragraph", text: `Hi ${first},` },
          {
            type: "heading",
            text: `You have ${opps} opportunities`,
            level: 2,
          },
          {
            type: "paragraph",
            text: `Based on your DigitalGate Business Audit™ for ${company}, the highest-leverage moves usually sit in three places:`,
          },
          {
            type: "list",
            ordered: true,
            items: [
              "Technical & conversion foundations — HTTPS, mobile readiness, clear CTAs and enquiry paths",
              "Search & local presence — titles, descriptions, structured data and Google Business Profile signals",
              "AI Visibility — entity clarity and machine-readable business information for Google and AI search",
            ],
          },
          {
            type: "button",
            label: "Book your free strategy session",
            href: strategy,
          },
          { type: "signoff", lines: ["— Ben Roe | DigitalGate"] },
        ],
        { accentColor: ACCENT },
      ),
    };
  }

  const body = `Hi ${first},

This is the final email in your DigitalGate Business Audit™ series for ${company}.

You've received:
- Your DigitalGate Business Health Score™ and pillar breakdown
- An AI Visibility Score™ explanation
- Website Health & conversion notes
- Prioritised opportunities to improve visibility, trust and lead generation

The free audit is the diagnosis. DigitalGate is the system that helps you act on it.

If you'd like a clear plan tailored to your business, book a free strategy session:
${strategy}

— Ben Roe | DigitalGate
https://digitalgate.com.au`;

  return {
    subject: "Final step: turn your audit into a DigitalGate plan",
    body,
    bodyHtml: composeEmailBody(
      [
        { type: "paragraph", text: `Hi ${first},` },
        {
          type: "heading",
          text: "Turn your audit into a DigitalGate plan",
          level: 2,
        },
        {
          type: "paragraph",
          text: `This is the final email in your DigitalGate Business Audit™ series for ${company}.`,
        },
        {
          type: "list",
          items: [
            "Your DigitalGate Business Health Score™ and pillar breakdown",
            "An AI Visibility Score™ explanation",
            "Website Health & conversion notes",
            "Prioritised opportunities to improve visibility, trust and lead generation",
          ],
        },
        {
          type: "highlight",
          text: "The free audit is the diagnosis. DigitalGate is the system that helps you act on it.",
        },
        {
          type: "button",
          label: "Book a free strategy session",
          href: strategy,
        },
        {
          type: "signoff",
          lines: ["— Ben Roe | DigitalGate", "https://digitalgate.com.au"],
        },
      ],
      { accentColor: ACCENT },
    ),
  };
}

export type FreeAuditSequenceMeta = {
  activatedAt: string;
  email_1_sent: boolean;
  email_1_sent_at?: string;
  email_2_sent: boolean;
  email_2_sent_at?: string | null;
  email_3_sent: boolean;
  email_3_sent_at?: string | null;
  email_4_sent: boolean;
  email_4_sent_at?: string | null;
  email_5_sent: boolean;
  email_5_sent_at?: string | null;
  firstName: string;
  fullName: string;
  companyName: string;
  websiteUrl: string;
  email: string;
  aiScore: number;
  websiteScore: number;
  seoScore: number;
  overallScore: number;
  opportunityCount?: number;
};

export function buildFreeAuditSequenceStamp(input: {
  firstName: string;
  fullName: string;
  companyName: string;
  websiteUrl: string;
  email: string;
  aiScore: number;
  websiteScore: number;
  seoScore: number;
  overallScore: number;
  opportunityCount?: number;
  email1Sent: boolean;
}): FreeAuditSequenceMeta {
  const now = new Date().toISOString();
  return {
    activatedAt: now,
    email_1_sent: input.email1Sent,
    email_1_sent_at: input.email1Sent ? now : undefined,
    email_2_sent: false,
    email_3_sent: false,
    email_4_sent: false,
    email_5_sent: false,
    firstName: input.firstName,
    fullName: input.fullName,
    companyName: input.companyName,
    websiteUrl: input.websiteUrl,
    email: input.email,
    aiScore: input.aiScore,
    websiteScore: input.websiteScore,
    seoScore: input.seoScore,
    overallScore: input.overallScore,
    opportunityCount: input.opportunityCount,
  };
}

export function dueFreeAuditFollowupSteps(
  sequence: FreeAuditSequenceMeta,
  now = new Date(),
): Array<2 | 3 | 4 | 5> {
  const activated = new Date(sequence.activatedAt).getTime();
  if (!Number.isFinite(activated)) return [];
  const due: Array<2 | 3 | 4 | 5> = [];
  for (const step of [2, 3, 4, 5] as const) {
    if (sequence[`email_${step}_sent` as const]) continue;
    const delayMs = FREE_AUDIT_FOLLOWUP_DELAYS_HOURS[step] * 60 * 60 * 1000;
    if (now.getTime() >= activated + delayMs) due.push(step);
  }
  return due;
}
