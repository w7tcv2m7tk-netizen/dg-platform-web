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

export function buildTikTokAdsAuthorizeUrl(state:string){
 if(!tiktokAdsCredentialsConfigured())return {ok:false as const,message:"TikTok Ads credentials are not configured"};
 const u=new URL("https://ads.tiktok.com/marketing_api/auth");
 u.searchParams.set("app_id",process.env.TIKTOK_ADS_APP_ID!.trim());u.searchParams.set("state",state);u.searchParams.set("redirect_uri",tiktokAdsRedirectUri());
 const scope=process.env.TIKTOK_ADS_OAUTH_SCOPES?.trim();if(scope)u.searchParams.set("scope",scope);
 return {ok:true as const,url:u.toString()};
}
export async function exchangeTikTokAdsCode(authCode:string){
 if(!tiktokAdsCredentialsConfigured())return {ok:false as const,message:"TikTok Ads credentials are not configured"};
 const r=await fetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({app_id:process.env.TIKTOK_ADS_APP_ID!.trim(),secret:process.env.TIKTOK_ADS_APP_SECRET!.trim(),auth_code:authCode})});
 const j=await r.json().catch(()=>null) as any;if(!r.ok||Number(j?.code)!==0||!j?.data?.access_token)return {ok:false as const,message:String(j?.message||`TikTok Ads token HTTP ${r.status}`)};
 return {ok:true as const,accessToken:String(j.data.access_token),scope:Array.isArray(j.data.scope)?j.data.scope.join(","):typeof j.data.scope==="string"?j.data.scope:undefined};
}

async function tiktokGet(accessToken:string,path:string,params:Record<string,string>={}){
 const u=new URL(`https://business-api.tiktok.com/open_api/v1.3${path}`);for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
 const r=await fetch(u,{headers:{"Access-Token":accessToken,Accept:"application/json"}}),j=await r.json().catch(()=>null) as any;
 if(!r.ok||Number(j?.code)!==0)return {ok:false as const,message:String(j?.message||`TikTok Ads HTTP ${r.status}`)};
 return {ok:true as const,data:j?.data};
}
export async function probeOrgTikTokAdsAdvertisers(org:string){
 const t=await getOrgTikTokAdsTokens(org);if(!t?.accessToken)return {ok:false as const,message:"TikTok Ads is not connected for this organisation"};
 const r=await tiktokGet(t.accessToken,"/oauth2/advertiser/get/",{app_id:process.env.TIKTOK_ADS_APP_ID?.trim()||"",secret:process.env.TIKTOK_ADS_APP_SECRET?.trim()||""});if(!r.ok)return r;
 const rows=Array.isArray((r.data as any)?.list)?(r.data as any).list:[];const accounts:TikTokAdsAccount[]=rows.flatMap((x:any)=>x?.advertiser_id?[{advertiserId:String(x.advertiser_id),name:typeof x.advertiser_name==="string"?x.advertiser_name:undefined}]:[]);
 const allowed=new Set(accounts.map(x=>x.advertiserId)),selectedAdvertiserIds=(t.selectedAdvertiserIds||[]).filter(id=>allowed.has(id));await saveOrgTikTokAdsTokens(org,{...t,accounts,selectedAdvertiserIds});return {ok:true as const,data:accounts,selectedAdvertiserIds};
}
export async function selectOrgTikTokAdsAdvertisers(org:string,advertiserIds:string[]){const p=await probeOrgTikTokAdsAdvertisers(org);if(!p.ok)return p;const allowed=new Set(p.data.map(x=>x.advertiserId)),selectedAdvertiserIds=[...new Set(advertiserIds)].filter(id=>allowed.has(id));const t=await getOrgTikTokAdsTokens(org);if(!t)return {ok:false as const,message:"TikTok Ads is not connected"};await saveOrgTikTokAdsTokens(org,{...t,accounts:p.data,selectedAdvertiserIds});return {ok:true as const,selectedAdvertiserIds}}

export type TikTokAdsEvidence={advertiser:TikTokAdsAccount;period:"LAST_30_DAYS";campaigns:Array<{id:string;name:string;spend:number;impressions:number;clicks:number;conversions:number;conversionValue:number}>;performance:{spend:number;impressions:number;clicks:number;conversions:number;conversionValue:number}};
export async function fetchOrgTikTokAdsEvidence(org:string):Promise<{ok:true;data:TikTokAdsEvidence[]}|{ok:false;message:string}>{
 const t=await getOrgTikTokAdsTokens(org);if(!t?.accessToken)return {ok:false,message:"TikTok Ads is not connected for this organisation"};
 const selected=new Set(t.selectedAdvertiserIds||[]);if(!selected.size)return {ok:false,message:"No TikTok advertiser is selected for this organisation"};
 const advertisers=(t.accounts||[]).filter(x=>selected.has(x.advertiserId));if(!advertisers.length)return {ok:false,message:"Selected TikTok advertisers are no longer available"};
 const end=new Date(),start=new Date(end.getTime()-29*86400000),date=(d:Date)=>d.toISOString().slice(0,10),out:TikTokAdsEvidence[]=[];
 for(const advertiser of advertisers){
  const r=await tiktokGet(t.accessToken,"/report/integrated/get/",{advertiser_id:advertiser.advertiserId,report_type:"BASIC",data_level:"AUCTION_CAMPAIGN",dimensions:JSON.stringify(["campaign_id"]),metrics:JSON.stringify(["campaign_name","spend","impressions","clicks","conversion","total_purchase_value"]),start_date:date(start),end_date:date(end),page_size:"1000"});
  if(!r.ok)return r;const rows=Array.isArray((r.data as any)?.list)?(r.data as any).list:[];
  const campaigns=rows.flatMap((x:any)=>{const d=x?.dimensions||{},m=x?.metrics||{},id=d.campaign_id?String(d.campaign_id):"";return id?[{id,name:String(m.campaign_name||id),spend:Number(m.spend||0),impressions:Number(m.impressions||0),clicks:Number(m.clicks||0),conversions:Number(m.conversion||0),conversionValue:Number(m.total_purchase_value||0)}]:[]});
  const performance=campaigns.reduce((a,x)=>({spend:a.spend+x.spend,impressions:a.impressions+x.impressions,clicks:a.clicks+x.clicks,conversions:a.conversions+x.conversions,conversionValue:a.conversionValue+x.conversionValue}),{spend:0,impressions:0,clicks:0,conversions:0,conversionValue:0});
  out.push({advertiser,period:"LAST_30_DAYS",campaigns,performance});
 }
 return {ok:true,data:out};
}
