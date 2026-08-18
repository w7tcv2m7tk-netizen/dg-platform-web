/**
 * DigitalGate Platform Consultation booking emails + calendar invite.
 * Confirmation is immediate; 24h / 1h / post-meeting via cron.
 */

import { composeEmailBody, type EmailBodyBlock } from "../communications/email-html";

export const DG_CONSULT_ZOOM_URL =
  "https://us05web.zoom.us/j/9537192432?pwd=lqAE7buBTaal4XeBoAqVa7X9FboTcN.1";

export const DG_CONSULT_RESCHEDULE_URL =
  "https://digitalgate.com.au/strategy-session";

export const DG_CONSULT_PIPELINE = "platform_consultation";

export const DG_CONSULT_CC_EMAIL = "consultations@digitalgate.com.au";

export function consultationEmailCc(to: string): string[] {
  if (to.trim().toLowerCase() === DG_CONSULT_CC_EMAIL.toLowerCase()) return [];
  return [DG_CONSULT_CC_EMAIL];
}

export type ConsultationAppointment = {
  date: string;
  time: string;
  timeLabel: string;
  timezone: string;
  meetingLink: string;
  startsAt: string;
  endsAt: string;
};

export type ConsultationSequenceMeta = {
  kind: "platform_consultation";
  email: string;
  firstName: string;
  fullName: string;
  date: string;
  time: string;
  timeLabel: string;
  timezone: string;
  meetingLink: string;
  startsAt: string;
  confirmation_sent: boolean;
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
  followup_sent: boolean;
};

const CONSULT_OUTCOMES = [
  "Your current digital systems and software",
  "Where information and workflows may be disconnected",
  "Opportunities to simplify and centralise your operations",
  "Which DigitalGate Platform and Apps may be relevant",
  "Potential automation and AI opportunities",
  "A practical roadmap for getting started",
];

export function isConsultationLead(input: {
  source?: string | null;
  title?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}): boolean {
  const meta = input.metadata ?? {};
  const leadType = typeof meta.lead_type === "string" ? meta.lead_type : "";
  const pageSlug = typeof meta.page_slug === "string" ? meta.page_slug : "";
  const desc = input.description || "";
  return (
    leadType === "consultation" ||
    pageSlug === "strategy-session" ||
    /requested slot:/i.test(desc) ||
    /platform consultation/i.test(input.title || "")
  );
}

export function parseConsultationAppointment(input: {
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}): ConsultationAppointment | null {
  const meta = input.metadata ?? {};
  const desc = input.description || "";
  const nested =
    meta.appointment && typeof meta.appointment === "object"
      ? (meta.appointment as Record<string, unknown>)
      : null;
  const date =
    (typeof nested?.date === "string" && nested.date) ||
    (typeof meta.requested_date === "string" && meta.requested_date) ||
    desc.match(/Requested slot:\s*(\d{4}-\d{2}-\d{2})/i)?.[1] ||
    desc.match(/(\d{4}-\d{2}-\d{2})\s+[0-9]/)?.[1] ||
    "";
  const timeRaw =
    (typeof nested?.time === "string" && nested.time) ||
    (typeof nested?.timeLabel === "string" && nested.timeLabel) ||
    (typeof meta.requested_time === "string" && meta.requested_time) ||
    desc.match(/Requested slot:\s*\d{4}-\d{2}-\d{2}\s+([0-9:.apm\s]+?)(?:\s+AEST)?(?:\n|$)/i)?.[1] ||
    desc.match(/\d{4}-\d{2}-\d{2}\s+([0-9:.apm\s]+?)(?:\s+AEST)/i)?.[1] ||
    "";
  const meetingLink =
    (typeof nested?.meetingLink === "string" && nested.meetingLink) ||
    (typeof meta.meeting_link === "string" && meta.meeting_link) ||
    desc.match(/Zoom:\s*(\S+)/i)?.[1] ||
    DG_CONSULT_ZOOM_URL;
  const parsed = parseTimeToMinutes(timeRaw.trim());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || parsed == null) return null;
  const time = `${String(Math.floor(parsed / 60)).padStart(2, "0")}:${String(parsed % 60).padStart(2, "0")}`;
  const startsAt = brisbaneIso(date, time);
  const endsAt = new Date(new Date(startsAt).getTime() + 30 * 60 * 1000).toISOString();
  return {
    date,
    time,
    timeLabel: formatSlot(time),
    timezone: "AEST",
    meetingLink,
    startsAt,
    endsAt,
  };
}

export function buildConsultationSequence(input: {
  email: string;
  firstName: string;
  fullName: string;
  appointment: ConsultationAppointment;
}): ConsultationSequenceMeta {
  return {
    kind: "platform_consultation",
    email: input.email,
    firstName: input.firstName,
    fullName: input.fullName,
    date: input.appointment.date,
    time: input.appointment.time,
    timeLabel: input.appointment.timeLabel,
    timezone: input.appointment.timezone,
    meetingLink: input.appointment.meetingLink,
    startsAt: input.appointment.startsAt,
    confirmation_sent: true,
    reminder_24h_sent: false,
    reminder_1h_sent: false,
    followup_sent: false,
  };
}

export function dueConsultationReminderSteps(
  sequence: ConsultationSequenceMeta,
  now = new Date(),
): Array<"24h" | "1h" | "followup"> {
  const start = new Date(sequence.startsAt).getTime();
  if (!Number.isFinite(start)) return [];
  const t = now.getTime();
  const due: Array<"24h" | "1h" | "followup"> = [];
  if (!sequence.reminder_24h_sent && t >= start - 24 * 60 * 60 * 1000 && t < start - 75 * 60 * 1000) {
    due.push("24h");
  }
  if (!sequence.reminder_1h_sent && t >= start - 75 * 60 * 1000 && t < start) {
    due.push("1h");
  }
  if (!sequence.followup_sent && t >= start + 2 * 60 * 60 * 1000) {
    due.push("followup");
  }
  return due;
}

export function renderConsultationConfirmation(input: {
  firstName: string;
  appointment: ConsultationAppointment;
}): { subject: string; body: string; bodyHtml: string; ics: string } {
  const name = input.firstName || "there";
  const a = input.appointment;
  const subject = "Your DigitalGate Platform Consultation is confirmed";
  const body = [
    `Hi ${name},`,
    ``,
    `Thanks for booking your Free DigitalGate Platform Consultation.`,
    ``,
    `Your consultation has been confirmed:`,
    ``,
    `Date: ${formatDate(a.date)}`,
    `Time: ${a.timeLabel} ${a.timezone}`,
    `Duration: 30 minutes`,
    `Location: Online via Zoom`,
    ``,
    `Join Zoom Meeting:`,
    a.meetingLink,
    ``,
    `During the consultation, we'll look at:`,
    ...CONSULT_OUTCOMES.map((item) => `* ${item}`),
    ``,
    `There's nothing you need to prepare beforehand. If possible, just have an idea of the main systems you currently use and the areas of the business you'd most like to improve.`,
    ``,
    `If you need to reschedule: ${DG_CONSULT_RESCHEDULE_URL}`,
    ``,
    `I look forward to speaking with you.`,
    ``,
    `Ben Roe`,
    `Founder · DigitalGate`,
    `The Gateway to Your Digital World™`,
    ``,
    `0405 227 227`,
    `hello@digitalgate.com.au`,
    `digitalgate.com.au`,
  ].join("\n");

  const blocks: EmailBodyBlock[] = [
    { type: "kicker", text: "Platform Consultation" },
    { type: "heading", text: "Your consultation is confirmed" },
    { type: "paragraph", text: `Hi ${name},` },
    {
      type: "paragraph",
      text: "Thanks for booking your Free DigitalGate Platform Consultation.",
    },
    {
      type: "kv",
      rows: [
        { label: "Date", value: formatDate(a.date) },
        { label: "Time", value: `${a.timeLabel} ${a.timezone}` },
        { label: "Duration", value: "30 minutes" },
        { label: "Location", value: "Online via Zoom" },
      ],
    },
    { type: "button", label: "Join Zoom Meeting →", href: a.meetingLink },
    { type: "paragraph", text: `Meeting link: ${a.meetingLink}`, muted: true },
    { type: "heading", text: "During the consultation, we'll look at:", level: 2 },
    { type: "list", items: CONSULT_OUTCOMES },
    {
      type: "paragraph",
      text: "There's nothing you need to prepare beforehand. If possible, just have an idea of the main systems you currently use and the areas of the business you'd most like to improve.",
    },
    { type: "button", label: "Reschedule Consultation →", href: DG_CONSULT_RESCHEDULE_URL },
    {
      type: "signoff",
      lines: [
        "I look forward to speaking with you.",
        "Ben Roe",
        "Founder · DigitalGate",
        "The Gateway to Your Digital World™",
        "0405 227 227 · hello@digitalgate.com.au",
      ],
    },
  ];

  return {
    subject,
    body,
    bodyHtml: composeEmailBody(blocks, { accentColor: "#3B82F6" }),
    ics: buildConsultationIcs(a),
  };
}

export function renderConsultationReminder(
  step: "24h" | "1h" | "followup",
  input: { firstName: string; appointment: ConsultationAppointment },
): { subject: string; body: string; bodyHtml: string } {
  const name = input.firstName || "there";
  const a = input.appointment;
  if (step === "24h") {
    const subject = "Your DigitalGate consultation is tomorrow";
    const body = [
      `Hi ${name},`,
      ``,
      `Just a quick reminder that your DigitalGate Platform Consultation is booked for ${formatDate(a.date)} at ${a.timeLabel} ${a.timezone}.`,
      ``,
      a.meetingLink,
      ``,
      `We'll spend around 30 minutes looking at your business, current systems and where DigitalGate may be able to simplify your digital operations.`,
      ``,
      `See you tomorrow,`,
      `Ben`,
    ].join("\n");
    return {
      subject,
      body,
      bodyHtml: composeEmailBody(
        [
          { type: "paragraph", text: `Hi ${name},` },
          {
            type: "paragraph",
            text: `Just a quick reminder that your DigitalGate Platform Consultation is booked for ${formatDate(a.date)} at ${a.timeLabel} ${a.timezone}.`,
          },
          { type: "button", label: "Join Zoom Meeting →", href: a.meetingLink },
          {
            type: "paragraph",
            text: "We'll spend around 30 minutes looking at your business, current systems and where DigitalGate may be able to simplify your digital operations.",
          },
          { type: "signoff", lines: ["See you tomorrow,", "Ben"] },
        ],
        { accentColor: "#3B82F6" },
      ),
    };
  }
  if (step === "1h") {
    const subject = "Your DigitalGate consultation starts in 1 hour";
    const body = [
      `Hi ${name},`,
      ``,
      `Just a quick reminder that we're meeting at ${a.timeLabel} ${a.timezone} today.`,
      ``,
      a.meetingLink,
      ``,
      `See you shortly,`,
      `Ben`,
    ].join("\n");
    return {
      subject,
      body,
      bodyHtml: composeEmailBody(
        [
          { type: "paragraph", text: `Hi ${name},` },
          {
            type: "paragraph",
            text: `Just a quick reminder that we're meeting at ${a.timeLabel} ${a.timezone} today.`,
          },
          { type: "button", label: "Join Zoom Meeting →", href: a.meetingLink },
          { type: "signoff", lines: ["See you shortly,", "Ben"] },
        ],
        { accentColor: "#3B82F6" },
      ),
    };
  }
  const subject = "Thanks for your DigitalGate consultation";
  const body = [
    `Hi ${name},`,
    ``,
    `Thanks for joining the DigitalGate Platform Consultation.`,
    ``,
    `I'll follow up with the notes and recommended next steps. If Founding 10 is relevant, we can talk through that on the same thread.`,
    ``,
    `Ben Roe`,
    `Founder · DigitalGate`,
  ].join("\n");
  return {
    subject,
    body,
    bodyHtml: composeEmailBody(
      [
        { type: "paragraph", text: `Hi ${name},` },
        { type: "paragraph", text: "Thanks for joining the DigitalGate Platform Consultation." },
        {
          type: "paragraph",
          text: "I'll follow up with the notes and recommended next steps. If Founding 10 is relevant, we can talk through that on the same thread.",
        },
        { type: "button", label: "Apply for Founding 10 →", href: "https://digitalgate.com.au/founding-customers" },
        { type: "signoff", lines: ["Ben Roe", "Founder · DigitalGate"] },
      ],
      { accentColor: "#3B82F6" },
    ),
  };
}

export function buildConsultationIcs(appointment: ConsultationAppointment): string {
  const uid = `consult-${appointment.startsAt.replace(/[^\d]/g, "")}@digitalgate.com.au`;
  const stamp = toIcsUtc(new Date().toISOString());
  const start = toIcsLocal(appointment.date, appointment.time);
  const endMin = parseTimeToMinutes(appointment.time)! + 30;
  const endH = String(Math.floor(endMin / 60)).padStart(2, "0");
  const endM = String(endMin % 60).padStart(2, "0");
  const end = toIcsLocal(appointment.date, `${endH}:${endM}`);
  const desc = `DigitalGate Platform Consultation\\nZoom: ${appointment.meetingLink}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DigitalGate//Platform Consultation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Australia/Brisbane:${start}`,
    `DTEND;TZID=Australia/Brisbane:${end}`,
    "SUMMARY:DigitalGate Platform Consultation",
    `DESCRIPTION:${desc}`,
    `LOCATION:${appointment.meetingLink}`,
    "ORGANIZER;CN=Ben Roe:mailto:hello@digitalgate.com.au",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatSlot(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function parseTimeToMinutes(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const ampm = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] || "0");
    const mer = ampm[3].toUpperCase();
    if (mer === "PM" && h < 12) h += 12;
    if (mer === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }
  const hf = t.match(/^(\d{1,2}):(\d{2})$/);
  if (hf) return Number(hf[1]) * 60 + Number(hf[2]);
  return null;
}

function brisbaneIso(date: string, time: string): string {
  return `${date}T${time}:00+10:00`;
}

function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

function toIcsLocal(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}
