export type {
  CommunicationChannel as OrgCommunicationChannel,
  CommunicationDirection as OrgCommunicationDirection,
  CommunicationSource,
  CommunicationStatus,
  ConversationSummary,
  InboxFolderId,
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
  groupOrgCommunicationsIntoConversations,
  listCommunicationConversations,
  listOrgCommunicationsByThread,
  getConversationMessages,
} from "./service";
export type {
  ListOrgCommunicationsInput,
  ListCommunicationConversationsInput,
  CreateOrgCommunicationInput,
} from "./service";
export type {
  CommunicationSignature,
  CommunicationSignatureDraft,
  CommunicationSignaturePatch,
} from "./signatures";
export {
  listCommunicationSignatures,
  getDefaultCommunicationSignature,
  createCommunicationSignature,
  updateCommunicationSignature,
  deleteCommunicationSignature,
  appendSignatureToBody,
  htmlToPlainSignature,
  normaliseCommunicationSignatures,
} from "./signatures";
