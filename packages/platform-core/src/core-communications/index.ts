export type {
  CommunicationChannel as OrgCommunicationChannel,
  CommunicationDirection as OrgCommunicationDirection,
  CommunicationSource,
  CommunicationStatus,
  PlatformCommunication,
} from "./types";
export {
  listOrgCommunications,
  getOrgCommunication,
  createOrgCommunication,
  summarizeOrgCommunications,
  recordOutboundEmail,
  scheduleOutboundEmail,
  processDueScheduledEmails,
  toPlatformCommunication,
} from "./service";
export type {
  ListOrgCommunicationsInput,
  CreateOrgCommunicationInput,
} from "./service";
