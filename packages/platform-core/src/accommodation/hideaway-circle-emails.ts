/**
 * The Hideaway Circle — welcome + light nurture emails (CVH).
 * Welcome is sent immediately; soft_return / been_a_while / birthday via cron.
 */

import { composeEmailBody } from "../communications/email-html";

export const HIDEAWAY_CIRCLE_REWARD_PERCENT = 10;

export const HIDEAWAY_CIRCLE_INTERESTS = [
  { id: "romantic", label: "Romantic escape" },
  { id: "weekend", label: "Weekend getaway" },
  { id: "nature", label: "Nature & rainforest" },
  { id: "wellness", label: "Wellness & relaxation" },
  { id: "celebration", label: "Celebration" },
  { id: "events", label: "Events" },
] as const;

export const HIDEAWAY_CIRCLE_TOPICS = [
  { id: "offers", label: "Special offers" },
  { id: "new_accommodation", label: "New accommodation" },
  { id: "events", label: "Events & experiences" },
  { id: "seasonal", label: "Seasonal escapes" },
] as const;

export type HideawayCircleInterestId =
  (typeof HIDEAWAY_CIRCLE_INTERESTS)[number]["id"];
export type HideawayCircleTopicId = (typeof HIDEAWAY_CIRCLE_TOPICS)[number]["id"];

export type HideawayCircleMeta = {
  joinedAt: string;
  rewardPercent: number;
  permanent: true;
  birthdayMonth?: number;
  anniversaryDate?: string;
  interests: string[];
  topics: string[];
  joinSource: string;
};

export function parseHideawayCircleMeta(
  metadata: unknown,
): HideawayCircleMeta | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = (metadata as Record<string, unknown>).hideawayCircle;
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.joinedAt !== "string") return null;
  return {
    joinedAt: c.joinedAt,
    rewardPercent:
      typeof c.rewardPercent === "number" && c.rewardPercent > 0
        ? c.rewardPercent
        : HIDEAWAY_CIRCLE_REWARD_PERCENT,
    permanent: true,
    birthdayMonth:
      typeof c.birthdayMonth === "number" ? c.birthdayMonth : undefined,
    anniversaryDate:
      typeof c.anniversaryDate === "string" ? c.anniversaryDate : undefined,
    interests: Array.isArray(c.interests)
      ? c.interests.filter((x): x is string => typeof x === "string")
      : [],
    topics: Array.isArray(c.topics)
      ? c.topics.filter((x): x is string => typeof x === "string")
      : [],
    joinSource: typeof c.joinSource === "string" ? c.joinSource : "website",
  };
}

export type HideawayCircleEmailVars = {
  firstName: string;
  email: string;
  bookUrl?: string;
  stayUrl?: string;
};

const BOOK_DEFAULT = "https://currumbinvalleyhideaway.com.au/stay";
const SIGN_DEFAULT = "Currumbin Valley Hideaway";
const ACCENT = "#B9A48A";

/** Days after join for nurture steps (welcome is immediate). */
export const HIDEAWAY_CIRCLE_FOLLOWUP_DELAYS_DAYS = {
  soft_return: 45,
  been_a_while: 120,
} as const;

export function renderHideawayCircleWelcome(
  vars: HideawayCircleEmailVars,
): { subject: string; body: string; bodyHtml: string } {
  const first = vars.firstName || "there";
  const book = vars.bookUrl || BOOK_DEFAULT;
  const body = `Hi ${first},

Welcome to The Hideaway Circle.

You're in — and your return-stay reward is ready:

10% OFF YOUR NEXT STAY DIRECT
Book again with us (not through Airbnb or Booking.com) and receive 10% off your next stay at Currumbin Valley Hideaway.

This reward stays with you — no expiry. When you're ready to escape to the Valley again, book direct:

${book}

Private offers · First access · Return-stay rewards

See you in the Valley,
${SIGN_DEFAULT}
https://currumbinvalleyhideaway.com.au`;

  return {
    subject: "Welcome to The Hideaway Circle — 10% off your next direct stay",
    body,
    bodyHtml: composeEmailBody(
      [
        { type: "paragraph", text: `Hi ${first},` },
        { type: "kicker", text: "The Hideaway Circle" },
        { type: "heading", text: "Welcome — you're in" },
        {
          type: "highlight",
          text: "10% off your next stay when you book direct (not through Airbnb or Booking.com).",
        },
        {
          type: "paragraph",
          text: "This reward stays with you — no expiry. When you're ready to escape to the Valley again, book direct.",
        },
        { type: "button", label: "Book your return stay", href: book },
        {
          type: "paragraph",
          text: "Private offers · First access · Return-stay rewards",
          muted: true,
        },
        {
          type: "signoff",
          lines: [
            "See you in the Valley,",
            SIGN_DEFAULT,
            "https://currumbinvalleyhideaway.com.au",
          ],
        },
      ],
      { accentColor: ACCENT },
    ),
  };
}

export function renderHideawayCircleFollowup(
  step: "soft_return" | "been_a_while" | "birthday",
  vars: HideawayCircleEmailVars,
): { subject: string; body: string; bodyHtml: string } {
  const first = vars.firstName || "there";
  const book = vars.bookUrl || BOOK_DEFAULT;

  if (step === "soft_return") {
    const body = `Hi ${first},

It's been a little while since you joined The Hideaway Circle — and your 10% return-stay reward is still waiting.

When the rainforest calls, book direct with us and enjoy 10% off your next stay:

${book}

We'd love to welcome you back.

${SIGN_DEFAULT}`;
    return {
      subject: "Ready for another escape to the Valley?",
      body,
      bodyHtml: composeEmailBody(
        [
          { type: "paragraph", text: `Hi ${first},` },
          {
            type: "heading",
            text: "Ready for another escape to the Valley?",
            level: 2,
          },
          {
            type: "paragraph",
            text: "It's been a little while since you joined The Hideaway Circle — and your 10% return-stay reward is still waiting.",
          },
          {
            type: "button",
            label: "Claim 10% off — book direct",
            href: book,
          },
          {
            type: "signoff",
            lines: ["We'd love to welcome you back.", SIGN_DEFAULT],
          },
        ],
        { accentColor: ACCENT },
      ),
    };
  }

  if (step === "been_a_while") {
    const body = `Hi ${first},

It's been a while since you escaped to the Valley.

Whenever you're ready, your Hideaway Circle reward still applies — 10% off your next direct booking at Currumbin Valley Hideaway.

Book your return stay:
${book}

See you soon,
${SIGN_DEFAULT}`;
    return {
      subject: "It's been a while since you escaped to the Valley…",
      body,
      bodyHtml: composeEmailBody(
        [
          { type: "paragraph", text: `Hi ${first},` },
          {
            type: "heading",
            text: "It's been a while…",
            level: 2,
          },
          {
            type: "paragraph",
            text: "Whenever you're ready, your Hideaway Circle reward still applies — 10% off your next direct booking at Currumbin Valley Hideaway.",
          },
          { type: "button", label: "Book your return stay", href: book },
          { type: "signoff", lines: ["See you soon,", SIGN_DEFAULT] },
        ],
        { accentColor: ACCENT },
      ),
    };
  }

  const body = `Hi ${first},

Happy birthday month from Currumbin Valley Hideaway.

If a rainforest reset sounds right, remember you're in The Hideaway Circle — 10% off your next direct stay is yours to claim:

${book}

Celebrate somewhere quiet.
${SIGN_DEFAULT}`;

  return {
    subject: "A birthday note from the Valley",
    body,
    bodyHtml: composeEmailBody(
      [
        { type: "paragraph", text: `Hi ${first},` },
        { type: "heading", text: "Happy birthday month", level: 2 },
        {
          type: "paragraph",
          text: "If a rainforest reset sounds right, remember you're in The Hideaway Circle — 10% off your next direct stay is yours to claim.",
        },
        { type: "button", label: "Celebrate in the Valley", href: book },
        {
          type: "signoff",
          lines: ["Celebrate somewhere quiet.", SIGN_DEFAULT],
        },
      ],
      { accentColor: ACCENT },
    ),
  };
}

export type HideawayCircleSequenceMeta = {
  activatedAt: string;
  welcome_sent: boolean;
  welcome_sent_at?: string;
  soft_return_sent: boolean;
  soft_return_sent_at?: string | null;
  been_a_while_sent: boolean;
  been_a_while_sent_at?: string | null;
  birthday_sent: boolean;
  birthday_sent_at?: string | null;
  birthdayMonth?: number | null;
  firstName: string;
  email: string;
  bookUrl?: string;
  marketingConsent: boolean;
};

export function buildHideawayCircleSequenceStamp(input: {
  firstName: string;
  email: string;
  birthdayMonth?: number | null;
  bookUrl?: string;
  welcomeSent: boolean;
  marketingConsent: boolean;
}): HideawayCircleSequenceMeta {
  const now = new Date().toISOString();
  return {
    activatedAt: now,
    welcome_sent: input.welcomeSent,
    welcome_sent_at: input.welcomeSent ? now : undefined,
    soft_return_sent: false,
    been_a_while_sent: false,
    birthday_sent: false,
    birthdayMonth: input.birthdayMonth ?? null,
    firstName: input.firstName,
    email: input.email,
    bookUrl: input.bookUrl,
    marketingConsent: input.marketingConsent,
  };
}

export function dueHideawayCircleFollowupSteps(
  sequence: HideawayCircleSequenceMeta,
  now = new Date(),
): Array<"soft_return" | "been_a_while" | "birthday"> {
  if (!sequence.marketingConsent) return [];
  const activated = new Date(sequence.activatedAt).getTime();
  if (!Number.isFinite(activated)) return [];
  const due: Array<"soft_return" | "been_a_while" | "birthday"> = [];

  if (!sequence.soft_return_sent) {
    const delay =
      HIDEAWAY_CIRCLE_FOLLOWUP_DELAYS_DAYS.soft_return * 24 * 60 * 60 * 1000;
    if (now.getTime() >= activated + delay) due.push("soft_return");
  }
  if (!sequence.been_a_while_sent) {
    const delay =
      HIDEAWAY_CIRCLE_FOLLOWUP_DELAYS_DAYS.been_a_while * 24 * 60 * 60 * 1000;
    if (now.getTime() >= activated + delay) due.push("been_a_while");
  }
  if (
    !sequence.birthday_sent &&
    sequence.birthdayMonth != null &&
    sequence.birthdayMonth >= 1 &&
    sequence.birthdayMonth <= 12 &&
    now.getMonth() + 1 === sequence.birthdayMonth
  ) {
    const minMs = 30 * 24 * 60 * 60 * 1000;
    if (now.getTime() >= activated + minMs) due.push("birthday");
  }

  return due;
}
