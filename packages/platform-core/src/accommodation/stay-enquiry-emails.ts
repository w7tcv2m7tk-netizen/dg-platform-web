/**
 * CVH stay enquiry — host/owner notification (dates, unit, guest).
 * Guest ack is sent separately by lead.created automation; do not replace it.
 */

import { createActivity } from "../activities";
import { sendMessage } from "../communications";
import { composeEmailBody } from "../communications/email-html";
import { getOrganisationBusinessProfile } from "../org/onboarding-profile";

const ACCENT = "#B9A48A";

/** Operational stay inbox (WP contact form recipient). */
export const CVH_STAY_HOST_EMAIL = "stay@currumbinvalleyhideaway.com.au";

export type StayEnquiryHostNotifyInput = {
  organisationId: string;
  leadId?: string;
  unitTitle: string;
  unitSlug?: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkin?: string;
  checkout?: string;
  guests?: number;
  message?: string;
};

export function formatStayDate(ymd?: string | null): string {
  const raw = ymd?.trim() || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  return new Date(`${raw}T12:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function stayEnquiryDateLine(checkin?: string, checkout?: string): string {
  const from = formatStayDate(checkin);
  const to = formatStayDate(checkout);
  if (from && to) {
    const nights = stayEnquiryNights(checkin, checkout);
    const nightLabel =
      nights > 0
        ? ` (${nights} night${nights === 1 ? "" : "s"})`
        : "";
    return `${from} → ${to}${nightLabel}`;
  }
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "Not specified";
}

export function stayEnquiryNights(checkin?: string, checkout?: string): number {
  if (
    !checkin ||
    !checkout ||
    !/^\d{4}-\d{2}-\d{2}$/.test(checkin) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(checkout) ||
    checkout <= checkin
  ) {
    return 0;
  }
  const start = new Date(`${checkin}T12:00:00`);
  const end = new Date(`${checkout}T12:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function resolveStayEnquiryHostEmails(input: {
  guestEmail?: string;
  profileEmails?: Array<string | undefined | null>;
  extra?: Array<string | undefined | null>;
}): string[] {
  const guest = input.guestEmail?.trim().toLowerCase() || "";
  const env = process.env.DG_CVH_STAY_HOST_EMAIL?.trim();
  const raw = [env, CVH_STAY_HOST_EMAIL, ...(input.profileEmails ?? []), ...(input.extra ?? [])];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    const email = (value || "").trim().toLowerCase();
    if (!email || !email.includes("@") || email === guest || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function adminStayEnquiryNotifyBody(input: {
  unitTitle: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkin?: string;
  checkout?: string;
  guests?: number;
  message?: string;
}): { subject: string; body: string; bodyHtml: string } {
  const dates = stayEnquiryDateLine(input.checkin, input.checkout);
  const guests =
    input.guests != null && Number.isFinite(input.guests)
      ? String(input.guests)
      : "Not specified";
  const phone = input.guestPhone?.trim() || "Not provided";
  const note = input.message?.trim() || "—";
  const unit = input.unitTitle.trim() || "Stay";

  const body = [
    `New stay enquiry — ${unit}`,
    ``,
    `Dates: ${dates}`,
    `Unit: ${unit}`,
    `Guests: ${guests}`,
    `Name: ${input.guestName}`,
    `Email: ${input.guestEmail}`,
    `Phone: ${phone}`,
    ``,
    `Message:`,
    note,
  ].join("\n");

  return {
    subject: `New stay enquiry — ${unit} (${dates})`,
    body,
    bodyHtml: composeEmailBody(
      [
        { type: "kicker", text: "Stay enquiry" },
        { type: "heading", text: `New enquiry — ${unit}` },
        {
          type: "kv",
          rows: [
            { label: "Dates", value: dates },
            { label: "Unit", value: unit },
            { label: "Guests", value: guests },
            { label: "Name", value: input.guestName },
            { label: "Email", value: input.guestEmail },
            { label: "Phone", value: phone },
            { label: "Message", value: note },
          ],
        },
        {
          type: "paragraph",
          text: "Reply to this email to respond to the guest.",
          muted: true,
        },
      ],
      { accentColor: ACCENT },
    ),
  };
}

export async function sendStayEnquiryHostNotification(
  input: StayEnquiryHostNotifyInput,
): Promise<{ sent: number; recipients: string[] }> {
  const profile = await getOrganisationBusinessProfile(input.organisationId);
  const recipients = resolveStayEnquiryHostEmails({
    guestEmail: input.guestEmail,
    profileEmails: [
      profile?.businessEmail,
      profile?.supportEmail,
      profile?.contactEmail,
    ],
  });

  if (recipients.length === 0) {
    console.info("[public-stay] host enquiry notify skipped — no recipients");
    return { sent: 0, recipients };
  }

  const mail = adminStayEnquiryNotifyBody(input);
  let sent = 0;

  for (const to of recipients) {
    const result = await sendMessage({
      organisationId: input.organisationId,
      channel: "email",
      to,
      subject: mail.subject,
      body: mail.body,
      bodyHtml: mail.bodyHtml,
      metadata: {
        purpose: "cvh_stay_enquiry_host",
        replyTo: input.guestEmail.trim(),
        unitSlug: input.unitSlug ?? null,
        leadId: input.leadId ?? null,
        checkin: input.checkin ?? null,
        checkout: input.checkout ?? null,
        footerNote: "Stay enquiry — Currumbin Valley Hideaway",
      },
    });

    if (result.status === "sent") sent += 1;

    if (input.leadId) {
      await createActivity({
        organisationId: input.organisationId,
        entityType: "Lead",
        entityId: input.leadId,
        activityType: result.status === "sent" ? "email_sent" : "email_queued",
        title:
          result.status === "sent"
            ? "Host enquiry email sent"
            : "Host enquiry email queued",
        body: `${to} · ${result.provider}${result.error ? ` · ${result.error}` : ""}`,
        sourceApp: "accommodation",
        metadata: {
          purpose: "cvh_stay_enquiry_host",
          emailStatus: result.status,
          provider: result.provider,
        },
      });
    }
  }

  return { sent, recipients };
}
