import type { FoundingStage } from "./pipeline";

export const FOUNDING_ONBOARDING_STEPS = [
  "business_profile",
  "people_team",
  "customers_contacts",
  "current_systems",
  "digital_presence",
  "apps",
  "goals",
  "processes",
  "ai_automation",
  "data_migration",
  "integrations",
  "go_live",
] as const;

export type FoundingOnboardingStep = (typeof FOUNDING_ONBOARDING_STEPS)[number];

export const FOUNDING_ONBOARDING_STEP_LABELS: Record<FoundingOnboardingStep, string> = {
  business_profile: "Business Profile",
  people_team: "People & Team",
  customers_contacts: "Customers & Contacts",
  current_systems: "Current Systems",
  digital_presence: "Digital Presence",
  apps: "Apps & Capabilities",
  goals: "Goals & Priorities",
  processes: "Processes & Workflows",
  ai_automation: "AI & Automation",
  data_migration: "Data & Migration",
  integrations: "Integrations & Access",
  go_live: "Go-Live Plan",
};

export type FoundingTeamMember = {
  name: string;
  email: string;
  role: string;
  department?: string;
  responsibilities?: string;
  access: "admin" | "member" | "restricted";
};

export type FoundingOnboardingAnswers = {
  legalName?: string;
  tradingName?: string;
  abn?: string;
  website?: string;
  industry?: string;
  businessType?: string;
  employeeCount?: string;
  locations?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  decisionMaker?: string;
  description?: string;
  serve?: string;
  objective?: string;
  team?: FoundingTeamMember[];
  contactSource?: string;
  contactVolume?: string;
  migrateContacts?: "yes" | "no" | "unsure";
  websitePlatform?: string;
  crmSystem?: string;
  accounting?: string;
  communication?: string[];
  marketing?: string[];
  bookings?: string;
  analytics?: string[];
  otherSystems?: string;
  googleBusiness?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  directories?: string;
  otherProfiles?: string;
  coreApps?: string[];
  infraApps?: string[];
  industryApps?: string[];
  growthApps?: string[];
  appPriorities?: string[];
  outcomes?: string[];
  success90Days?: string;
  processes?: string[];
  manualProcesses?: string;
  aiHelp?: string[];
  repetitiveTasks?: string;
  migrateEntities?: string[];
  dataLocation?: string;
  migrationNotes?: string;
  connectGoogle?: boolean;
  connectMeta?: boolean;
  connectMicrosoft?: boolean;
  connectXero?: boolean;
  connectWordpress?: boolean;
  connectShopify?: boolean;
  connectStripe?: boolean;
  otherIntegrations?: string;
  goLiveDate?: string;
  notes?: string;
};

export type FoundingOnboardingRecord = {
  version: 1;
  inviteToken?: string;
  opportunityId?: string;
  pipelineOrganisationId?: string;
  currentStep: FoundingOnboardingStep;
  completedSteps: FoundingOnboardingStep[];
  answers: FoundingOnboardingAnswers;
  agreementSignedAt?: string;
  startedAt?: string;
  submittedAt?: string;
  updatedAt: string;
};

export type FoundingImplementationStatus =
  | "received"
  | "in_progress"
  | "configuration"
  | "go_live_pending"
  | "live"
  | "review";

export type FoundingImplementationRecord = {
  version: 1;
  customerOrganisationId: string;
  opportunityId?: string;
  ownerUserId?: string;
  startDate: string;
  targetGoLive?: string;
  apps: string[];
  connectors: string[];
  migration: string[];
  goals: string[];
  successMetrics: string[];
  risks: string[];
  priorities: string[];
  recommendedCore: string[];
  recommendedGrowth: string[];
  recommendedIndustry: string[];
  /** Optional LLM overlay — never required for submit. */
  analysis?: string;
  firstAutomation?: string;
  analysisSource?: "llm" | "rules";
  analysisProvider?: string;
  analysisModel?: string;
  status: FoundingImplementationStatus;
  submittedAt: string;
  updatedAt: string;
};

export type FoundingStageAction =
  | "accept"
  | "send_agreement"
  | "mark_signed"
  | "invite_onboarding"
  | "advance"
  | "send_invitation"
  | "resend_invitation"
  | "mark_invitation_accepted"
  | "withdraw_invitation";

export const FOUNDING_SOURCES = [
  "public_application",
  "direct_invitation",
  "referral",
  "existing_contact",
  "partner_reseller",
] as const;

export type FoundingSource = (typeof FOUNDING_SOURCES)[number];

export const FOUNDING_ENTRY_TYPES = ["application", "personal_invitation"] as const;
export type FoundingEntryType = (typeof FOUNDING_ENTRY_TYPES)[number];

export const FOUNDING_INVITATION_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "withdrawn",
] as const;
export type FoundingInvitationStatus = (typeof FOUNDING_INVITATION_STATUSES)[number];

export const FOUNDING_SOURCE_LABELS: Record<FoundingSource, string> = {
  public_application: "Public Application",
  direct_invitation: "Direct Invitation",
  referral: "Referral",
  existing_contact: "Existing Contact",
  partner_reseller: "Partner/Reseller",
};

export const FOUNDING_ENTRY_TYPE_LABELS: Record<FoundingEntryType, string> = {
  application: "Application",
  personal_invitation: "Personal Invitation",
};

export const FOUNDING_PERSONAL_INVITE_BENEFITS = [
  "Founding Customer status — limited places, not discounted access",
  "Priority onboarding",
  "Early access to selected Apps and capabilities",
  "Direct access to me as the founder",
  "Input into product and roadmap priorities",
  "Preferential Professional Services terms where applicable",
  "Standard published Platform + Apps pricing (14-day trial; annual ≈ 10 months)",
  "Selected members may be invited into the DigitalGate Founding Acquisition Partner Programme (not automatic)",
];

export type FoundingOpportunityMeta = {
  founding_invite_token?: string;
  founding_customer_organisation_id?: string;
  founding_entry_type?: FoundingEntryType;
  founding_source?: FoundingSource;
  founding_invitation_status?: FoundingInvitationStatus;
  founding_invitation_sent_at?: string;
  founding_invitation_accepted_at?: string;
  founding_invitation_withdrawn_at?: string;
  founding_invited_by?: string;
  founding_invited_by_name?: string;
  business_name?: string;
  acceptance_email_sent_at?: string;
  agreement_email_sent_at?: string;
  onboarding_invite_sent_at?: string;
  setup_plan_email_sent_at?: string;
  agreement_signed_at?: string;
  next_action?: string;
  founding_stage?: FoundingStage;
};
