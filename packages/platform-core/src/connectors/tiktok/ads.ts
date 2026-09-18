import { decryptSecret, encryptSecret } from "../../crypto/secret-field";
import { clearOrgConnectorSettings, getOrgConnectorSettings, saveOrgConnectorSettings } from "../framework/store";

export const TIKTOK_ADS_CONNECTOR_ID="tiktok-ads";
const REDIRECT_DEFAULT="https://app.digitalgate.com.au/api/connectors/tiktok-ads/callback";
export type TikTokAdsAccount={advertiserId:string;name?:string;currency?:string;timezone?:string};
export type OrgTikTokAdsConnectorTokens={accessToken?:string;refreshToken?:string;expiresAt?:string;scope?:string;connectedAt?:string;selectedAdvertiserIds?:string[];accounts?:TikTokAdsAccount[];lastError?:string};

export function tiktokAdsCredentialsConfigured(){return Boolean(process.env.TIKTOK_ADS_APP_ID?.trim()&&process.env.TIKTOK_ADS_APP_SECRET?.trim())}
export function tiktokAdsRedirectUri(){return process.env.TIKTOK_ADS_REDIRECT_URI?.trim()||REDIRECT_DEFAULT}
function enc(v?:string){return v?encryptSecret(v):v}function dec(v?:string){return v?(decryptSecret(v)||v):v}
export async function getOrgTikTokAdsTokens(org:string):Promise<OrgTikTokAdsConnectorTokens|null>{const b=await getOrgConnectorSettings(org,TIKTOK_ADS_CONNECTOR_ID);if(!b)return null;return {accessToken:dec(typeof b.accessToken==="string"?b.accessToken:undefined),refreshToken:dec(typeof b.refreshToken==="string"?b.refreshToken:undefined),expiresAt:typeof b.expiresAt==="string"?b.expiresAt:undefined,scope:typeof b.scope==="string"?b.scope:undefined,connectedAt:typeof b.connectedAt==="string"?b.connectedAt:undefined,selectedAdvertiserIds:Array.isArray(b.selectedAdvertiserIds)?b.selectedAdvertiserIds.filter((x):x is string=>typeof x==="string"):[],accounts:Array.isArray(b.accounts)?b.accounts as TikTokAdsAccount[]:[],lastError:typeof b.lastError==="string"?b.lastError:undefined}}
export async function saveOrgTikTokAdsTokens(org:string,t:OrgTikTokAdsConnectorTokens){await saveOrgConnectorSettings(org,TIKTOK_ADS_CONNECTOR_ID,{...t,accessToken:enc(t.accessToken),refreshToken:enc(t.refreshToken)})}
export async function clearOrgTikTokAdsTokens(org:string){await clearOrgConnectorSettings(org,TIKTOK_ADS_CONNECTOR_ID)}
