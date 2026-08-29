/**
 * Customer-facing Prospect Pipeline workspace stages.
 * Maps Growth Engine internal stages onto a clearer operator funnel.
 *
 * Discovery finds them → Pipeline manages them → Score ranks them → CRM converts.
 */

import type { ProspectPipelineStage } from "../command-centre/growth-engine/types";

export type ProspectWorkspaceStageId =
  | "discovered"
  | "researching"
  | "qualified"
  | "contacted"
  | "engaged"
  | "converted"
  | "lost";

export type ProspectWorkspaceStageDef = {
  id: ProspectWorkspaceStageId;
  label: string;
  /** Compact table CTA when the stage has prospects */
  actionLabel: string;
  /** Underlying Growth Engine stages that roll into this column */
  sourceStages: ProspectPipelineStage[];
  description: string;
};

/** Ordered Prospect Pipeline columns for the Growth App workspace. */
export const PROSPECT_WORKSPACE_STAGES: ProspectWorkspaceStageDef[] = [
  {
    id: "discovered",
    label: "Discovered",
    actionLabel: "Review",
    sourceStages: ["prospect"],
    description: "Imported or added — not yet researched.",
  },
  {
    id: "researching",
    label: "Researching",
    actionLabel: "Enrich",
    sourceStages: ["audit_created"],
    description: "Presence audit / enrichment in progress.",
  },
  {
    id: "qualified",
    label: "Qualified",
    actionLabel: "Contact",
    sourceStages: ["report_sent", "email_opened"],
    description: "Worth pursuing — ready for outreach.",
  },
  {
    id: "contacted",
    label: "Contacted",
    actionLabel: "Follow up",
    sourceStages: ["report_viewed", "follow_up_due"],
    description: "Outreach started — keep the conversation warm.",
  },
  {
    id: "engaged",
    label: "Engaged",
    actionLabel: "Advance",
    sourceStages: ["meeting_booked", "proposal_sent"],
    description: "Meeting or proposal in play.",
  },
  {
    id: "converted",
    label: "Converted",
    actionLabel: "CRM",
    sourceStages: ["won", "onboarding"],
    description: "Promoted into CRM as a relationship.",
  },
  {
    id: "lost",
    label: "Lost",
    actionLabel: "View",
    sourceStages: ["lost"],
    description: "Closed without conversion.",
  },
];

const SOURCE_TO_WORKSPACE: Record<string, ProspectWorkspaceStageId> = (() => {
  const map: Record<string, ProspectWorkspaceStageId> = {};
  for (const stage of PROSPECT_WORKSPACE_STAGES) {
    for (const src of stage.sourceStages) {
      map[src] = stage.id;
    }
  }
  return map;
})();

export function workspaceStageForProspectStage(
  stage: ProspectPipelineStage | string,
): ProspectWorkspaceStageId {
  return SOURCE_TO_WORKSPACE[stage] ?? "discovered";
}

export function workspaceStageDef(
  id: ProspectWorkspaceStageId,
): ProspectWorkspaceStageDef {
  return (
    PROSPECT_WORKSPACE_STAGES.find((s) => s.id === id) ?? PROSPECT_WORKSPACE_STAGES[0]!
  );
}
