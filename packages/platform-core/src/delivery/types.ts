import type {
  DeliveryBlockerStatus,
  DeliveryMilestoneStatus,
  DeliveryProjectHealth,
  DeliveryTaskStatus,
  ImplementationPlan,
} from "../partners/delivery-workspace";

export type DeliveryProjectRecord = {
  id: string;
  referenceCode: string;
  customerOrganisationId: string;
  customerName: string;
  status: string;
  statusLabel: string;
  health: DeliveryProjectHealth;
  plan: ImplementationPlan;
  planLabel: string;
  ownerPartnerId: string | null;
  ownerName: string | null;
  deliveryLeadPartnerId: string | null;
  deliveryLeadName: string | null;
  targetGoLiveAt: string | null;
  apps: string[];
  nextAction: string | null;
  nextActionDueAt: string | null;
  opportunityId: string | null;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
};

export type DeliveryMilestoneRecord = {
  id: string;
  projectId: string;
  stageId: string;
  title: string;
  sortOrder: number;
  status: DeliveryMilestoneStatus;
  completedAt: string | null;
};

export type DeliveryTaskRecord = {
  id: string;
  projectId: string;
  projectReference: string;
  customerName: string;
  title: string;
  description: string | null;
  status: DeliveryTaskStatus;
  dueAt: string | null;
  assigneePartnerId: string | null;
  assigneeName: string | null;
  overdue: boolean;
};

export type DeliveryBlockerRecord = {
  id: string;
  projectId: string;
  description: string;
  status: DeliveryBlockerStatus;
  createdAt: string;
};

export type DeliveryProjectDetail = DeliveryProjectRecord & {
  milestones: DeliveryMilestoneRecord[];
  tasks: DeliveryTaskRecord[];
  blockers: DeliveryBlockerRecord[];
};

export type DeliveryDashboardMetrics = {
  activeImplementations: number;
  onTrack: number;
  atRisk: number;
  blocked: number;
  goLivesThisMonth: number;
  averageImplementationDays: number | null;
  overdueTasks: number;
  customersAwaitingInformation: number;
  tasksDueToday: number;
};

export type CommandCentreDeliveryAlert = {
  id: string;
  severity: "critical" | "warning" | "success" | "info";
  message: string;
  href: string;
};

export type CreateDeliveryProjectInput = {
  customerOrganisationId: string;
  customerName: string;
  plan?: ImplementationPlan;
  deliveryLeadPartnerId?: string;
  ownerPartnerId?: string;
  targetGoLiveAt?: Date;
  apps?: string[];
  opportunityId?: string;
};
