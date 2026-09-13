function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function getCurrentAiVisibilityIntelligenceSnapshot(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const [activePrompts, activeCompetitors] = await Promise.all([
    prisma.aiVisibilityPrompt.findMany({
      where: { organisationId, status: "active" },
      select: { id: true },
    }),
    prisma.aiVisibilityCompetitor.count({
      where: { organisationId, status: "active" },
    }),
  ]);

  const promptIds = activePrompts.map((item) => item.id);
  const allObservations = promptIds.length
    ? await prisma.aiVisibilityObservation.findMany({
        where: {
          organisationId,
          promptId: { in: promptIds },
        },
        orderBy: [{ observedAt: "desc" }, { createdAt: "desc" }],
        take: 1000,
        include: { competitorMentions: true, citations: true },
      })
    : [];

  const seen = new Set<string>();
  const observations = allObservations.filter((row) => {
    const key = `${row.promptId}::${row.engine}::${row.engineModel ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const latest = observations[0]?.observedAt.toISOString() ?? null;
  const total = observations.length;
  const mentioned = observations.filter((row) => row.brandMentioned).length;
  const citationComplete = observations.filter((row) => row.citationCaptureComplete === true);
  const competitorComplete = observations.filter((row) => row.competitorCaptureComplete === true);
  const ownCitationObservations = citationComplete.filter((row) =>
    row.citations.some((citation) => citation.sourceType === "own"),
  ).length;
  const thirdPartyCitations = citationComplete.flatMap((row) =>
    row.citations.filter((citation) => citation.sourceType === "third_party"),
  );
  const competitorMentions = competitorComplete.flatMap((row) => row.competitorMentions);

  const presenceValue = total ? clamp((mentioned / total) * 100) : null;
  const citationValue = citationComplete.length
    ? clamp((ownCitationObservations / citationComplete.length) * 100)
    : null;
  const competitiveValue = competitorComplete.length
    ? clamp(
        (mentioned /
          Math.max(1, mentioned + competitorMentions.filter((row) => row.mentioned).length)) *
          100,
      )
    : null;
  const authorityValue = thirdPartyCitations.length
    ? clamp(
        (new Set(thirdPartyCitations.map((row) => row.sourceDomain)).size /
          thirdPartyCitations.length) *
          100,
      )
    : null;

  const dimensions = [
    {
      id: "ai_presence" as const,
      label: "AI Presence",
      value: presenceValue,
      available: presenceValue != null,
      evidenceCount: total,
      coverage: total
        ? `${total} current prompt/model observation${total === 1 ? "" : "s"}`
        : "No current monitored evidence yet",
      explanation: total
        ? "Share of the latest observation for each active prompt and provider/model combination where the organisation was explicitly mentioned."
        : "Requires current persisted model observations before a score is available.",
      lastUpdated: latest,
      evidenceSource: "Latest persisted model observations",
    },
    {
      id: "authority" as const,
      label: "Authority",
      value: authorityValue,
      available: authorityValue != null,
      evidenceCount: thirdPartyCitations.length,
      coverage: thirdPartyCitations.length
        ? `${thirdPartyCitations.length} current third-party citation${thirdPartyCitations.length === 1 ? "" : "s"}`
        : "No verified current third-party citation evidence yet",
      explanation: authorityValue != null
        ? "Evidence diversity across third-party domains cited in the current monitored evidence set."
        : "Unavailable until citation capture produces real third-party source evidence.",
      lastUpdated: latest,
      evidenceSource: "Latest persisted citation observations",
    },
    {
      id: "citation_strength" as const,
      label: "Citation Strength",
      value: citationValue,
      available: citationValue != null,
      evidenceCount: citationComplete.length,
      coverage: citationComplete.length
        ? `${citationComplete.length} current response${citationComplete.length === 1 ? "" : "s"} with complete citation capture`
        : "Citation capture not yet established",
      explanation: citationValue != null
        ? "Share of the current completely captured responses that cited the organisation's own domain."
        : "Unavailable until a monitoring source confirms citation capture completeness.",
      lastUpdated: latest,
      evidenceSource: "Latest persisted citation observations",
    },
    {
      id: "competitive_share" as const,
      label: "Competitive Share",
      value: competitiveValue,
      available: competitiveValue != null,
      evidenceCount: competitorComplete.length,
      coverage: competitorComplete.length
        ? `${competitorComplete.length} current response${competitorComplete.length === 1 ? "" : "s"} with complete competitor capture`
        : "Competitor capture not yet established",
      explanation: competitiveValue != null
        ? "Current organisation mentions compared with configured competitor mentions where competitor capture is complete."
        : "Unavailable until competitors are configured and monitoring confirms competitor capture completeness.",
      lastUpdated: latest,
      evidenceSource: "Latest persisted competitor observations",
    },
  ];

  const availableValues = dimensions.flatMap((dimension) =>
    dimension.value == null ? [] : [dimension.value],
  );

  return {
    overallScore: availableValues.length
      ? clamp(availableValues.reduce((sum, value) => sum + value, 0) / availableValues.length)
      : null,
    dimensions,
    evidenceCoverage: {
      activePrompts: activePrompts.length,
      activeCompetitors,
      observations: total,
      citationCompleteObservations: citationComplete.length,
      competitorCompleteObservations: competitorComplete.length,
      methodology: "latest_per_active_prompt_provider_model" as const,
    },
    lastObservedAt: latest,
  };
}
