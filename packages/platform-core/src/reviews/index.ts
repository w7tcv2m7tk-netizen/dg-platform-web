/**
 * DigitalGate Reviews & Reputation — Growth App (Network timing).
 * Distinct from Platform Refer & Earn and Business Referral Network.
 * See docs/foundations/REVIEWS-AND-REFERRALS.md §1.
 */

import { llmChat, llmConfigured } from "../ai/llm";
import { createActivity } from "../activities";
import { listStayBookings } from "../accommodation/bookings";
import { platformEvents } from "../events";
import { listSettlementProperties } from "../real-estate/settlements";

export type ReviewFeedItem = {
  id: string;
  source: string;
  authorName?: string | null;
  rating?: number | null;
  title?: string | null;
  content?: string | null;
  reviewDate?: string | null;
  sourceUrl?: string | null;
  listingId?: string | null;
  responded?: boolean;
};

export type ReviewSourceConcept = {
  id: string;
  label: string;
  description: string;
  status: "connected" | "available" | "planned";
  connectorHint?: string;
};

export const REVIEW_SOURCE_CONCEPTS: ReviewSourceConcept[] = [
  {
    id: "accommodation_wp",
    label: "Accommodation (WordPress dg_reviews)",
    description: "Airbnb / Booking.com / imported guest reviews via Acc connector",
    status: "available",
    connectorHint: "WordPress accommodation plugin v10.65.1+",
  },
  {
    id: "google_business",
    label: "Google Business Profile",
    description: "Monitor and respond to Google reviews",
    status: "planned",
    connectorHint: "Google connector (Phase 4+)",
  },
  {
    id: "facebook",
    label: "Facebook / Meta",
    description: "Page recommendations and ratings",
    status: "planned",
    connectorHint: "Meta connector (Phase 4+)",
  },
  {
    id: "manual",
    label: "Manual / imported",
    description: "CSV or pasted reviews for historical baselines",
    status: "planned",
  },
];

export type ReputationScoreBreakdown = {
  score: number;
  averageRating: number | null;
  reviewCount: number;
  responseRate: number;
  volumeScore: number;
  ratingScore: number;
  responseScore: number;
  note: string;
};

/** Reputation Score™ stub — transparent weighted formula until Scoring Engine owns it. */
export function computeReputationScore(reviews: ReviewFeedItem[]): ReputationScoreBreakdown {
  const withRating = reviews.filter((r) => r.rating != null && Number.isFinite(r.rating));
  const reviewCount = withRating.length;
  const averageRating =
    reviewCount > 0
      ? withRating.reduce((sum, r) => sum + (r.rating as number), 0) / reviewCount
      : null;

  const responded = reviews.filter((r) => r.responded).length;
  const responseRate = reviews.length ? responded / reviews.length : 0;

  const ratingScore = averageRating != null ? Math.round((averageRating / 5) * 55) : 0;
  const volumeScore = Math.min(25, reviewCount * 2);
  const responseScore = Math.round(responseRate * 20);
  const score = Math.min(100, ratingScore + volumeScore + responseScore);

  return {
    score,
    averageRating: averageRating != null ? Math.round(averageRating * 10) / 10 : null,
    reviewCount,
    responseRate: Math.round(responseRate * 100),
    volumeScore,
    ratingScore,
    responseScore,
    note:
      reviewCount === 0
        ? "No published reviews in connected feeds yet — score stays low until sources return data."
        : "Stub formula: rating quality (55) + volume (25) + response rate (20). Scoring Engine will own the™ formula later.",
  };
}

/** Draft an on-brand public reply for a single review (LLM when configured). */
export async function draftReviewReply(input: {
  review: ReviewFeedItem;
  businessName?: string | null;
}): Promise<{ draft: string; source: "llm" | "stub"; provider?: string; model?: string }> {
  const name = input.businessName?.trim() || "our team";
  const author = input.review.authorName?.trim() || "there";
  const rating = input.review.rating;
  const stub =
    rating != null && rating <= 3
      ? `Hi ${author}, thank you for sharing this with ${name}. We're sorry the experience fell short — please reply so we can make it right.`
      : `Hi ${author}, thank you for your kind words. We're glad you enjoyed your stay with ${name}, and we hope to welcome you again soon.`;

  if (!llmConfigured()) {
    return { draft: stub, source: "stub" };
  }

  try {
    const result = await llmChat({
      maxTokens: 280,
      messages: [
        {
          role: "system",
          content: [
            "You draft short public review replies for an Australian hospitality or property business.",
            "Australian English. Warm, professional, no emojis. Max 80 words.",
            "Do not invent facts not in the review. Do not offer refunds unless the review clearly asks.",
            "Return plain text only — no markdown or quotes around the reply.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Business: ${name}`,
            `Reviewer: ${author}`,
            `Rating: ${rating ?? "n/a"}`,
            `Title: ${input.review.title ?? ""}`,
            `Review: ${input.review.content ?? ""}`,
          ].join("\n"),
        },
      ],
    });
    const draft = result.text.replace(/^["']|["']$/g, "").trim() || stub;
    return { draft, source: "llm", provider: result.provider, model: result.model };
  } catch {
    return { draft: stub, source: "stub" };
  }
}

export type ReviewTheme = {
  theme: string;
  sentiment: "positive" | "negative" | "mixed" | "neutral";
  mentionShare: number;
  evidence: string[];
};

export type ReviewThemesResult = {
  themes: ReviewTheme[];
  summary: string;
  source: "llm" | "stub";
  provider?: string;
  model?: string;
};

function stubThemes(reviews: ReviewFeedItem[]): ReviewThemesResult {
  const texts = reviews
    .map((r) => [r.title, r.content].filter(Boolean).join(" ").toLowerCase())
    .filter(Boolean);

  const buckets: Array<{
    theme: string;
    sentiment: ReviewTheme["sentiment"];
    keywords: string[];
  }> = [
    {
      theme: "Communication",
      sentiment: "positive",
      keywords: ["communicat", "respond", "helpful", "friendly", "host"],
    },
    {
      theme: "Cleanliness",
      sentiment: "positive",
      keywords: ["clean", "tidy", "spotless", "hygien"],
    },
    {
      theme: "Delays / timing",
      sentiment: "negative",
      keywords: ["delay", "late", "wait", "slow", "cancel"],
    },
    {
      theme: "Value for money",
      sentiment: "mixed",
      keywords: ["value", "price", "expensive", "worth", "cheap"],
    },
    {
      theme: "Location",
      sentiment: "positive",
      keywords: ["location", "nearby", "walk", "close to", "convenient"],
    },
  ];

  const total = texts.length || 1;
  const themes: ReviewTheme[] = buckets
    .map((b) => {
      const hits = texts.filter((t) => b.keywords.some((k) => t.includes(k)));
      return {
        theme: b.theme,
        sentiment: b.sentiment,
        mentionShare: Math.round((hits.length / total) * 100),
        evidence: hits.slice(0, 2).map((t) => t.slice(0, 120)),
      };
    })
    .filter((t) => t.mentionShare > 0)
    .sort((a, b) => b.mentionShare - a.mentionShare)
    .slice(0, 5);

  if (!themes.length) {
    return {
      themes: [
        {
          theme: "Insufficient text",
          sentiment: "neutral",
          mentionShare: 0,
          evidence: [],
        },
      ],
      summary:
        "Not enough review text to extract themes. Connect a feed or import reviews, then re-run.",
      source: "stub",
    };
  }

  const top = themes[0]!;
  return {
    themes,
    summary: `Top theme: ${top.theme} (~${top.mentionShare}% of recent reviews). Stub keyword extraction — enable OPENAI_API_KEY / ANTHROPIC_API_KEY for LLM themes.`,
    source: "stub",
  };
}

/** AI theme extraction — LLM when keyed, keyword stub otherwise. */
export async function extractReviewThemes(
  reviews: ReviewFeedItem[],
): Promise<ReviewThemesResult> {
  const stub = stubThemes(reviews);
  if (!llmConfigured() || reviews.length === 0) return stub;

  const sample = reviews
    .slice(0, 25)
    .map((r, i) => {
      const stars = r.rating != null ? `${r.rating}★` : "n/a";
      const body = [r.title, r.content].filter(Boolean).join(" — ").slice(0, 280);
      return `${i + 1}. [${stars}] ${r.authorName ?? "Guest"}: ${body || "(no text)"}`;
    })
    .join("\n");

  try {
    const result = await llmChat({
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content: [
            "You extract reputation themes from guest/customer reviews for an Australian business.",
            "Return ONLY valid JSON: {\"summary\": string, \"themes\": [{\"theme\": string, \"sentiment\": \"positive\"|\"negative\"|\"mixed\"|\"neutral\", \"mentionShare\": number, \"evidence\": string[]}]}",
            "mentionShare is 0–100 estimated share of reviews mentioning the theme.",
            "Max 5 themes. Australian English. Do not invent quotes not grounded in the reviews.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Extract themes from these reviews:\n\n${sample}`,
        },
      ],
    });

    const parsed = JSON.parse(result.text.replace(/```json|```/g, "").trim()) as {
      summary?: string;
      themes?: ReviewTheme[];
    };

    if (!parsed.themes?.length) return stub;

    return {
      themes: parsed.themes.slice(0, 5).map((t) => ({
        theme: String(t.theme),
        sentiment: (["positive", "negative", "mixed", "neutral"].includes(t.sentiment)
          ? t.sentiment
          : "neutral") as ReviewTheme["sentiment"],
        mentionShare: Math.max(0, Math.min(100, Number(t.mentionShare) || 0)),
        evidence: Array.isArray(t.evidence)
          ? t.evidence.map(String).slice(0, 3)
          : [],
      })),
      summary: parsed.summary?.trim() || stub.summary,
      source: "llm",
      provider: result.provider,
      model: result.model,
    };
  } catch {
    return stub;
  }
}

export type ReviewRequestCandidate = {
  id: string;
  kind: "stay" | "settlement";
  contactId?: string | null;
  label: string;
  completedAt?: string | null;
  detail?: string | null;
};

function isCompletedStayStatus(status: string) {
  const s = status.toLowerCase();
  return (
    s.includes("complete") ||
    s.includes("checked_out") ||
    s.includes("checked-out") ||
    s === "past" ||
    s === "departed"
  );
}

/** Candidates for review requests after completed stay / settlement. */
export async function listReviewRequestCandidates(
  organisationId: string,
): Promise<ReviewRequestCandidate[]> {
  const candidates: ReviewRequestCandidate[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const stays = await listStayBookings(organisationId, 80);
    for (const stay of stays) {
      const checkout = stay.checkout ? new Date(`${stay.checkout}T00:00:00`) : null;
      const completed =
        isCompletedStayStatus(stay.status) ||
        (checkout != null && !Number.isNaN(checkout.getTime()) && checkout < today);
      if (!completed) continue;
      candidates.push({
        id: `stay:${stay.id}`,
        kind: "stay",
        contactId: stay.contactId,
        label: stay.guestName || stay.ref || "Guest stay",
        completedAt: stay.checkout ?? stay.updatedAt,
        detail: [stay.accommodationName, stay.ref, stay.status].filter(Boolean).join(" · "),
      });
    }
  } catch {
    /* DB optional in some envs */
  }

  try {
    const settlements = await listSettlementProperties(organisationId);
    for (const prop of settlements) {
      const checklist = prop.checklist ?? {};
      const ready =
        prop.status === "sold" ||
        checklist.past_client_followup === true ||
        checklist.keys_handover === true;
      if (!ready) continue;
      candidates.push({
        id: `settlement:${prop.id}`,
        kind: "settlement",
        contactId: null,
        label: prop.address || "Settled property",
        completedAt: prop.updatedAt,
        detail: ["RE settlement", prop.status, prop.leadTitle].filter(Boolean).join(" · "),
      });
    }
  } catch {
    /* optional */
  }

  return candidates.slice(0, 40);
}

export async function queueReviewRequest(input: {
  organisationId: string;
  actorId?: string;
  candidateId: string;
  contactId?: string | null;
  channel?: "email" | "sms" | "manual";
  note?: string;
}) {
  const channel = input.channel ?? "email";
  const entityType = input.contactId ? "Contact" : "Organisation";
  const entityId = input.contactId ?? input.organisationId;

  const activity = await createActivity({
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType,
    entityId,
    activityType: "review_request",
    title: "Review request queued",
    body:
      input.note?.trim() ||
      `Ask for a review via ${channel} after completed stay/job (${input.candidateId}).`,
    sourceApp: "reviews",
    metadata: {
      candidateId: input.candidateId,
      channel,
      status: "queued",
      delivery: "stub",
    },
  });

  await platformEvents.publish({
    type: "review.request_queued",
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType,
    entityId,
    payload: {
      candidateId: input.candidateId,
      channel,
      contactId: input.contactId ?? null,
    },
    occurredAt: new Date(),
  });

  return {
    ok: true as const,
    activity,
    note: "Queued on Contact/Organisation timeline. SMS/email delivery wires via Communications later.",
  };
}

export function mapWpAccReviewsToFeed(
  reviews: Array<{
    id: number;
    platform?: string;
    platform_label?: string;
    author_name?: string;
    rating?: number;
    title?: string;
    content?: string;
    review_date?: string | null;
    source_url?: string;
    listing_id?: string;
  }>,
): ReviewFeedItem[] {
  return reviews.map((r) => ({
    id: `acc:${r.id}`,
    source: r.platform_label ?? r.platform ?? "accommodation",
    authorName: r.author_name ?? null,
    rating: r.rating ?? null,
    title: r.title ?? null,
    content: r.content ?? null,
    reviewDate: r.review_date ?? null,
    sourceUrl: r.source_url ?? null,
    listingId: r.listing_id ?? null,
    responded: false,
  }));
}
