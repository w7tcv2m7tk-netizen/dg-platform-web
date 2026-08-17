/**
 * Sample-rendered Circle + guest-stay emails for the public review surface.
 * Uses the same wrap as live sends (CVH logo header, icon footer).
 */

import { resolveEmailBrandAssets, wrapTransactionalEmail } from "../communications/email-brand";
import {
  formatGuestStayDate,
  GUEST_JOURNEY_MARKETING,
  guestJourneyStayUrl,
  renderGuestJourneyConfirmation,
  renderGuestJourneyFollowup,
  type GuestJourneyEmailVars,
  type GuestJourneyStep,
} from "./guest-journey-emails";
import {
  HIDEAWAY_CIRCLE_FOLLOWUP_DELAYS_DAYS,
  renderHideawayCircleFollowup,
  renderHideawayCircleWelcome,
  type HideawayCircleFollowupStep,
} from "./hideaway-circle-emails";

export type SequenceEmailPreviewKind = "transactional" | "marketing";

export type SequenceEmailPreviewGroup = "hideaway_circle" | "guest_journey";

export type SequenceEmailPreviewItem = {
  id: string;
  group: SequenceEmailPreviewGroup;
  groupLabel: string;
  stepLabel: string;
  when: string;
  kind: SequenceEmailPreviewKind;
  subject: string;
  html: string;
  live: boolean;
};

const SAMPLE_FIRST = "Alex";
const SAMPLE_STAY_TOKEN = "preview";
const SAMPLE_STAY_URL = guestJourneyStayUrl(SAMPLE_STAY_TOKEN);
const SAMPLE_CHECKIN = "2026-09-18";
const SAMPLE_CHECKOUT = "2026-09-21";

const GUEST_JOURNEY_PREVIEW_ORDER: Array<{
  step: GuestJourneyStep | "confirmation";
  stepLabel: string;
  when: string;
}> = [
  { step: "confirmation", stepLabel: "Stay confirmed", when: "Immediately after paid / confirmed" },
  { step: "prepare", stepLabel: "Prepare for your stay", when: "7 days before check-in (skip if fewer than 4 days out)" },
  { step: "arrival_guide", stepLabel: "Arrival guide", when: "2–3 days before check-in" },
  { step: "checkin_day", stepLabel: "Check-in day", when: "Morning of arrival" },
  { step: "settled_in", stepLabel: "Settled in?", when: "Evening of arrival" },
  { step: "experience", stepLabel: "Make the most of your stay", when: "During stay (2+ nights)" },
  { step: "checkout_eve", stepLabel: "Checkout tomorrow", when: "Day before checkout" },
  { step: "thank_you", stepLabel: "Thank you", when: "Checkout day" },
  { step: "review_request", stepLabel: "Review request", when: "1–2 days after checkout" },
  { step: "return_offer", stepLabel: "Come back — 10% direct", when: "About 10 days after checkout" },
  { step: "referral", stepLabel: "Share the valley", when: "About 21 days after checkout" },
  { step: "inspiration", stepLabel: "Seasonal inspiration", when: "About 5 weeks after checkout" },
  { step: "repeat_nudge", stepLabel: "Ready for another escape?", when: "90 days after checkout if no future stay" },
];

const CIRCLE_PREVIEW_ORDER: Array<{
  step: HideawayCircleFollowupStep | "welcome";
  stepLabel: string;
  when: string;
  live: boolean;
}> = [
  { step: "welcome", stepLabel: "Welcome", when: "Immediately on complete join", live: true },
  {
    step: 2,
    stepLabel: "How to use your 10%",
    when: `Day ${HIDEAWAY_CIRCLE_FOLLOWUP_DELAYS_DAYS[2]} after welcome`,
    live: true,
  },
  {
    step: 3,
    stepLabel: "Why members book direct",
    when: `Day ${HIDEAWAY_CIRCLE_FOLLOWUP_DELAYS_DAYS[3]} after welcome`,
    live: true,
  },
  {
    step: 4,
    stepLabel: "First access",
    when: `Day ${HIDEAWAY_CIRCLE_FOLLOWUP_DELAYS_DAYS[4]} after welcome`,
    live: true,
  },
  {
    step: 5,
    stepLabel: "Ready when you are",
    when: `Day ${HIDEAWAY_CIRCLE_FOLLOWUP_DELAYS_DAYS[5]} after welcome`,
    live: true,
  },
  { step: "birthday", stepLabel: "Birthday month", when: "Birthday month (extra, not in the 1–5 cadence)", live: true },
  {
    step: "soft_return",
    stepLabel: "Soft return (legacy)",
    when: "Day 45 — only for members joined before the 5-email sequence",
    live: true,
  },
  {
    step: "been_a_while",
    stepLabel: "Been a while (legacy)",
    when: "Day 120 — only for members joined before the 5-email sequence",
    live: true,
  },
];

function wrapCvh(bodyHtml: string, footerNote: string): string {
  const brand = resolveEmailBrandAssets({
    organisationName: "Currumbin Valley Hideaway",
    organisationSlug: "currumbin-valley-hideaway",
    industry: "hospitality",
  });
  return wrapTransactionalEmail({
    businessName: brand.businessName,
    logoUrl: brand.logoUrl,
    iconUrl: brand.iconUrl,
    primaryColor: brand.primaryColor,
    accentColor: brand.accentColor,
    bodyHtml,
    footerNote,
  });
}

function sampleGuestVars(): GuestJourneyEmailVars {
  return {
    firstName: SAMPLE_FIRST,
    unitTitle: "Sanctuary Dome",
    checkinLabel: formatGuestStayDate(SAMPLE_CHECKIN),
    checkoutLabel: formatGuestStayDate(SAMPLE_CHECKOUT),
    guests: 2,
    ref: "CVH-4821",
    address: "Currumbin Valley, Gold Coast, Queensland",
    checkinTime: "3:00 pm",
    checkoutTime: "10:00 am",
    stayUrl: SAMPLE_STAY_URL,
    helpUrl: `${SAMPLE_STAY_URL}&mood=help`,
    okUrl: `${SAMPLE_STAY_URL}&mood=ok`,
    feedbackUrl: `${SAMPLE_STAY_URL}#feedback`,
    nights: 3,
  };
}

/** All Circle + guest-journey emails, sample-rendered with CVH brand wrap. */
export function buildCvhSequenceEmailPreviews(): SequenceEmailPreviewItem[] {
  const guestVars = sampleGuestVars();
  const circleVars = {
    firstName: SAMPLE_FIRST,
    email: "alex@example.com",
    bookUrl: "https://currumbinvalleyhideaway.com.au/stay",
  };

  const circle = CIRCLE_PREVIEW_ORDER.map((row): SequenceEmailPreviewItem => {
    const rendered =
      row.step === "welcome"
        ? renderHideawayCircleWelcome(circleVars)
        : renderHideawayCircleFollowup(row.step, circleVars);
    return {
      id: `circle-${row.step}`,
      group: "hideaway_circle",
      groupLabel: "Hideaway Circle",
      stepLabel: row.stepLabel,
      when: row.when,
      kind: "marketing",
      subject: rendered.subject,
      html: wrapCvh(
        rendered.bodyHtml,
        "You're receiving this because you joined The Hideaway Circle.",
      ),
      live: row.live,
    };
  });

  const journey = GUEST_JOURNEY_PREVIEW_ORDER.map((row): SequenceEmailPreviewItem => {
    const rendered =
      row.step === "confirmation"
        ? renderGuestJourneyConfirmation(guestVars)
        : renderGuestJourneyFollowup(row.step, guestVars);
    const marketing =
      row.step !== "confirmation" &&
      GUEST_JOURNEY_MARKETING.includes(row.step);
    return {
      id: `stay-${row.step}`,
      group: "guest_journey",
      groupLabel: "Guest stay journey",
      stepLabel: row.stepLabel,
      when: row.when,
      kind: marketing ? "marketing" : "transactional",
      subject: rendered.subject,
      html: wrapCvh(
        rendered.bodyHtml,
        marketing
          ? "You're receiving this as a past Currumbin Valley Hideaway guest."
          : "You're receiving this because of your Currumbin Valley Hideaway booking.",
      ),
      live: false,
    };
  });

  return [...circle, ...journey];
}
