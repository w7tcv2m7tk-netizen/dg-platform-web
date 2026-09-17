import { decryptSecret, encryptSecret } from "../../crypto/secret-field";
import { clearOrgConnectorSettings, getOrgConnectorSettings, saveOrgConnectorSettings } from "../framework/store";

export const META_CONNECTOR_ID = "meta";
const DEFAULT_REDIRECT = "https://app.digitalgate.com.au/api/connectors/meta/callback";
const DEFAULT_GRAPH_VERSION = "v23.0";
export const META_DEFAULT_OAUTH_SCOPES = ["pages_show_list", "pages_read_engagement", "instagram_basic"].join(",");

export type MetaInstagramAccount = { id: string; username?: string; name?: string; profilePictureUrl?: string };
export type MetaPage = { id: string; name: string; category?: string; accessToken?: string; instagram?: MetaInstagramAccount };
export type OrgMetaConnectorTokens = {
  accessToken?: string; expiresAt?: string; scope?: string; connectedAt?: string; label?: string;
  pages?: MetaPage[]; selectedPageIds?: string[]; lastError?: string;
  health?: { status: "connected" | "degraded" | "error" | "disconnected"; lastSyncAt?: string | null; lastError?: string | null; message?: string | null };
};

type MetaConfig = { appId:string; appSecret:string; redirectUri:string; graphVersion:string; scopes:string };
export function getMetaOAuthConfig(): {ok:true;config:MetaConfig}|{ok:false;message:string} {
  const appId=process.env.META_APP_ID?.trim()||""; const appSecret=process.env.META_APP_SECRET?.trim()||"";
  if(!appId||!appSecret) return {ok:false,message:"META_APP_ID / META_APP_SECRET not set — add them on Vercel (and .env.local)"};
  return {ok:true,config:{appId,appSecret,redirectUri:process.env.META_REDIRECT_URI?.trim()||DEFAULT_REDIRECT,graphVersion:process.env.META_GRAPH_VERSION?.trim()||DEFAULT_GRAPH_VERSION,scopes:process.env.META_OAUTH_SCOPES?.trim()||META_DEFAULT_OAUTH_SCOPES}};
}
export function metaCredentialsConfigured(){return getMetaOAuthConfig().ok}
export function buildMetaAuthorizeUrl(state:string){const cfg=getMetaOAuthConfig();if(!cfg.ok)return cfg;const u=new URL("https://www.facebook.com/"+cfg.config.graphVersion+"/dialog/oauth");u.searchParams.set("client_id",cfg.config.appId);u.searchParams.set("redirect_uri",cfg.config.redirectUri);u.searchParams.set("state",state);u.searchParams.set("scope",cfg.config.scopes);u.searchParams.set("response_type","code");return {ok:true as const,url:u.toString()}}

async function metaGet(path:string, token:string){const cfg=getMetaOAuthConfig();if(!cfg.ok)return {ok:false as const,message:cfg.message};const u=new URL(`https://graph.facebook.com/${cfg.config.graphVersion}/${path}`);u.searchParams.set("access_token",token);const r=await fetch(u);const j=await r.json().catch(()=>null);if(!r.ok)return {ok:false as const,message:(j as any)?.error?.message||`Meta Graph HTTP ${r.status}`};return {ok:true as const,data:j}}
export async function exchangeMetaAuthorizationCode(code:string){const cfg=getMetaOAuthConfig();if(!cfg.ok)return {ok:false as const,message:cfg.message};const u=new URL(`https://graph.facebook.com/${cfg.config.graphVersion}/oauth/access_token`);u.searchParams.set("client_id",cfg.config.appId);u.searchParams.set("client_secret",cfg.config.appSecret);u.searchParams.set("redirect_uri",cfg.config.redirectUri);u.searchParams.set("code",code);const r=await fetch(u);const j=await r.json().catch(()=>null) as any;if(!r.ok||!j?.access_token)return {ok:false as const,message:j?.error?.message||`Meta token HTTP ${r.status}`};return {ok:true as const,accessToken:j.access_token as string,expiresAt:typeof j.expires_in==="number"?new Date(Date.now()+Math.max(0,j.expires_in-60)*1000).toISOString():undefined}}
const enc=(v?:string)=>v?encryptSecret(v):v; const dec=(v?:string)=>v?(decryptSecret(v)||v):v;
export async function getOrgMetaConnectorTokens(org:string):Promise<OrgMetaConnectorTokens|null>{const b=await getOrgConnectorSettings(org,META_CONNECTOR_ID);if(!b)return null;return {accessToken:dec(typeof b.accessToken==="string"?b.accessToken:undefined),expiresAt:typeof b.expiresAt==="string"?b.expiresAt:undefined,scope:typeof b.scope==="string"?b.scope:undefined,connectedAt:typeof b.connectedAt==="string"?b.connectedAt:undefined,label:typeof b.label==="string"?b.label:undefined,pages:Array.isArray(b.pages)?b.pages as MetaPage[]:undefined,selectedPageIds:Array.isArray(b.selectedPageIds)?b.selectedPageIds.filter((x):x is string=>typeof x==="string"):undefined,lastError:typeof b.lastError==="string"?b.lastError:undefined,health:b.health&&typeof b.health==="object"?b.health as OrgMetaConnectorTokens["health"]:undefined}}
export async function saveOrgMetaConnectorTokens(org:string,t:OrgMetaConnectorTokens){await saveOrgConnectorSettings(org,META_CONNECTOR_ID,{...t,accessToken:enc(t.accessToken),pages:(t.pages||[]).map(p=>({...p,accessToken:enc(p.accessToken)}))})}
export async function clearOrgMetaConnectorTokens(org:string){await clearOrgConnectorSettings(org,META_CONNECTOR_ID)}

export async function probeOrgMetaConnection(org:string){const t=await getOrgMetaConnectorTokens(org);if(!t?.accessToken)return {ok:false,connected:false,message:"Meta is not connected for this organisation"};
  const me=await metaGet("me?fields=id,name",t.accessToken);if(!me.ok){await saveOrgMetaConnectorTokens(org,{...t,lastError:me.message,health:{status:"error",lastSyncAt:new Date().toISOString(),lastError:me.message,message:me.message}});return {ok:false,connected:true,message:me.message}}
  const pagesRes=await metaGet("me/accounts?fields=id,name,category,access_token,instagram_business_account{id,username,name,profile_picture_url}",t.accessToken);if(!pagesRes.ok){await saveOrgMetaConnectorTokens(org,{...t,lastError:pagesRes.message,health:{status:"degraded",lastSyncAt:new Date().toISOString(),lastError:pagesRes.message,message:pagesRes.message}});return {ok:false,connected:true,message:pagesRes.message}}
  const rows=Array.isArray((pagesRes.data as any)?.data)?(pagesRes.data as any).data:[];const pages:MetaPage[]=rows.map((p:any)=>({id:String(p.id),name:String(p.name||p.id),category:typeof p.category==="string"?p.category:undefined,accessToken:typeof p.access_token==="string"?p.access_token:undefined,instagram:p.instagram_business_account?{id:String(p.instagram_business_account.id),username:p.instagram_business_account.username,name:p.instagram_business_account.name,profilePictureUrl:p.instagram_business_account.profile_picture_url}:undefined}));
  const selected=(t.selectedPageIds||[]).filter(id=>pages.some(p=>p.id===id));const label=(me.data as any)?.name||t.label;const message=pages.length?`Meta connected · ${pages.length} Facebook Page(s) available`:"Meta connected · no managed Facebook Pages returned";await saveOrgMetaConnectorTokens(org,{...t,label,pages,selectedPageIds:selected,lastError:undefined,health:{status:pages.length?"connected":"degraded",lastSyncAt:new Date().toISOString(),lastError:null,message}});return {ok:pages.length>0,connected:true,message,pages,selectedPageIds:selected}}

export async function selectOrgMetaPages(org:string,pageIds:string[]){const t=await getOrgMetaConnectorTokens(org);if(!t?.accessToken)throw new Error("Meta is not connected for this organisation");const allowed=new Set((t.pages||[]).map(p=>p.id));const selected=[...new Set(pageIds)].filter(id=>allowed.has(id));await saveOrgMetaConnectorTokens(org,{...t,selectedPageIds:selected});return selected}
