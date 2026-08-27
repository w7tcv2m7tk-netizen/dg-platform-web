/**
 * Sales Week — 90-Day Founding Customer Sprint (Brisbane wall-clock).
 * Canon: docs/strategy/COMMERCIAL-ENGINE.md
 * Page name stays “Sales Week”; Commercial Engine is the strategy doc, not the nav label.
 */

import {
  PLATFORM_DEFAULT_TZ,
  minutesInTimeZone,
  weekdayInTimeZone,
  zonedDayKey,
} from "../time/display";

export const SALES_WEEK_TZ = PLATFORM_DEFAULT_TZ;

/** Operating lock start — 30-day Founding 10 window. */
export const FOUNDING_10_LOCK_START = "2026-08-18";
export const FOUNDING_10_LOCK_END = "2026-09-16";

export const WEEKDAY_CUSTOMER_TARGET = 10;
export const WEEKDAY_PARTNER_TARGET = 5;

export type SalesWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type SalesWeekBlock = {
  startMin: number;
  endMin: number;
  title: string;
  doNow: string;
  href?: string;
  hrefLabel?: string;
};

export type SalesWeekDayPlan = {
  weekday: SalesWeekday;
  label: string;
  theme: string;
  inEngine: boolean;
  blocks: SalesWeekBlock[];
};

function hm(h: number, m = 0) {
  return h * 60 + m;
}

function clock(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

export function formatBlockClock(block: SalesWeekBlock): string {
  return `${clock(block.startMin)}–${clock(block.endMin)}`;
}

const OUTREACH = "/command/docs/founding-10-outreach";
const ENGINE_DOC = "/command/docs/commercial-engine";
const CRM = "/apps/crm/opportunities";
const CONSULTS = "/apps/crm/consultations";
const GOALS = "/dashboard/goals";

export const SALES_WEEK_DAYS: SalesWeekDayPlan[] = [
  {
    weekday: 1,
    label: "Monday",
    theme: "Existing network",
    inEngine: true,
    blocks: [
      {
        startMin: hm(9),
        endMin: hm(10, 30),
        title: "Contact 10–15 people you already know",
        doNow:
          "Personal update, not a SaaS campaign. Goal of first touch: book a conversation. Pick customer vs Founding Reseller language before you send.",
        href: OUTREACH,
        hrefLabel: "Open scripts",
      },
      {
        startMin: hm(10, 30),
        endMin: hm(12),
        title: "Follow-up",
        doNow: "Chase yesterday’s unanswered messages. Every row needs a next action.",
        href: CRM,
        hrefLabel: "CRM",
      },
      {
        startMin: hm(13),
        endMin: hm(15),
        title: "Demos / consultations",
        doNow:
          "When they book: ask how they run the business digitally before demoing the product.",
        href: CONSULTS,
        hrefLabel: "Consultations",
      },
      {
        startMin: hm(15),
        endMin: hm(16),
        title: "Proposals / Founding offers",
        doNow: "Send Founding 10 terms only to people who have had a real conversation.",
      },
      {
        startMin: hm(16),
        endMin: hm(17),
        title: "CRM close-out",
        doNow: "Every contact has a next action. No orphan rows.",
        href: CRM,
        hrefLabel: "CRM",
      },
    ],
  },
  {
    weekday: 2,
    label: "Tuesday",
    theme: "Prospecting — real estate first",
    inEngine: true,
    blocks: [
      {
        startMin: hm(9),
        endMin: hm(11),
        title: "New outbound (RE)",
        doNow:
          "Boutique and independent agencies. Four RE frameworks as the hook — not generic SaaS copy.",
        href: OUTREACH,
        hrefLabel: "Open scripts",
      },
      {
        startMin: hm(11),
        endMin: hm(12),
        title: "Follow-up",
        doNow: "Reply to anyone who opened or said they’d have a look.",
        href: CRM,
        hrefLabel: "CRM",
      },
      {
        startMin: hm(13),
        endMin: hm(15),
        title: "Demos",
        doNow: "Ask how they run the business digitally before showing DigitalGate.",
        href: CONSULTS,
        hrefLabel: "Consultations",
      },
      {
        startMin: hm(15),
        endMin: hm(16),
        title: "One useful piece",
        doNow:
          "Write one short piece (e.g. why agencies lose vendor opportunities after the enquiry). Not 50 articles.",
      },
      {
        startMin: hm(16),
        endMin: hm(17),
        title: "CRM + pipeline",
        doNow: "Log outbound. Next action on every row.",
        href: CRM,
        hrefLabel: "CRM",
      },
    ],
  },
  {
    weekday: 3,
    label: "Wednesday",
    theme: "Founding Resellers",
    inEngine: true,
    blocks: [
      {
        startMin: hm(9),
        endMin: hm(11),
        title: "Contact 10 potential Founding Resellers",
        doNow:
          "A-list only — people who open doors. They introduce; you close. Not an affiliate programme.",
        href: OUTREACH,
        hrefLabel: "Partner scripts",
      },
      {
        startMin: hm(11),
        endMin: hm(12),
        title: "Partner follow-ups",
        doNow: "Chase last week’s A-list. Do not recruit 50 people who never refer.",
        href: CRM,
        hrefLabel: "CRM",
      },
      {
        startMin: hm(13),
        endMin: hm(15),
        title: "Partner demonstrations",
        doNow:
          "60 min: what it is, who it’s for, pricing, Founding programme, how they make money. They introduce; Ben closes.",
      },
      {
        startMin: hm(15),
        endMin: hm(17),
        title: "Partner pipeline",
        doNow: "Aim for 3–5 genuinely capable Founding Resellers. Rank A / B / C.",
        href: CRM,
        hrefLabel: "CRM",
      },
    ],
  },
  {
    weekday: 4,
    label: "Thursday",
    theme: "Authority",
    inEngine: true,
    blocks: [
      {
        startMin: hm(9),
        endMin: hm(12),
        title: "Create → Publish",
        doNow:
          "One substantial Insights piece (AI Search, visibility, systems, CRM, automation, RE lead gen, vendor acquisition). Use existing IP — AI Visibility, Appraisal Magnet, Listing Pipeline, Vendor Velocity. Publish it.",
      },
      {
        startMin: hm(13),
        endMin: hm(15),
        title: "Distribute → Converse",
        doNow:
          "Authority loop: Distribute (Insights, LinkedIn company + personal, email, relevant contacts) → start conversations with people who could become customers or partners. Still hit 10 customer + 5 partner conversations.",
        href: OUTREACH,
        hrefLabel: "Copy",
      },
      {
        startMin: hm(15),
        endMin: hm(17),
        title: "Capture → Follow up",
        doNow:
          "Log CRM activity for each touch. Capture interest. Book concrete next steps — not “I’ll have a look.” Finish the daily 10 + 5.",
        href: CRM,
        hrefLabel: "CRM",
      },
    ],
  },
  {
    weekday: 5,
    label: "Friday",
    theme: "Closing",
    inEngine: true,
    blocks: [
      {
        startMin: hm(9),
        endMin: hm(11),
        title: "Every active prospect",
        doNow: "Move the pipeline. Ask for the next step. Founding 10 is the reason to act now.",
        href: CRM,
        hrefLabel: "CRM",
      },
      {
        startMin: hm(11),
        endMin: hm(12),
        title: "“I’ll have a look” list",
        doNow: "Follow up everyone who parked it. Personal, short, one ask.",
        href: OUTREACH,
        hrefLabel: "Follow-up copy",
      },
      {
        startMin: hm(13),
        endMin: hm(15),
        title: "Demos",
        doNow: "How they run the business digitally first. Then DigitalGate.",
        href: CONSULTS,
        hrefLabel: "Consultations",
      },
      {
        startMin: hm(15),
        endMin: hm(16),
        title: "Applications / proposals",
        doNow: "Get Founding applications in, not more features shipped.",
      },
      {
        startMin: hm(16),
        endMin: hm(17),
        title: "Weekly numbers",
        doNow:
          "Conversations, qualified prospects, consultations, demos, applications, customers, partners, revenue, pipeline, and next-step commitments. “I’ll have a look” is not a pipeline stage — only count concrete next actions.",
        href: GOALS,
        hrefLabel: "Goals",
      },
    ],
  },
  {
    weekday: 6,
    label: "Saturday",
    theme: "Out of the engine",
    inEngine: false,
    blocks: [],
  },
  {
    weekday: 0,
    label: "Sunday",
    theme: "CEO review",
    inEngine: false,
    blocks: [
      {
        startMin: hm(16),
        endMin: hm(17),
        title: "Sunday CEO Review",
        doNow:
          "1) Numbers — conversations, qualified prospects, consultations, demos, applications, customers, partners, MRR. 2) Funnel — where did prospects stop? 3) Bottleneck — what single thing constrains growth? 4) Decision — one change for next week. 5) Commitment — what will not distract us?",
        href: ENGINE_DOC,
        hrefLabel: "Operating lock",
      },
    ],
  },
];

export type SalesWeekPrompt = {
  timeZone: string;
  dayKey: string;
  weekday: SalesWeekday;
  dayLabel: string;
  theme: string;
  inEngine: boolean;
  clockLabel: string;
  headline: string;
  doNow: string;
  baseline: string | null;
  currentBlock: SalesWeekBlock | null;
  nextBlock: SalesWeekBlock | null;
  day: SalesWeekDayPlan;
  lockDay: number | null;
  lockDays: number;
  href?: string;
  hrefLabel?: string;
};

function planForWeekday(weekday: SalesWeekday): SalesWeekDayPlan {
  return SALES_WEEK_DAYS.find((d) => d.weekday === weekday) ?? SALES_WEEK_DAYS[5];
}

function daysBetween(fromKey: string, toKey: string): number {
  const [y1, m1, d1] = fromKey.split("-").map(Number);
  const [y2, m2, d2] = toKey.split("-").map(Number);
  const a = Date.UTC(y1, (m1 ?? 1) - 1, d1 ?? 1, 12);
  const b = Date.UTC(y2, (m2 ?? 1) - 1, d2 ?? 1, 12);
  return Math.round((b - a) / 86_400_000);
}

export function resolveSalesWeekPrompt(
  now: Date = new Date(),
  timeZone: string = SALES_WEEK_TZ,
): SalesWeekPrompt {
  const weekday = weekdayInTimeZone(now, timeZone) as SalesWeekday;
  const minutes = minutesInTimeZone(now, timeZone);
  const dayKey = zonedDayKey(now, timeZone);
  const day = planForWeekday(weekday);
  const clockLabel = clock(minutes);

  const lockSpan = daysBetween(FOUNDING_10_LOCK_START, FOUNDING_10_LOCK_END);
  let lockDay: number | null = null;
  if (dayKey >= FOUNDING_10_LOCK_START && dayKey <= FOUNDING_10_LOCK_END) {
    lockDay = daysBetween(FOUNDING_10_LOCK_START, dayKey) + 1;
  }

  const baseline = day.inEngine
    ? `Today’s baseline: initiate ${WEEKDAY_CUSTOMER_TARGET} customer + ${WEEKDAY_PARTNER_TARGET} partner conversations. Not 15 sales calls — 15 personal conversations started.`
    : null;

  const currentBlock =
    day.blocks.find((b) => minutes >= b.startMin && minutes < b.endMin) ?? null;
  const nextBlock =
    day.blocks.find((b) => b.startMin > minutes) ??
    (weekday === 6
      ? planForWeekday(0).blocks[0] ?? null
      : weekday === 0
        ? planForWeekday(1).blocks[0] ?? null
        : null);

  if (weekday === 6) {
    return {
      timeZone,
      dayKey,
      weekday,
      dayLabel: day.label,
      theme: day.theme,
      inEngine: false,
      clockLabel,
      headline: "Stay out of the sales engine",
      doNow: "Saturday is rest. The engine restarts Monday 9:00am Brisbane.",
      baseline: null,
      currentBlock: null,
      nextBlock: planForWeekday(1).blocks[0] ?? null,
      day,
      lockDay,
      lockDays: lockSpan,
    };
  }

  if (weekday === 0 && !currentBlock) {
    const review = day.blocks[0];
    const before = minutes < (review?.startMin ?? hm(16));
    return {
      timeZone,
      dayKey,
      weekday,
      dayLabel: day.label,
      theme: day.theme,
      inEngine: false,
      clockLabel,
      headline: before ? "CEO review later today" : "CEO review is done — rest",
      doNow: before
        ? `Protect 30–60 minutes at ${review ? formatBlockClock(review) : "4–5pm"} for CEO Review: Numbers → Funnel → Bottleneck → Decision → Commitment.`
        : "Engine is closed. Monday is existing network — contact 10–15 people you already know.",
      baseline: null,
      currentBlock: null,
      nextBlock: before ? review ?? null : planForWeekday(1).blocks[0] ?? null,
      day,
      lockDay,
      lockDays: lockSpan,
      href: ENGINE_DOC,
      hrefLabel: "Operating lock",
    };
  }

  if (day.inEngine && minutes < hm(9)) {
    const first = day.blocks[0];
    return {
      timeZone,
      dayKey,
      weekday,
      dayLabel: day.label,
      theme: day.theme,
      inEngine: true,
      clockLabel,
      headline: `Engine starts at 9:00am · ${day.theme}`,
      doNow: first
        ? `${first.title}. ${first.doNow}`
        : "Hit 10 customer + 5 partner conversations today.",
      baseline,
      currentBlock: null,
      nextBlock: first ?? null,
      day,
      lockDay,
      lockDays: lockSpan,
      href: first?.href,
      hrefLabel: first?.hrefLabel,
    };
  }

  if (day.inEngine && minutes >= hm(12) && minutes < hm(13)) {
    const afterLunch = day.blocks.find((b) => b.startMin >= hm(13)) ?? null;
    return {
      timeZone,
      dayKey,
      weekday,
      dayLabel: day.label,
      theme: day.theme,
      inEngine: true,
      clockLabel,
      headline: "Lunch — don’t skip",
      doNow: afterLunch
        ? `Next: ${formatBlockClock(afterLunch)} ${afterLunch.title}.`
        : "Back at 1:00pm.",
      baseline,
      currentBlock: null,
      nextBlock: afterLunch,
      day,
      lockDay,
      lockDays: lockSpan,
      href: afterLunch?.href,
      hrefLabel: afterLunch?.hrefLabel,
    };
  }

  if (day.inEngine && minutes >= hm(17)) {
    const tomorrow = planForWeekday((weekday === 5 ? 0 : ((weekday + 1) as SalesWeekday)));
    return {
      timeZone,
      dayKey,
      weekday,
      dayLabel: day.label,
      theme: day.theme,
      inEngine: true,
      clockLabel,
      headline: "Engine closed for the day",
      doNow: `CRM: every contact has a next action before you stop. Tomorrow is ${tomorrow.label} — ${tomorrow.theme}.`,
      baseline,
      currentBlock: null,
      nextBlock: tomorrow.blocks[0] ?? null,
      day,
      lockDay,
      lockDays: lockSpan,
      href: CRM,
      hrefLabel: "CRM",
    };
  }

  if (currentBlock) {
    return {
      timeZone,
      dayKey,
      weekday,
      dayLabel: day.label,
      theme: day.theme,
      inEngine: day.inEngine,
      clockLabel,
      headline: `${formatBlockClock(currentBlock)} · ${currentBlock.title}`,
      doNow: currentBlock.doNow,
      baseline,
      currentBlock,
      nextBlock:
        day.blocks.find((b) => b.startMin >= currentBlock.endMin) ?? null,
      day,
      lockDay,
      lockDays: lockSpan,
      href: currentBlock.href,
      hrefLabel: currentBlock.hrefLabel,
    };
  }

  return {
    timeZone,
    dayKey,
    weekday,
    dayLabel: day.label,
    theme: day.theme,
    inEngine: day.inEngine,
    clockLabel,
    headline: day.theme,
    doNow: baseline ?? "See the day’s blocks.",
    baseline,
    currentBlock: null,
    nextBlock,
    day,
    lockDay,
    lockDays: lockSpan,
  };
}
