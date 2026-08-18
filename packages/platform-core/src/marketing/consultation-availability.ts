/**
 * Platform Consultation slot grid + occupancy.
 * Meetings are 30 minutes with a 30-minute buffer after each booking.
 */

import { getWebsiteBySlug } from "../websites/crud";
import {
  DG_CONSULT_PIPELINE,
  parseConsultationAppointment,
} from "./consultation-emails";

export const DG_CONSULT_DURATION_MIN = 30;
export const DG_CONSULT_BUFFER_MIN = 30;

const OCCUPY_MIN = DG_CONSULT_DURATION_MIN + DG_CONSULT_BUFFER_MIN;

function brisbaneTodayIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function brisbaneWeekday(dateIso: string): number {
  const noonUtc = new Date(`${dateIso}T02:00:00Z`);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Australia/Brisbane",
    weekday: "short",
  }).format(noonUtc);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

function minutesFromHhMm(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function consultationGridSlots(dateIso: string, now = new Date()): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return [];
  const dow = brisbaneWeekday(dateIso);
  if (dow < 0 || dow === 0) return [];
  const endHour = dow === 6 ? 12 : 17;
  const slots: string[] = [];
  for (let h = 9; h < endHour; h++) {
    for (const min of [0, 30]) {
      if (h === 16 && min === 30) continue;
      if (h === 11 && min === 30 && endHour === 12) continue;
      slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
  }
  if (dateIso !== brisbaneTodayIso(now)) return slots;
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hh = Number(parts.find((p) => p.type === "hour")?.value || "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value || "0");
  const cutoff = hh * 60 + mm + 45;
  return slots.filter((t) => {
    const minutes = minutesFromHhMm(t);
    return minutes != null && minutes >= cutoff;
  });
}

export function consultationSlotConflicts(
  candidateTime: string,
  bookedTimes: string[],
): boolean {
  const candidate = minutesFromHhMm(candidateTime);
  if (candidate == null) return true;
  return bookedTimes.some((booked) => {
    const start = minutesFromHhMm(booked);
    if (start == null) return false;
    return Math.abs(candidate - start) < OCCUPY_MIN;
  });
}

export function availableConsultationSlots(
  dateIso: string,
  bookedTimes: string[],
  now = new Date(),
): string[] {
  return consultationGridSlots(dateIso, now).filter(
    (slot) => !consultationSlotConflicts(slot, bookedTimes),
  );
}

export async function listBookedConsultationTimes(options: {
  organisationId: string;
  dateIso: string;
}): Promise<string[]> {
  const { prisma } = await import("@dg/database");
  const [opportunities, leads] = await Promise.all([
    prisma.opportunity.findMany({
      where: {
        organisationId: options.organisationId,
        pipelineId: DG_CONSULT_PIPELINE,
        status: { not: "lost" },
      },
      select: { metadata: true, title: true },
      take: 300,
    }),
    prisma.lead.findMany({
      where: {
        organisationId: options.organisationId,
        status: { notIn: ["lost", "closed", "junk"] },
        OR: [
          { metadata: { path: ["lead_type"], equals: "consultation" } },
          { metadata: { path: ["page_slug"], equals: "strategy-session" } },
        ],
      },
      select: { metadata: true, description: true },
      take: 300,
    }),
  ]);

  const times = new Set<string>();
  for (const row of opportunities) {
    const appointment = parseConsultationAppointment({
      description: row.title,
      metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    });
    if (appointment?.date === options.dateIso) times.add(appointment.time);
  }
  for (const row of leads) {
    const appointment = parseConsultationAppointment({
      description: row.description,
      metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    });
    if (appointment?.date === options.dateIso) times.add(appointment.time);
  }
  return [...times];
}

async function resolveConsultationOrgId(siteSlug: string): Promise<string | null> {
  const site =
    (await getWebsiteBySlug(siteSlug, { publishedOnly: true })) ||
    (await getWebsiteBySlug(siteSlug));
  if (site?.organisationId) return site.organisationId;
  const { prisma } = await import("@dg/database");
  const { resolveOrgBrandPresetKey } = await import("../org/brand-presets");
  const orgs = await prisma.organisation.findMany({
    select: { id: true, name: true, slug: true, industry: true, settings: true },
    take: 100,
  });
  for (const org of orgs) {
    if (resolveOrgBrandPresetKey(org) === "digitalgate") return org.id;
  }
  return null;
}

export type ConsultationAvailability = {
  ok: true;
  date: string;
  timezone: "AEST";
  slots: string[];
  closed: boolean;
};

export async function getConsultationAvailability(options: {
  dateIso: string;
  siteSlug?: string;
  organisationId?: string;
  now?: Date;
}): Promise<ConsultationAvailability | { ok: false; code: string; message: string }> {
  const dateIso = options.dateIso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return { ok: false, code: "validation_error", message: "date must be YYYY-MM-DD" };
  }
  const organisationId =
    options.organisationId ||
    (await resolveConsultationOrgId(options.siteSlug?.trim() || "digitalgate"));
  if (!organisationId) {
    return { ok: false, code: "not_found", message: "DigitalGate organisation not found" };
  }
  const closed = brisbaneWeekday(dateIso) === 0;
  if (closed) {
    return { ok: true, date: dateIso, timezone: "AEST", slots: [], closed: true };
  }
  const booked = await listBookedConsultationTimes({
    organisationId,
    dateIso,
  });
  return {
    ok: true,
    date: dateIso,
    timezone: "AEST",
    slots: availableConsultationSlots(dateIso, booked, options.now),
    closed: false,
  };
}

export async function assertConsultationSlotAvailable(options: {
  organisationId: string;
  dateIso?: string | null;
  time?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const appointment = parseConsultationAppointment({
    description: options.description,
    metadata: {
      ...(options.metadata ?? {}),
      requested_date: options.dateIso || undefined,
      requested_time: options.time || undefined,
    },
  });
  if (!appointment) {
    return {
      ok: false,
      code: "validation_error",
      message: "Please select a date and time.",
    };
  }
  const availability = await getConsultationAvailability({
    organisationId: options.organisationId,
    dateIso: appointment.date,
  });
  if (!availability.ok) return availability;
  if (!availability.slots.includes(appointment.time)) {
    return {
      ok: false,
      code: "slot_unavailable",
      message: "That time isn’t available — please choose another slot.",
    };
  }
  return { ok: true };
}
