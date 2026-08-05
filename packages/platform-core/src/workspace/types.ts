/**
 * Workspace layer — optional subdivision beneath Organisation.
 * Examples: Sales, Marketing, Finance, Operations, Support.
 */

export interface WorkspaceDefinition {
  id: string;
  organisationId: string;
  name: string;
  slug: string;
  description?: string;
}

export interface WorkspaceScope {
  workspaceId: string;
  dashboardIds?: string[];
  appIds?: string[];
  teamMemberIds?: string[];
  permissionOverrides?: string[];
}
