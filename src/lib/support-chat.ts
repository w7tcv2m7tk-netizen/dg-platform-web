import { getApiBase } from "@/lib/dg-api";

export type SupportChatMessage = {
  id: number;
  role: "client" | "staff";
  sender: string;
  body: string;
  at: string;
};

function supportHeaders(email: string, clerkUserId?: string): HeadersInit | null {
  const apiKey = process.env.DG_API_KEY?.trim();
  if (!apiKey) return null;

  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    "X-Portal-Email": email,
  };
  if (clerkUserId) {
    headers["X-Clerk-User-Id"] = clerkUserId;
  }
  return headers;
}

export async function fetchSupportConversation(email: string, clerkUserId?: string) {
  const headers = supportHeaders(email, clerkUserId);
  if (!headers) {
    return {
      ok: false as const,
      code: "missing_api_key" as const,
      message: "Set DG_API_KEY to enable live support chat.",
    };
  }

  try {
    const res = await fetch(`${getApiBase()}/support/platform/conversation`, {
      headers,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      conversation_id?: number;
      messages?: SupportChatMessage[];
      message?: string;
      code?: string;
    } | null;

    if (res.status === 403) {
      return {
        ok: false as const,
        code: "not_linked" as const,
        message:
          data?.message ??
          "Complete onboarding on digitalgate.com.au with this email to use live chat.",
      };
    }

    if (!res.ok) {
      return {
        ok: false as const,
        code: "upstream_error" as const,
        message: data?.message ?? `Support chat unavailable (HTTP ${res.status})`,
      };
    }

    return {
      ok: true as const,
      conversationId: data?.conversation_id ?? 0,
      messages: data?.messages ?? [],
    };
  } catch {
    return {
      ok: false as const,
      code: "network_error" as const,
      message: "Could not reach DigitalGate support chat.",
    };
  }
}

export async function fetchSupportMessages(
  email: string,
  after: number,
  clerkUserId?: string,
) {
  const headers = supportHeaders(email, clerkUserId);
  if (!headers) {
    return { ok: false as const, messages: [] as SupportChatMessage[] };
  }

  try {
    const res = await fetch(
      `${getApiBase()}/support/platform/messages?after=${after}`,
      { headers, cache: "no-store" },
    );
    if (!res.ok) return { ok: false as const, messages: [] as SupportChatMessage[] };
    const data = (await res.json()) as { messages?: SupportChatMessage[] };
    return { ok: true as const, messages: data.messages ?? [] };
  } catch {
    return { ok: false as const, messages: [] as SupportChatMessage[] };
  }
}

export async function postSupportMessage(
  email: string,
  message: string,
  clerkUserId?: string,
) {
  const headers = supportHeaders(email, clerkUserId);
  if (!headers) {
    return {
      ok: false as const,
      message: "Set DG_API_KEY to enable live support chat.",
    };
  }

  try {
    const res = await fetch(`${getApiBase()}/support/platform/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      messages?: SupportChatMessage[];
      message?: string;
    } | null;

    if (!res.ok) {
      return {
        ok: false as const,
        message: data?.message ?? "Could not send message",
      };
    }

    return { ok: true as const, messages: data?.messages ?? [] };
  } catch {
    return { ok: false as const, message: "Could not reach support chat" };
  }
}
