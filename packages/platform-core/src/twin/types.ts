/**
 * Digital Twin™ — complete digital state of an organisation.
 * Every score, recommendation, report, and AI insight is generated from the Twin.
 */

export interface DigitalTwinBrand {
  name: string;
  tagline?: string;
  colours?: string[];
  logoAssetId?: string;
}

export interface DigitalTwinScores {
  aiVisibility?: number;
  seo?: number;
  websiteHealth?: number;
  businessGrowth?: number;
  businessHealth?: number;
  reputation?: number;
  automation?: number;
  calculatedAt?: Date;
}

export interface DigitalTwinSnapshot {
  organisationId: string;
  version: number;
  capturedAt: Date;

  brand: DigitalTwinBrand;
  scores: DigitalTwinScores;

  /** Counts and health indicators */
  metrics: {
    contactCount?: number;
    activeLeads?: number;
    pipelineValue?: number;
    openTasks?: number;
    connectedConnectors?: number;
    pendingAutomations?: number;
    unrepliedReviews?: number;
    openOpportunities?: number;
    consultations?: number;
    newEnquiriesThisWeek?: number;
    /** Commerce / Financial Health (Digital Twin™) */
    revenueMtdCents?: number;
    outstandingArCents?: number;
    overdueArCents?: number;
    mrrCents?: number;
    avgPaymentDays?: number;
    failedPayments30d?: number;
    refundRate?: number;
  };

  /** Connected system IDs */
  connectors: string[];
  domains: string[];
  websites: string[];

  /** Reference to knowledge graph snapshot */
  graphSnapshotId?: string;
}
