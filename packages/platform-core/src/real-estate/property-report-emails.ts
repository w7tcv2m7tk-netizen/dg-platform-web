/**
 * Property report nurture emails (WP followup_2…5 ported to Gen 2).
 * Email 1 is the Cotality report itself (sendPropertyReportEmail).
 */

export type PropertyReportEmailVars = {
  firstName: string;
  fullName: string;
  propertyAddress: string;
  email?: string;
};

const FOLLOWUP_TEMPLATES: Record<
  2 | 3 | 4 | 5,
  { subject: string; body: string }
> = {
  2: {
    subject: "What most homeowners miss in their property report",
    body: `Hi {first_name},

I hope you've had a chance to review your Property Value & Buyer Demand Report for {property_address}.

Most homeowners focus only on the IntelliVal price range — the real next step is understanding buyer demand, recent comparable sales, and how a full CMA would position your property for sale.

If you'd like, I can walk you through exactly what your report means and prepare a full Comparative Market Analysis in a free appraisal conversation.

Best regards,
Ben Roe | Roe Realty`,
  },
  3: {
    subject: "Your property position may have already changed",
    body: `Hi {first_name},

The market around {property_address} doesn't stand still for long.

New listings, recent sales, and shifting buyer activity can change your property's position within days — not months.

I can quickly update you on what buyers are paying nearby and what that means for your timing.

Best regards,
Ben Roe | Roe Realty`,
  },
  4: {
    subject: "Timing matters more than most people realise",
    body: `Hi {first_name},

One of the biggest factors in selling outcomes isn't just price — it's timing.

Properties often achieve stronger results when they align with peak buyer demand and low local competition.

If you're considering selling in the next 6–12 months, it's worth understanding your timing position now.

Best regards,
Ben Roe | Roe Realty`,
  },
  5: {
    subject: "Should I keep your file open?",
    body: `Hi {first_name},

Just checking in on your Property Value & Buyer Demand Report for {property_address}.

Would you like me to keep monitoring your property's market position, or close the file for now?

Either way is fine — just let me know.

Best regards,
Ben Roe | Roe Realty`,
  },
};

/** Delays in days after activation for follow-up emails 2–5 (matches WP cron). */
export const PROPERTY_REPORT_FOLLOWUP_DELAYS_DAYS: Record<2 | 3 | 4 | 5, number> =
  {
    2: 1,
    3: 3,
    4: 5,
    5: 9,
  };

export function renderPropertyReportFollowup(
  step: 2 | 3 | 4 | 5,
  vars: PropertyReportEmailVars,
): { subject: string; body: string } {
  const tpl = FOLLOWUP_TEMPLATES[step];
  const map: Record<string, string> = {
    "{first_name}": vars.firstName || "there",
    "{full_name}": vars.fullName || vars.firstName || "there",
    "{property_address}": vars.propertyAddress || "your property",
    "{email}": vars.email || "",
  };
  let subject = tpl.subject;
  let body = tpl.body;
  for (const [k, v] of Object.entries(map)) {
    subject = subject.split(k).join(v);
    body = body.split(k).join(v);
  }
  return { subject, body };
}

export function adminPropertyReportNotifyBody(input: {
  fullName: string;
  propertyAddress: string;
  email: string;
  phone: string;
  submittedAt: string;
}): { subject: string; body: string } {
  return {
    subject: `Property Report Request - ${input.fullName}`,
    body: [
      "New property report request",
      "",
      `Name: ${input.fullName}`,
      `Property: ${input.propertyAddress}`,
      `Email: ${input.email || "Not provided"}`,
      `Phone: ${input.phone || "Not provided"}`,
      `Submitted: ${input.submittedAt}`,
    ].join("\n"),
  };
}

export type PropertyReportSequenceMeta = {
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
  propertyAddress: string;
  email: string;
};

export function buildPropertyReportSequenceStamp(input: {
  firstName: string;
  fullName: string;
  propertyAddress: string;
  email: string;
  email1Sent: boolean;
}): PropertyReportSequenceMeta {
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
    propertyAddress: input.propertyAddress,
    email: input.email,
  };
}

export function duePropertyReportFollowupSteps(
  sequence: PropertyReportSequenceMeta,
  now = new Date(),
): Array<2 | 3 | 4 | 5> {
  const activated = new Date(sequence.activatedAt).getTime();
  if (!Number.isFinite(activated)) return [];
  const due: Array<2 | 3 | 4 | 5> = [];
  for (const step of [2, 3, 4, 5] as const) {
    const flag = sequence[`email_${step}_sent` as const];
    if (flag) continue;
    const delayMs =
      PROPERTY_REPORT_FOLLOWUP_DELAYS_DAYS[step] * 24 * 60 * 60 * 1000;
    if (now.getTime() >= activated + delayMs) due.push(step);
  }
  return due;
}
