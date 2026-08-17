/**
 * CVH guest lifecycle emails — transactional stay ops vs post-stay relationship.
 * Confirmation is sent on activate; remaining steps via cron against stay dates.
 */

import { composeEmailBody } from "../communications/email-html";

export const CVH_GUEST_JOURNEY_ACCENT = "#B9A48A";
export const CVH_HOME = "https://currumbinvalleyhideaway.com.au";
export const CVH_STAY_HUB = `${CVH_HOME}/stay`;
export const CVH_CIRCLE_URL = "https://circle.currumbinvalleyhideaway.com.au";
export const CVH_HOST_EMAIL = "stay@currumbinvalleyhideaway.com.au";
export const CVH_MAP_URL =
  "https://maps.google.com/?q=Currumbin+Valley+Hideaway";
export const CVH_GOOGLE_REVIEW_URL =
  "https://www.google.com/search?q=Currumbin+Valley+Hideaway+reviews";
export const CVH_DEFAULT_ADDRESS = "Currumbin Valley, Gold Coast, Queensland";
export const CVH_SIGN = "Currumbin Valley Hideaway";

export type GuestJourneyStep =
  | "prepare"
  | "arrival_guide"
  | "checkin_day"
  | "settled_in"
  | "experience"
  | "checkout_eve"
  | "thank_you"
  | "review_request"
  | "return_offer"
  | "inspiration"
  | "repeat_nudge"
  | "referral";

export const GUEST_JOURNEY_TRANSACTIONAL: GuestJourneyStep[] = [
  "prepare",
  "arrival_guide",
  "checkin_day",
  "settled_in",
  "experience",
  "checkout_eve",
  "thank_you",
  "review_request",
];

export const GUEST_JOURNEY_MARKETING: GuestJourneyStep[] = [
  "return_offer",
  "inspiration",
  "repeat_nudge",
  "referral",
];

/** OTA channels already send confirmation / access instructions. */
export const GUEST_JOURNEY_OTA_SKIP: GuestJourneyStep[] = [
  "prepare",
  "arrival_guide",
  "checkin_day",
  "experience",
  "checkout_eve",
];

export type GuestLifecycleStatus =
  | "prospect"
  | "booked"
  | "confirmed"
  | "upcoming"
  | "checked_in"
  | "checked_out"
  | "past_guest"
  | "repeat_guest"
  | "advocate";

export type GuestJourneySequenceMeta = {
  version: 1;
  activatedAt: string;
  token: string;
  channel: "direct" | "ota";
  marketingConsent: boolean;
  firstName: string;
  email: string;
  unitTitle: string;
  checkin: string;
  checkout: string;
  guests?: number;
  ref?: string;
  stayUrl: string;
  bookUrl?: string;
  confirmation_sent: boolean;
  confirmation_sent_at?: string | null;
  prepare_sent?: boolean;
  prepare_sent_at?: string | null;
  arrival_guide_sent?: boolean;
  arrival_guide_sent_at?: string | null;
  checkin_day_sent?: boolean;
  checkin_day_sent_at?: string | null;
  settled_in_sent?: boolean;
  settled_in_sent_at?: string | null;
  experience_sent?: boolean;
  experience_sent_at?: string | null;
  checkout_eve_sent?: boolean;
  checkout_eve_sent_at?: string | null;
  thank_you_sent?: boolean;
  thank_you_sent_at?: string | null;
  review_request_sent?: boolean;
  review_request_sent_at?: string | null;
  return_offer_sent?: boolean;
  return_offer_sent_at?: string | null;
  inspiration_sent?: boolean;
  inspiration_sent_at?: string | null;
  repeat_nudge_sent?: boolean;
  repeat_nudge_sent_at?: string | null;
  referral_sent?: boolean;
  referral_sent_at?: string | null;
};

export type GuestJourneyEmailVars = {
  firstName: string;
  unitTitle: string;
  checkinLabel: string;
  checkoutLabel: string;
  guests?: number;
  ref?: string;
  address?: string;
  checkinTime?: string;
  checkoutTime?: string;
  stayUrl: string;
  mapUrl?: string;
  bookUrl?: string;
  circleUrl?: string;
  googleReviewUrl?: string;
  airbnbReviewUrl?: string;
  helpUrl?: string;
  okUrl?: string;
  feedbackUrl?: string;
  wifi?: string;
  nights?: number;
};

function ymdBrisbane(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Australia/Brisbane" });
}

function hourBrisbane(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00+10:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return ymdBrisbane(d);
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(`${fromYmd}T12:00:00+10:00`).getTime();
  const b = new Date(`${toYmd}T12:00:00+10:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function guestJourneyStayUrl(token: string): string {
  return `${CVH_HOME}/guest-stay?t=${encodeURIComponent(token)}`;
}

export function formatGuestStayDate(ymd?: string | null): string {
  const raw = ymd?.trim() || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  return new Date(`${raw}T12:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function isOtaStayChannel(source?: string | null): boolean {
  return /airbnb|booking\.com|bookingcom|ical|ota|expedia/i.test(source || "");
}

export function guestJourneyFlag(step: GuestJourneyStep): {
  sent: keyof GuestJourneySequenceMeta;
  sentAt: keyof GuestJourneySequenceMeta;
} {
  return {
    sent: `${step}_sent` as keyof GuestJourneySequenceMeta,
    sentAt: `${step}_sent_at` as keyof GuestJourneySequenceMeta,
  };
}

export function dueGuestJourneySteps(
  sequence: GuestJourneySequenceMeta,
  options?: { now?: Date; hasFutureStay?: boolean; nights?: number },
): GuestJourneyStep[] {
  const now = options?.now ?? new Date();
  const today = ymdBrisbane(now);
  const hour = hourBrisbane(now);
  const checkin = sequence.checkin;
  const checkout = sequence.checkout;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkin) || !/^\d{4}-\d{2}-\d{2}$/.test(checkout)) {
    return [];
  }

  const nights = options?.nights ?? daysBetween(checkin, checkout);
  const due: GuestJourneyStep[] = [];
  const skip = new Set<GuestJourneyStep>(
    sequence.channel === "ota" ? GUEST_JOURNEY_OTA_SKIP : [],
  );

  const consider = (step: GuestJourneyStep, ready: boolean) => {
    if (skip.has(step)) return;
    if (GUEST_JOURNEY_MARKETING.includes(step) && !sequence.marketingConsent) return;
    const flag = sequence[guestJourneyFlag(step).sent];
    if (flag) return;
    if (ready) due.push(step);
  };

  const daysUntilCheckin = daysBetween(today, checkin);
  consider("prepare", daysUntilCheckin <= 7 && daysUntilCheckin >= 4);
  consider("arrival_guide", daysUntilCheckin <= 3 && daysUntilCheckin >= 1);
  consider("checkin_day", today === checkin && hour >= 6);
  consider("settled_in", today === checkin && hour >= 18);
  consider(
    "experience",
    nights >= 2 && today > checkin && today < checkout,
  );
  consider("checkout_eve", today === addDays(checkout, -1));
  consider("thank_you", today === checkout && hour >= 11);
  consider("review_request", today >= addDays(checkout, 1));
  consider("return_offer", today >= addDays(checkout, 10));
  consider("inspiration", today >= addDays(checkout, 37));
  consider(
    "repeat_nudge",
    today >= addDays(checkout, 90) && !options?.hasFutureStay,
  );
  consider("referral", today >= addDays(checkout, 21));

  return due;
}

const ACCENT = CVH_GUEST_JOURNEY_ACCENT;

function pack(
  first: string,
  heading: string,
  paras: string[],
  buttons: Array<{ label: string; href: string }>,
  signoff = ["See you in the Valley,", CVH_SIGN],
  extra?: { kicker?: string; highlight?: string; kv?: Array<{ label: string; value: string }> },
) {
  return composeEmailBody(
    [
      { type: "paragraph", text: `Hi ${first},` },
      ...(extra?.kicker ? [{ type: "kicker" as const, text: extra.kicker }] : []),
      { type: "heading", text: heading, level: 2 },
      ...(extra?.highlight
        ? [{ type: "highlight" as const, text: extra.highlight }]
        : []),
      ...(extra?.kv?.length ? [{ type: "kv" as const, rows: extra.kv }] : []),
      ...paras.map((text) => ({ type: "paragraph" as const, text })),
      ...buttons.map((b) => ({ type: "button" as const, label: b.label, href: b.href })),
      { type: "signoff", lines: signoff },
    ],
    { accentColor: ACCENT },
  );
}

export function renderGuestJourneyConfirmation(vars: GuestJourneyEmailVars): {
  subject: string;
  body: string;
  bodyHtml: string;
} {
  const first = vars.firstName || "there";
  const kv = [
    { label: "Accommodation", value: vars.unitTitle },
    { label: "Check-in", value: vars.checkinLabel },
    { label: "Check-out", value: vars.checkoutLabel },
    ...(vars.guests ? [{ label: "Guests", value: String(vars.guests) }] : []),
    ...(vars.ref ? [{ label: "Reference", value: vars.ref }] : []),
    { label: "Location", value: vars.address || CVH_DEFAULT_ADDRESS },
    { label: "Check-in from", value: vars.checkinTime || "3:00 pm" },
  ];
  const paras = [
    "Your stay at Currumbin Valley Hideaway is confirmed.",
    "Check-in is from 3:00 pm (unless noted otherwise). Saturday arrivals and departures aren't available. Full house notes are on your stay page.",
    "We're looking forward to welcoming you. Over the coming days we'll send you everything you need to make your stay easy and enjoyable.",
    `Questions? Email ${CVH_HOST_EMAIL}.`,
  ];
  const body = `Hi ${first},\n\nYour Currumbin Valley Hideaway stay is confirmed.\n\n${kv.map((r) => `${r.label}: ${r.value}`).join("\n")}\n\n${paras.join("\n\n")}\n\nView your stay: ${vars.stayUrl}\n\n${CVH_SIGN}`;
  return {
    subject: "Your Currumbin Valley Hideaway stay is confirmed 🌿",
    body,
    bodyHtml: pack(first, "Your stay is confirmed", paras, [
      { label: "View My Stay", href: vars.stayUrl },
    ], ["We're looking forward to welcoming you,", CVH_SIGN], {
      kicker: "Booking confirmation",
      kv,
    }),
  };
}

export function renderGuestJourneyFollowup(
  step: GuestJourneyStep,
  vars: GuestJourneyEmailVars,
): { subject: string; body: string; bodyHtml: string } {
  const first = vars.firstName || "there";
  const stay = vars.stayUrl;
  const map = vars.mapUrl || CVH_MAP_URL;
  const book = vars.bookUrl || CVH_STAY_HUB;
  const circle = vars.circleUrl || CVH_CIRCLE_URL;
  const checkinTime = vars.checkinTime || "3:00 pm";
  const checkoutTime = vars.checkoutTime || "10:00 am";

  const copy: Record<
    GuestJourneyStep,
    {
      subject: string;
      heading: string;
      paras: string[];
      buttons: Array<{ label: string; href: string }>;
      kv?: Array<{ label: string; value: string }>;
      highlight?: string;
    }
  > = {
    prepare: {
      subject: "Your stay at Currumbin Valley Hideaway is coming up 🌿",
      heading: "Prepare for your stay",
      kv: [
        { label: "Check-in", value: `${vars.checkinLabel} from ${checkinTime}` },
        { label: "Check-out", value: `${vars.checkoutLabel} by ${checkoutTime}` },
        { label: "Accommodation", value: vars.unitTitle },
      ],
      paras: [
        "A few things that make arrival easy: park in the marked area, bring walking shoes if you'd like the rainforest tracks, and pack for a cooler valley evening even in summer.",
        vars.wifi
          ? `Wi-Fi details are on your stay page (${vars.wifi}).`
          : "Wi-Fi, what's included, and house notes are on your stay page.",
        "The valley is quiet after dark — that's the point. Nearby you'll find Currumbin Wildlife Sanctuary, the beach at Currumbin, and rainforest walks at Cougal Cascades.",
      ],
      buttons: [{ label: "Prepare for your stay", href: stay }],
    },
    arrival_guide: {
      subject: "Your Currumbin Valley Hideaway arrival guide",
      heading: "Your arrival guide",
      kv: [
        { label: "Accommodation", value: vars.unitTitle },
        { label: "Dates", value: `${vars.checkinLabel} → ${vars.checkoutLabel}` },
        { label: "Check-in from", value: checkinTime },
      ],
      paras: [
        "Getting here: follow the map pin for Currumbin Valley Hideaway. Leave a little extra time on the valley roads after rain.",
        "When you arrive: park as marked, then use the check-in instructions on your stay page for access.",
        `Need anything? Email ${CVH_HOST_EMAIL} and we'll help.`,
      ],
      buttons: [
        { label: "Open arrival guide", href: stay },
        { label: "Map & directions", href: map },
      ],
    },
    checkin_day: {
      subject: "Today you're heading to Currumbin Valley Hideaway 🌿",
      heading: "Today is the day",
      highlight: `Check-in from ${checkinTime}`,
      paras: [
        "We're looking forward to welcoming you to the valley.",
        `Your accommodation is ${vars.unitTitle}. Check-in instructions and the map are on your stay page.`,
      ],
      buttons: [
        { label: "Check-in instructions", href: stay },
        { label: "Open map", href: map },
      ],
    },
    settled_in: {
      subject: "Settled in?",
      heading: "We hope you've arrived safely",
      paras: [
        "We hope you're settling into the valley. If there's anything you need during your stay, just let us know.",
        "A quick tap helps us look after you — and means we hear you before a review ever would.",
      ],
      buttons: [
        { label: "Yes, we're loving it", href: vars.okUrl || `${stay}&mood=ok` },
        { label: "I need some help", href: vars.helpUrl || `${stay}&mood=help` },
      ],
    },
    experience: {
      subject: "Make the most of your stay in the Valley",
      heading: "Make the most of your stay",
      paras: [
        "If you'd like a slower day: rainforest tracks, a creek pause, and wildlife at dusk. If you'd like to wander further: Currumbin beach, local food, and the hinterland lookouts.",
        "Tell us what you'd like to explore on your stay page — rainforest, food, beaches, wildlife, adventure, or simply rest. We'll remember for next time.",
      ],
      buttons: [{ label: "Open the Guest Guide", href: `${stay}#guide` }],
    },
    checkout_eve: {
      subject: "Tomorrow is checkout — here's everything you need",
      heading: "Checkout tomorrow",
      highlight: `Please check out by ${checkoutTime}`,
      paras: [
        "Before you leave: lock up as you found it, take rubbish to the marked bins, and leave keys/access as described on your stay page.",
        "No rush this evening — enjoy the valley. Tomorrow's notes are all on your stay page.",
      ],
      buttons: [{ label: "View checkout instructions", href: `${stay}#checkout` }],
    },
    thank_you: {
      subject: "Thank you for staying with us 🌿",
      heading: "Thank you for choosing Currumbin Valley Hideaway",
      paras: [
        "We hope you had a wonderful stay and enjoyed your time in the valley.",
        "When you're ready, we'd love to hear how it was — a private note is perfect if you'd rather not post publicly.",
      ],
      buttons: [
        { label: "Tell us about your stay", href: vars.feedbackUrl || `${stay}#feedback` },
      ],
    },
    review_request: {
      subject: "Would you share your CVH experience?",
      heading: "Would you share your experience?",
      paras: [
        "If you enjoyed your stay, we'd really appreciate a moment for a public review. If anything wasn't right, private feedback is always welcome — we'd rather hear from you directly.",
      ],
      buttons: [
        { label: "Leave a Google Review", href: vars.googleReviewUrl || CVH_GOOGLE_REVIEW_URL },
        ...(vars.airbnbReviewUrl
          ? [{ label: "Leave an Airbnb Review", href: vars.airbnbReviewUrl }]
          : []),
        { label: "Leave feedback privately", href: vars.feedbackUrl || `${stay}#feedback` },
      ],
    },
    return_offer: {
      subject: "Come back to the valley 🌿",
      heading: "Come back to the valley",
      highlight: "10% off your next direct stay",
      paras: [
        "We'd love to welcome you back to Currumbin Valley Hideaway.",
        "As a previous guest, you can receive 10% off your next stay when you book with us directly — not through Airbnb or Booking.com.",
        "Join The Hideaway Circle to keep that return-stay reward with you.",
      ],
      buttons: [
        { label: "Claim My 10% Return Guest Offer", href: `${circle}?src=stay-return` },
        { label: "See stays", href: book },
      ],
    },
    inspiration: {
      subject: "The valley looks a little different every season",
      heading: "The valley looks a little different every season",
      paras: [
        "Rainforest, creek, wildlife, and those quiet late-afternoon lights — Currumbin Valley changes with the weather and the light.",
        "When you're ready for another reset, book direct and your guest return rate still applies.",
      ],
      buttons: [{ label: "Plan Your Next Escape", href: book }],
    },
    repeat_nudge: {
      subject: "Ready for another escape?",
      heading: "Ready for another escape?",
      paras: [
        vars.unitTitle
          ? `You stayed with us in ${vars.unitTitle}. When you're ready, there are other hideaways in the valley — or come back to the one you already love.`
          : "When you're ready, we'd love to welcome you back to Currumbin Valley Hideaway.",
        "Book direct for 10% off as a returning guest.",
      ],
      buttons: [
        { label: "Book your return stay", href: book },
        { label: "Join the Hideaway Circle", href: `${circle}?src=stay-repeat` },
      ],
    },
    referral: {
      subject: "Know someone who needs a little time in the valley?",
      heading: "Share the valley",
      paras: [
        "If someone you care about needs a quieter few days, send them our way.",
        "Your friend receives 10% off their first direct booking. You receive $50 CVH credit toward a future stay — the value stays in the valley.",
      ],
      buttons: [{ label: "Share Currumbin Valley Hideaway", href: `${stay}#refer` }],
    },
  };

  const c = copy[step];
  const body = `Hi ${first},\n\n${c.heading}\n\n${c.paras.join("\n\n")}\n\n${c.buttons.map((b) => `${b.label}: ${b.href}`).join("\n")}\n\n${CVH_SIGN}`;
  return {
    subject: c.subject,
    body,
    bodyHtml: pack(first, c.heading, c.paras, c.buttons, undefined, {
      kv: c.kv,
      highlight: c.highlight,
    }),
  };
}
