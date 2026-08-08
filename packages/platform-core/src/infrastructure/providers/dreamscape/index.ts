export {

  DREAMSCAPE_DEFAULT_RESELLER_ID_HEADER,

  DREAMSCAPE_RESELLER_ID_HEADERS,

  buildDreamscapeAuthHeaders,

  dreamscapeAuthHeaders,

  dreamscapeRequestId,

  dreamscapeSignature,

  type DreamscapeAuthHeaderOptions,

  type DreamscapeAuthHeadersResult,

} from "./auth";

export {

  DREAMSCAPE_PROD_BASE_URL,

  DREAMSCAPE_SANDBOX_BASE_URL,

  DreamscapeApiError,

  describeDreamscapeAuthFailure,

  dreamscapeEnvPresence,

  dreamscapeFetch,

  isDreamscapeApiKeyFormatValid,

  isDreamscapeConfigured,

  normalizeDreamscapeApiKey,

  normalizeDreamscapeResellerId,

  resetDreamscapeProxyDispatcherCache,

  resolveDreamscapeApiMode,

  resolveDreamscapeConfig,

  resolveDreamscapeHttpsProxy,

  resolveDreamscapeResellerIdHeader,

  resolveDreamscapeSoapEndpoint,

  sanitizeDreamscapeBodySnippet,

  serializeDreamscapeSearchParams,

  shouldSendDreamscapeResellerId,

  soapHostFromEndpoint,

  parseDreamscapeSoapEnv,

  type DreamscapeApiMode,

  type DreamscapeEnvPresence,

  type DreamscapeRequestDebug,

  type DreamscapeSoapEnv,

} from "./client";

export {

  DreamscapeDomainProvider,

  DreamscapeProvider,

} from "./domain-provider";

export {

  DREAMSCAPE_SOAP_DOMAIN_CHECK_ACTION,

  DREAMSCAPE_SOAP_GET_BALANCE_ACTION,

  DREAMSCAPE_SOAP_NS,

  DREAMSCAPE_SOAP_PROD_ENDPOINT,

  DREAMSCAPE_SOAP_PROD_WSDL,

  DREAMSCAPE_SOAP_SANDBOX_ENDPOINT,

  DREAMSCAPE_SOAP_SANDBOX_WSDL,

  DreamscapeSoapError,

  buildDomainCheckEnvelope,

  buildGetBalanceEnvelope,

  dreamscapeSoapDomainCheck,

  dreamscapeSoapGetBalance,

  parseDomainCheckResponse,

  type DreamscapeSoapAvailabilityItem,

} from "./soap";

export {

  DREAMSCAPE_WEBHOOK_PATH,

  clearDreamscapeWebhookEvents,

  dreamscapeNotificationUrl,

  extractDreamscapeWebhookSecret,

  handleDreamscapeWebhookPayload,

  isDreamscapeWebhookConfigured,

  listDreamscapeWebhookEvents,

  resolveDreamscapeWebhookSecret,

  verifyDreamscapeWebhookRequest,

  type DreamscapeWebhookEventKind,

  type DreamscapeWebhookEventStub,

  type HandleDreamscapeWebhookResult,

} from "./webhooks";

