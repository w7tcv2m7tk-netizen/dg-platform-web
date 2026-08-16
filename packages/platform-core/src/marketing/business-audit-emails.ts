/**
 * Free Business Audit nurture emails 2–5 (ported from WP marketing audit follow-ups).
 * Email 1 is the instant presence audit report.
 */

export type FreeAuditEmailVars = {
  firstName: string;
  fullName: string;
  companyName: string;
  websiteUrl: string;
  aiScore: number;
  websiteScore: number;
  seoScore: number;
  overallScore: number;
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

export function renderFreeAuditFollowup(
  step: 2 | 3 | 4 | 5,
  vars: FreeAuditEmailVars,
): { subject: string; body: string } {
  const first = vars.firstName || "there";
  const company = vars.companyName || "your business";
  const ai = vars.aiScore;
  const web = vars.websiteScore;
  const strategy = vars.strategyUrl || STRATEGY_DEFAULT;

  if (step === 2) {
    return {
      subject: "Your AI Visibility Breakdown & What It Means",
      body: `Hi ${first},

Let's break down your AI Visibility score for ${company}.

Your AI Visibility score is ${ai}% ${
        ai < 50
          ? "— this means AI systems like ChatGPT and Google AI Mode are not currently recommending your business strongly."
          : "— this is a solid foundation, but there's room to grow."
      }

Here's how AI visibility works:
- AI systems scan the web for consistent, trusted information
- They look for authority signals, reviews, and local citations
- The more consistent your presence, the higher your AI visibility

Want to talk through your results? Book a free strategy session:
${strategy}

— Ben Roe | DigitalGate`,
    };
  }

  if (step === 3) {
    return {
      subject: "Your Website Performance & Lead Generation Potential",
      body: `Hi ${first},

Let's talk about website performance for ${company}.

Your website scored ${web}% on our live presence probe ${
        web < 50
          ? "— which is below average. Potential customers may leave before enquiring."
          : "— which is above average, giving you a good foundation."
      }

Key signals we look for:
- HTTPS, mobile viewport, clear title and H1
- Meta description and structured data (JSON-LD)
- Open Graph tags for share and entity hints

See how we can improve this on a strategy call:
${strategy}

— Ben Roe | DigitalGate`,
    };
  }

  if (step === 4) {
    return {
      subject: "Action Plan: 3 Steps to Improve Your Visibility",
      body: `Hi ${first},

Based on your audit for ${company}, here are the 3 most impactful actions you can take right now:

1. Build local authority content — Create location-specific pages with clear answers to buyer questions
2. Improve your Google Business Profile — Add photos, posts, and respond to all reviews
3. Optimize for AI search — Structure content to answer common customer questions

Book your free strategy session:
${strategy}

— Ben Roe | DigitalGate`,
    };
  }

  return {
    subject: "Final Step: Let's Build Your Growth Plan",
    body: `Hi ${first},

This is the final email in your Business Audit series for ${company}.

You've received:
- Your presence audit scores and findings
- An AI visibility breakdown
- Website performance notes
- 3 key actions to improve visibility

If you'd like a clear growth plan tailored to your business, book a free strategy session:
${strategy}

— Ben Roe | DigitalGate
https://digitalgate.com.au`,
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
