const STAFF_INBOX =
  process.env.DG_SUPPORT_ADMIN_EMAIL?.trim() || "support@digitalgate.com.au";

export async function notifyStaffSupportMessage(input: {
  clientName: string;
  clientEmail: string;
  organisationName?: string;
  organisationSlug?: string;
  organisationId?: string;
  body: string;
  conversationId: string;
  aiMayReply: boolean;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const from =
    process.env.RESEND_FROM?.trim() ||
    "DigitalGate Support <support@digitalgate.com.au>";
  const orgLabel =
    input.organisationName?.trim() ||
    input.organisationSlug?.trim() ||
    input.organisationId ||
    "Unknown organisation";
  const subject = `Support — ${orgLabel} — ${input.clientName || "Client"}`;
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://app.digitalgate.com.au";
  const inboxHint = `${appBase}/support/tickets`;

  const text = [
    "New customer support message:",
    "",
    input.body,
    "",
    `Organisation: ${orgLabel}`,
    input.organisationSlug ? `Slug: ${input.organisationSlug}` : "",
    input.organisationId ? `Organisation ID: ${input.organisationId}` : "",
    `From: ${input.clientName} <${input.clientEmail}>`,
    `Conversation: ${input.conversationId}`,
    input.aiMayReply
      ? "Note: DigitalGate Assist may send a first-line reply in chat."
      : "",
    `Operator inbox: ${inboxHint}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [STAFF_INBOX],
        subject,
        text,
      }),
    });
  } catch {
    /* non-fatal */
  }
}
