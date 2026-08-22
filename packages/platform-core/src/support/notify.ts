const STAFF_INBOX =
  process.env.DG_SUPPORT_ADMIN_EMAIL?.trim() || "support@digitalgate.com.au";

export async function notifyStaffSupportMessage(input: {
  clientName: string;
  clientEmail: string;
  body: string;
  conversationId: string;
  aiMayReply: boolean;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const from =
    process.env.RESEND_FROM?.trim() ||
    "DigitalGate Support <support@digitalgate.com.au>";
  const subject = `Client support message — ${input.clientName || "Client"}`;
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://app.digitalgate.com.au";
  const inboxHint = `${appBase}/support`;

  const text = [
    "New message in the client portal:",
    "",
    input.body,
    "",
    `From: ${input.clientName} <${input.clientEmail}>`,
    input.aiMayReply
      ? "Note: DigitalGate Assist may send a first-line reply in chat."
      : "",
    `View in app: ${inboxHint}`,
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
