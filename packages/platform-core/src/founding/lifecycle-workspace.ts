/**
 * Founding Customer Lifecycle workspace — operator cockpit data for /command/founding.
 * Founding Customer record (founding_10 opportunity) is the source of truth for cohort progression.
 */

import { listOpportunities } from "../opportunities";
import {
  FOUNDING_LIFECYCLE_PHASES,
  FOUNDING_STAGE_CARD_ACTION,
  FOUNDING_STAGE_EMPTY_HINT,
  FOUNDING_STAGE_LABELS,
  FOUNDING_STAGE_NEXT_ACTION,
  FOUNDING_STAGES,
  foundingStageIndex,
  isFoundingCohortSeat,
  normaliseFoundingStage,
  type FoundingStage,
} from "./pipeline";
import { getFoundingCohortSummary, type FoundingCohortSummary } from "./invitations";
import type { FoundingOpportunityMeta } from "./types";

export type FoundingLifecycleCustomer = {
  id: string;
  title: string;
  contactName: string | null;
  businessName: string | null;
  stage: FoundingStage;
  stageLabel: string;
  nextAction: string;
  updatedAt: string;
  invitationSentAt: string | null;
  inviteToken: string | null;
  invitationStatus: string | null;
  isSeat: boolean;
  health: "green" | "amber" | "none";
};

export type FoundingAttentionItem = {
  id: string;
  label: string;
  count: number;
  detail: string | null;
  href: string | null;
};

export type FoundingLifecycleStageBucket = {
  stage: FoundingStage;
  label: string;
  rule: string;
  emptyHint: string;
  customers: FoundingLifecycleCustomer[];
};

export type FoundingLifecyclePhase = {
  id: string;
  number: string;
  title: string;
  stages: FoundingLifecycleStageBucket[];
  count: number;
};

export type FoundingLifecycleWorkspace = {
  cohort: FoundingCohortSummary;
  attention: FoundingAttentionItem[];
  phases: FoundingLifecyclePhase[];
  cohortTable: FoundingLifecycleCustomer[];
};

function asMeta(raw: Record<string, unknown> | null): FoundingOpportunityMeta {
  return (raw ?? {}) as FoundingOpportunityMeta;
}

function displayName(title: string, meta: FoundingOpportunityMeta) {
  const business = meta.business_name?.trim() || null;
  // Titles are often "Name — Business"
  const parts = title.split(/\s+[—–-]\s+/);
  const contactName = parts.length > 1 ? parts[0]!.trim() : null;
  return {
    contactName,
    businessName: business || (parts.length > 1 ? parts[1]!.trim() : null),
  };
}

function healthFor(stage: FoundingStage): "green" | "amber" | "none" {
  if (stage === "go_live" || stage === "thirty_day_review") return "green";
  if (
    stage === "configuration" ||
    stage === "implementation" ||
    stage === "onboarding_started" ||
    stage === "agreement_sent"
  ) {
    return "amber";
  }
  return "none";
}

function toCustomer(item: {
  id: string;
  title: string;
  stage: string;
  status: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}): FoundingLifecycleCustomer {
  const stage = normaliseFoundingStage(item.stage);
  const meta = asMeta(item.metadata);
  const { contactName, businessName } = displayName(item.title, meta);
  return {
    id: item.id,
    title: item.title,
    contactName,
    businessName,
    stage,
    stageLabel: FOUNDING_STAGE_LABELS[stage],
    nextAction: FOUNDING_STAGE_CARD_ACTION[stage],
    updatedAt: item.updatedAt,
    invitationSentAt: meta.founding_invitation_sent_at ?? null,
    inviteToken: meta.founding_invite_token ?? null,
    invitationStatus: meta.founding_invitation_status ?? null,
    isSeat: isFoundingCohortSeat(stage, item.status),
    health: healthFor(stage),
  };
}

export async function buildFoundingLifecycleWorkspace(
  organisationId: string,
): Promise<FoundingLifecycleWorkspace> {
  const [{ items }, cohort] = await Promise.all([
    listOpportunities({
      organisationId,
      pipelineId: "founding_10",
      limit: 100,
    }),
    getFoundingCohortSummary(organisationId),
  ]);

  const active = items
    .filter((item) => {
      const meta = asMeta(item.metadata);
      return item.status !== "lost" && meta.founding_invitation_status !== "withdrawn";
    })
    .map(toCustomer);

  const byStage = new Map<FoundingStage, FoundingLifecycleCustomer[]>();
  for (const stage of FOUNDING_STAGES) byStage.set(stage, []);
  for (const customer of active) {
    byStage.get(customer.stage)!.push(customer);
  }

  const phases: FoundingLifecyclePhase[] = FOUNDING_LIFECYCLE_PHASES.map((phase) => {
    const stages: FoundingLifecycleStageBucket[] = phase.stages.map((stage) => ({
      stage,
      label: FOUNDING_STAGE_LABELS[stage],
      rule: FOUNDING_STAGE_NEXT_ACTION[stage],
      emptyHint: FOUNDING_STAGE_EMPTY_HINT[stage],
      customers: byStage.get(stage) ?? [],
    }));
    return {
      id: phase.id,
      number: phase.number,
      title: phase.title,
      stages,
      count: stages.reduce((n, s) => n + s.customers.length, 0),
    };
  });

  const pick = (stage: FoundingStage) => byStage.get(stage) ?? [];
  const invitedAwaiting = pick("invited");
  const applications = pick("application_received");
  const discoveries = [...pick("discovery_booked"), ...pick("invitation_accepted")];
  const agreements = pick("agreement_sent");
  const onboardingStalls = pick("onboarding_started");
  const implementations = [...pick("configuration"), ...pick("implementation")];

  const attention: FoundingAttentionItem[] = [
    {
      id: "invites",
      label: "Invitation awaiting acceptance",
      count: invitedAwaiting.length,
      detail: invitedAwaiting[0]
        ? `${invitedAwaiting[0].contactName ?? invitedAwaiting[0].title}${
            invitedAwaiting[0].businessName ? ` · ${invitedAwaiting[0].businessName}` : ""
          }`
        : null,
      href: invitedAwaiting[0] ? `/apps/crm/opportunities/${invitedAwaiting[0].id}` : null,
    },
    {
      id: "applications",
      label: "Applications to review",
      count: applications.length,
      detail: applications[0]?.title ?? null,
      href: applications[0] ? `/apps/crm/opportunities/${applications[0].id}` : null,
    },
    {
      id: "discoveries",
      label: "Discoveries to complete",
      count: discoveries.length,
      detail: discoveries[0]?.title ?? null,
      href: discoveries[0] ? `/apps/crm/opportunities/${discoveries[0].id}` : null,
    },
    {
      id: "agreements",
      label: "Agreements awaiting signature",
      count: agreements.length,
      detail: agreements[0]?.title ?? null,
      href: agreements[0] ? `/apps/crm/opportunities/${agreements[0].id}` : null,
    },
    {
      id: "onboarding",
      label: "Onboarding stalls",
      count: onboardingStalls.length,
      detail: onboardingStalls[0]?.title ?? null,
      href: onboardingStalls[0] ? `/apps/crm/opportunities/${onboardingStalls[0].id}` : null,
    },
    {
      id: "implementation",
      label: "Implementations requiring intervention",
      count: implementations.length,
      detail: implementations[0]?.title ?? null,
      href: implementations[0] ? `/apps/crm/opportunities/${implementations[0].id}` : null,
    },
  ];

  const cohortTable = [...active].sort(
    (a, b) => foundingStageIndex(b.stage) - foundingStageIndex(a.stage),
  );

  return { cohort, attention, phases, cohortTable };
}
