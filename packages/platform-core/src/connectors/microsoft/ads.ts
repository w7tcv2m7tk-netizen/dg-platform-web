/**
 * Microsoft Advertising tenant foundation.
 *
 * Advertising OAuth is deliberately separate from Microsoft 365 mailbox OAuth:
 * the products use different scopes and customer/account context.
 *
 * Env:
 *   MICROSOFT_ADS_CLIENT_ID / MICROSOFT_ADS_CLIENT_SECRET
 *   MICROSOFT_ADS_REDIRECT_URI
 *   MICROSOFT_ADS_DEVELOPER_TOKEN
 */
import { inflateRawSync } from "node:zlib";
import { decryptSecret, encryptSecret } from "../../crypto/secret-field";
import { clearOrgConnectorSettings, getOrgConnectorSettings, saveOrgConnectorSettings } from "../framework/store";

export const MICROSOFT_ADS_CONNECTOR_ID = "microsoft-ads";
export const MICROSOFT_ADS_SCOPE = "https://ads.microsoft.com/msads.manage offline_access";
const DEFAULT_REDIRECT = "https://app.digitalgate.com.au/api/connectors/microsoft-ads/callback";

export type MicrosoftAdsAccount = { accountId: string; customerId: string; name?: string; currencyCode?: string };
export type OrgMicrosoftAdsConnectorTokens = {
  accessToken?: string; refreshToken?: string; expiresAt?: string; scope?: string; connectedAt?: string;
  label?: string; selectedAccountIds?: string[]; accounts?: MicrosoftAdsAccount[]; lastError?: string;
};

function redirectUri(){return process.env.MICROSOFT_ADS_REDIRECT_URI?.trim()||DEFAULT_REDIRECT}
function tenant(){return process.env.MICROSOFT_ADS_TENANT?.trim()||"common"}
function tokenUrl(){return `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`}
export function microsoftAdsCredentialsConfigured(){return Boolean(process.env.MICROSOFT_ADS_CLIENT_ID?.trim()&&process.env.MICROSOFT_ADS_CLIENT_SECRET?.trim())}
export function microsoftAdsDeveloperTokenConfigured(){return Boolean(process.env.MICROSOFT_ADS_DEVELOPER_TOKEN?.trim())}

export function buildMicrosoftAdsAuthorizeUrl(state:string){
  if(!microsoftAdsCredentialsConfigured()) return {ok:false as const,message:"Microsoft Advertising OAuth credentials are not configured"};
  const u=new URL(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/authorize`);
  u.searchParams.set("client_id",process.env.MICROSOFT_ADS_CLIENT_ID!.trim());u.searchParams.set("redirect_uri",redirectUri());
  u.searchParams.set("response_type","code");u.searchParams.set("scope",MICROSOFT_ADS_SCOPE);u.searchParams.set("state",state);u.searchParams.set("response_mode","query");
  return {ok:true as const,url:u.toString()};
}

async function token(body:URLSearchParams){
  const r=await fetch(tokenUrl(),{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"},body});
  const j=await r.json().catch(()=>null) as any;if(!r.ok||!j?.access_token)return {ok:false as const,message:String(j?.error_description||j?.error||`Microsoft token HTTP ${r.status}`)};
  return {ok:true as const,accessToken:String(j.access_token),refreshToken:typeof j.refresh_token==="string"?j.refresh_token:undefined,expiresAt:new Date(Date.now()+Math.max(0,Number(j.expires_in||3600)-60)*1000).toISOString(),scope:typeof j.scope==="string"?j.scope:undefined};
}
export async function exchangeMicrosoftAdsCode(code:string){return token(new URLSearchParams({grant_type:"authorization_code",code,redirect_uri:redirectUri(),client_id:process.env.MICROSOFT_ADS_CLIENT_ID?.trim()||"",client_secret:process.env.MICROSOFT_ADS_CLIENT_SECRET?.trim()||"",scope:MICROSOFT_ADS_SCOPE}))}
async function refresh(refreshToken:string){return token(new URLSearchParams({grant_type:"refresh_token",refresh_token:refreshToken,client_id:process.env.MICROSOFT_ADS_CLIENT_ID?.trim()||"",client_secret:process.env.MICROSOFT_ADS_CLIENT_SECRET?.trim()||"",scope:MICROSOFT_ADS_SCOPE}))}
function enc(v?:string){return v?encryptSecret(v):v} function dec(v?:string){return v?(decryptSecret(v)||v):v}

export async function getOrgMicrosoftAdsTokens(org:string):Promise<OrgMicrosoftAdsConnectorTokens|null>{
 const b=await getOrgConnectorSettings(org,MICROSOFT_ADS_CONNECTOR_ID);if(!b)return null;
 return {accessToken:dec(typeof b.accessToken==="string"?b.accessToken:undefined),refreshToken:dec(typeof b.refreshToken==="string"?b.refreshToken:undefined),expiresAt:typeof b.expiresAt==="string"?b.expiresAt:undefined,scope:typeof b.scope==="string"?b.scope:undefined,connectedAt:typeof b.connectedAt==="string"?b.connectedAt:undefined,label:typeof b.label==="string"?b.label:undefined,selectedAccountIds:Array.isArray(b.selectedAccountIds)?b.selectedAccountIds.filter((x):x is string=>typeof x==="string"):[],accounts:Array.isArray(b.accounts)?b.accounts as MicrosoftAdsAccount[]:[],lastError:typeof b.lastError==="string"?b.lastError:undefined};
}
export async function saveOrgMicrosoftAdsTokens(org:string,t:OrgMicrosoftAdsConnectorTokens){await saveOrgConnectorSettings(org,MICROSOFT_ADS_CONNECTOR_ID,{...t,accessToken:enc(t.accessToken),refreshToken:enc(t.refreshToken)})}
export async function clearOrgMicrosoftAdsTokens(org:string){await clearOrgConnectorSettings(org,MICROSOFT_ADS_CONNECTOR_ID)}
export async function ensureValidOrgMicrosoftAdsAccessToken(org:string){
 const t=await getOrgMicrosoftAdsTokens(org);if(!t?.accessToken&&!t?.refreshToken)return {ok:false as const,message:"Microsoft Advertising is not connected for this organisation"};
 const exp=t.expiresAt?Date.parse(t.expiresAt):0;if(t.accessToken&&Number.isFinite(exp)&&exp>Date.now()+60000)return {ok:true as const,accessToken:t.accessToken,tokens:t};
 if(!t.refreshToken)return {ok:false as const,message:"Microsoft Advertising access expired — reconnect"};
 const r=await refresh(t.refreshToken);if(!r.ok)return r;const next={...t,accessToken:r.accessToken,refreshToken:r.refreshToken||t.refreshToken,expiresAt:r.expiresAt,scope:r.scope||t.scope,lastError:undefined};await saveOrgMicrosoftAdsTokens(org,next);return {ok:true as const,accessToken:next.accessToken,tokens:next};
}

const CUSTOMER_MANAGEMENT_URL="https://clientcenter.api.bingads.microsoft.com/CustomerManagement/v13/CustomerManagementService.svc";
async function customerManagement(accessToken:string,action:string,body:unknown){
 if(!microsoftAdsDeveloperTokenConfigured())return {ok:false as const,message:"Microsoft Advertising developer token is not configured"};
 const r=await fetch(CUSTOMER_MANAGEMENT_URL,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"DeveloperToken":process.env.MICROSOFT_ADS_DEVELOPER_TOKEN!.trim(),"Content-Type":"application/json",SOAPAction:action},body:JSON.stringify(body)});
 const j=await r.json().catch(()=>null) as any;if(!r.ok)return {ok:false as const,message:String(j?.OperationErrors?.[0]?.Message||j?.message||`Microsoft Advertising HTTP ${r.status}`)};return {ok:true as const,data:j};
}
export async function probeOrgMicrosoftAdsAccounts(org:string){
 const e=await ensureValidOrgMicrosoftAdsAccessToken(org);if(!e.ok)return e;
 const r=await customerManagement(e.accessToken,"GetUser",{});if(!r.ok)return r;
 const user=(r.data as any)?.User;const customerId=String(user?.CustomerId||"");if(!customerId)return {ok:false as const,message:"Microsoft Advertising did not return a customer for this user"};
 const a=await customerManagement(e.accessToken,"SearchAccounts",{Predicates:[{Field:"ParentCustomerId",Operator:"Equals",Value:customerId}],Ordering:null,PageInfo:{Index:0,Size:100}});
 if(!a.ok)return a;const rows=Array.isArray((a.data as any)?.Accounts)?(a.data as any).Accounts:[];
 const accounts:MicrosoftAdsAccount[]=rows.flatMap((x:any)=>x?.Id?[{accountId:String(x.Id),customerId:String(x.ParentCustomerId||customerId),name:typeof x.Name==="string"?x.Name:undefined,currencyCode:typeof x.CurrencyCode==="string"?x.CurrencyCode:undefined}]:[]);
 const allowed=new Set(accounts.map(x=>x.accountId)),selectedAccountIds=(e.tokens.selectedAccountIds||[]).filter(id=>allowed.has(id));
 await saveOrgMicrosoftAdsTokens(org,{...e.tokens,accounts,selectedAccountIds});
 return {ok:true as const,data:accounts,selectedAccountIds};
}
export async function selectOrgMicrosoftAdsAccounts(org:string,accountIds:string[]){
 const p=await probeOrgMicrosoftAdsAccounts(org);if(!p.ok)return p;const allowed=new Set(p.data.map(x=>x.accountId)),selectedAccountIds=[...new Set(accountIds)].filter(id=>allowed.has(id));
 const t=await getOrgMicrosoftAdsTokens(org);if(!t)return {ok:false as const,message:"Microsoft Advertising is not connected for this organisation"};await saveOrgMicrosoftAdsTokens(org,{...t,accounts:p.data,selectedAccountIds});return {ok:true as const,selectedAccountIds};
}

export type MicrosoftAdsEvidence={account:MicrosoftAdsAccount;period:"LAST_30_DAYS";campaigns:Array<{id:string;name:string;status?:string;spend:number;impressions:number;clicks:number;conversions:number;conversionValue:number}>;performance:{spend:number;impressions:number;clicks:number;conversions:number;conversionValue:number}};

function microsoftAdsReportText(bytes:Uint8Array){
 const b=Buffer.from(bytes);
 if(b.length<4||b.readUInt32LE(0)!==0x04034b50)return b.toString("utf8");
 let offset=0;
 while(offset+30<=b.length&&b.readUInt32LE(offset)===0x04034b50){
  const flags=b.readUInt16LE(offset+6),method=b.readUInt16LE(offset+8),compressedSize=b.readUInt32LE(offset+18),fileNameLength=b.readUInt16LE(offset+26),extraLength=b.readUInt16LE(offset+28);
  if(flags&0x08)throw new Error("Microsoft Advertising report ZIP uses unsupported data descriptors");
  const dataStart=offset+30+fileNameLength+extraLength,dataEnd=dataStart+compressedSize;if(dataEnd>b.length)throw new Error("Microsoft Advertising report ZIP is truncated");
  const name=b.subarray(offset+30,offset+30+fileNameLength).toString("utf8"),payload=b.subarray(dataStart,dataEnd);
  if(!name.endsWith("/")){if(method===0)return payload.toString("utf8");if(method===8)return inflateRawSync(payload).toString("utf8");throw new Error(`Microsoft Advertising report ZIP compression method ${method} is unsupported`)}
  offset=dataEnd;
 }
 throw new Error("Microsoft Advertising report ZIP did not contain a report file");
}
const REPORTING_URL="https://reporting.api.bingads.microsoft.com/Api/Advertiser/Reporting/v13/ReportingService.svc";
async function reporting(accessToken:string,action:string,body:unknown){
 if(!microsoftAdsDeveloperTokenConfigured())return {ok:false as const,message:"Microsoft Advertising developer token is not configured"};
 const r=await fetch(REPORTING_URL,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"DeveloperToken":process.env.MICROSOFT_ADS_DEVELOPER_TOKEN!.trim(),"Content-Type":"application/json",SOAPAction:action},body:JSON.stringify(body)});
 const j=await r.json().catch(()=>null) as any;if(!r.ok)return {ok:false as const,message:String(j?.OperationErrors?.[0]?.Message||j?.message||`Microsoft Advertising reporting HTTP ${r.status}`)};return {ok:true as const,data:j};
}
export async function fetchOrgMicrosoftAdsEvidence(org:string):Promise<{ok:true;data:MicrosoftAdsEvidence[]}|{ok:false;message:string}>{
 const e=await ensureValidOrgMicrosoftAdsAccessToken(org);if(!e.ok)return e;const t=e.tokens,selected=new Set(t.selectedAccountIds||[]);if(!selected.size)return {ok:false,message:"No Microsoft Advertising account is selected for this organisation"};
 const accounts=(t.accounts||[]).filter(x=>selected.has(x.accountId));if(!accounts.length)return {ok:false,message:"Selected Microsoft Advertising accounts are no longer available"};
 const out:MicrosoftAdsEvidence[]=[];
 for(const account of accounts){
  const req={ReportRequest:{Format:"Csv",ReportName:"DigitalGate last 30 days campaign evidence",ReturnOnlyCompleteData:false,Aggregation:"Daily",Columns:["CampaignId","CampaignName","CampaignStatus","Impressions","Clicks","Spend","Conversions","Revenue"],Scope:{AccountIds:[Number(account.accountId)]},Time:{PredefinedTime:"Last30Days"}}};
  const submit=await reporting(e.accessToken,"SubmitGenerateReport",req);if(!submit.ok)return submit;
  const reportRequestId=String((submit.data as any)?.ReportRequestId||"");if(!reportRequestId)return {ok:false,message:"Microsoft Advertising reporting did not return a report request id"};
  let downloadUrl="";
  for(let attempt=0;attempt<6;attempt++){
   if(attempt>0)await new Promise(resolve=>setTimeout(resolve,1000));
   const poll=await reporting(e.accessToken,"PollGenerateReport",{ReportRequestId:reportRequestId});if(!poll.ok)return poll;
   const status=String((poll.data as any)?.ReportRequestStatus?.Status||"");
   downloadUrl=String((poll.data as any)?.ReportRequestStatus?.ReportDownloadUrl||"");
   if(status==="Success"&&downloadUrl)break;
   if(status==="Error")return {ok:false,message:"Microsoft Advertising report generation failed"};
  }
  if(!downloadUrl)return {ok:false,message:"Microsoft Advertising report is still processing — retry evidence sync shortly"};
  const file=await fetch(downloadUrl);if(!file.ok)return {ok:false,message:`Microsoft Advertising report download HTTP ${file.status}`};
  let csv:string;try{csv=microsoftAdsReportText(new Uint8Array(await file.arrayBuffer()))}catch{return {ok:false,message:"Microsoft Advertising report archive could not be read"}}
  const lines=csv.split(/\\r?\\n/).filter(line=>line.trim()&&!line.startsWith('"Report')&&!line.startsWith('"Time')&&!line.startsWith('"Last Completed'));
  const headerIndex=lines.findIndex(line=>line.includes("CampaignId")&&line.includes("Impressions"));if(headerIndex<0)return {ok:false,message:"Microsoft Advertising report did not contain the expected campaign columns"};
  const parse=(line:string)=>{const out:string[]=[];let v="",q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){v+='"';i++}else q=!q}else if(ch===","&&!q){out.push(v);v=""}else v+=ch}out.push(v);return out};
  const headers=parse(lines[headerIndex]),idx=(name:string)=>headers.indexOf(name),byCampaign=new Map<string,MicrosoftAdsEvidence["campaigns"][number]>();
  for(const line of lines.slice(headerIndex+1)){const row=parse(line),id=row[idx("CampaignId")];if(!id)continue;const prior=byCampaign.get(id)||{id,name:row[idx("CampaignName")]||id,status:row[idx("CampaignStatus")]||undefined,spend:0,impressions:0,clicks:0,conversions:0,conversionValue:0};prior.spend+=Number(row[idx("Spend")]||0);prior.impressions+=Number(row[idx("Impressions")]||0);prior.clicks+=Number(row[idx("Clicks")]||0);prior.conversions+=Number(row[idx("Conversions")]||0);prior.conversionValue+=Number(row[idx("Revenue")]||0);byCampaign.set(id,prior)}
  const campaigns=[...byCampaign.values()],performance=campaigns.reduce((a,x)=>({spend:a.spend+x.spend,impressions:a.impressions+x.impressions,clicks:a.clicks+x.clicks,conversions:a.conversions+x.conversions,conversionValue:a.conversionValue+x.conversionValue}),{spend:0,impressions:0,clicks:0,conversions:0,conversionValue:0});
  out.push({account,period:"LAST_30_DAYS",campaigns,performance});
 }
 return {ok:true,data:out};
}
