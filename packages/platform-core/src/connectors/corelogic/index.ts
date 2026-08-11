export {
  CORELOGIC_DEFAULT_CLIENT_NAME,
  CORELOGIC_DEFAULT_SEARCH_BASE,
  CORELOGIC_DEFAULT_TOKEN_URL,
  clearCoreLogicTokenCache,
  coreLogicApiGet,
  coreLogicCredentialsConfigured,
  ensureCoreLogicAccessToken,
  fetchCoreLogicClientCredentialsToken,
  getCoreLogicOAuthConfig,
  probeCoreLogicConnection,
  type CoreLogicOAuthConfig,
  type CoreLogicTokenBundle,
  type CoreLogicTokenResponse,
} from "./auth";

export {
  coreLogicMatchToAddressMetadata,
  isCoreLogicPropertyMatch,
  matchCoreLogicAddress,
  parseCoreLogicAddressMatchResponse,
  type CoreLogicAddressMatchOptions,
  type CoreLogicAddressMatchResult,
  type CoreLogicMatchType,
} from "./address-match";
